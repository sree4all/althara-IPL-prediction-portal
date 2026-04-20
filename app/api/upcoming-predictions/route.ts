import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMatchLocked } from "@/lib/utils/match-lock";
import { compareMatchOrder } from "@/lib/matches/match-order";

const SEASON_YEAR = 2026;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: matches } = await supabase
    .from("matches")
    .select("id, external_key, home_team, away_team, match_time_utc, status, winner")
    .order("match_time_utc", { ascending: true });

  const open = (matches ?? []).filter((m) => {
    const st = String(m.status ?? "").toLowerCase();
    if (st === "completed" || st === "abandoned" || st === "cancelled") return false;
    const t = new Date(m.match_time_utc as string);
    return !isMatchLocked(t);
  });

  const ids = open.map((m) => m.id as string);
  let preds: { match_id: string; predicted_winner: unknown; bonus_pick: unknown }[] | null = [];
  if (ids.length > 0) {
    const res = await supabase
      .from("predictions")
      .select("match_id, predicted_winner, bonus_pick")
      .eq("user_id", user.id)
      .in("match_id", ids);
    preds = res.data;
  }

  const predByMatch = new Map((preds ?? []).map((p) => [p.match_id as string, p]));

  const sorted = [...open].sort((a, b) =>
    compareMatchOrder(
      a.external_key as string | null,
      a.match_time_utc as string,
      b.external_key as string | null,
      b.match_time_utc as string,
    ),
  );

  const out = sorted.map((m) => {
    const id = m.id as string;
    const pr = predByMatch.get(id);
    const ext = (m.external_key as string | null)?.trim();
    const label = ext
      ? `${ext} — ${m.home_team} vs ${m.away_team}`
      : `${m.home_team} vs ${m.away_team}`;
    const mt = new Date(m.match_time_utc as string);
    const lock = new Date(mt.getTime() - 30 * 60 * 1000);
    return {
      match_id: id,
      label,
      external_key: m.external_key,
      match_time_utc: m.match_time_utc,
      lock_time_utc: lock.toISOString(),
      has_prediction: Boolean(pr),
      predicted_winner: (pr?.predicted_winner as string | undefined) ?? null,
      bonus_summary: (pr?.bonus_pick as string | null)?.trim() || null,
    };
  });

  return NextResponse.json({ season_year: SEASON_YEAR, matches: out });
}
