import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMatchLocked } from "@/lib/utils/match-lock";
import { compareMatchOrder } from "@/lib/matches/match-order";

const SEASON_YEAR = 2026;

type BonusLine = { prompt_text: string; answer_text: string };
type BonusLineWithOrder = BonusLine & { display_order: number };

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

  let bonusRows: { match_id: string; prompt_id: string; answer_text: string }[] = [];
  if (ids.length > 0) {
    const ba = await supabase
      .from("prediction_bonus_answers")
      .select("match_id, prompt_id, answer_text")
      .eq("user_id", user.id)
      .in("match_id", ids);
    bonusRows = ba.data ?? [];
  }

  const bonusPromptIds = [...new Set(bonusRows.map((b) => b.prompt_id))];
  let promptMeta = new Map<string, { prompt_text: string; display_order: number }>();
  if (bonusPromptIds.length > 0) {
    const { data: prompts } = await supabase
      .from("bonus_prompts")
      .select("id, prompt_text, display_order")
      .in("id", bonusPromptIds)
      .eq("season_year", SEASON_YEAR);
    promptMeta = new Map(
      (prompts ?? []).map((pr) => [
        pr.id as string,
        {
          prompt_text: pr.prompt_text as string,
          display_order: Number(pr.display_order ?? 0),
        },
      ]),
    );
  }

  const bonusByMatch = new Map<string, BonusLineWithOrder[]>();
  for (const row of bonusRows) {
    const mid = row.match_id as string;
    const pid = row.prompt_id as string;
    const meta = promptMeta.get(pid);
    if (!bonusByMatch.has(mid)) bonusByMatch.set(mid, []);
    bonusByMatch.get(mid)!.push({
      prompt_text: meta?.prompt_text ?? "Bonus",
      answer_text: (row.answer_text as string) ?? "",
      display_order: meta?.display_order ?? 0,
    });
  }
  for (const [, lines] of bonusByMatch) {
    lines.sort((a, b) =>
      a.display_order !== b.display_order
        ? a.display_order - b.display_order
        : a.prompt_text.localeCompare(b.prompt_text),
    );
  }

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
    const structured = (bonusByMatch.get(id) ?? []).map((row) => ({
      prompt_text: row.prompt_text,
      answer_text: row.answer_text,
    }));
    const legacyPick = (pr?.bonus_pick as string | null)?.trim() || null;
    const summaryParts: string[] = structured.map((b) => `${b.prompt_text}: ${b.answer_text}`);
    if (legacyPick) summaryParts.push(`Legacy bonus: ${legacyPick}`);
    const bonus_summary = summaryParts.length ? summaryParts.join(" · ") : null;
    return {
      match_id: id,
      label,
      external_key: m.external_key,
      match_time_utc: m.match_time_utc,
      lock_time_utc: lock.toISOString(),
      has_prediction: Boolean(pr),
      predicted_winner: (pr?.predicted_winner as string | undefined) ?? null,
      bonus_answers: structured,
      bonus_summary,
    };
  });

  return NextResponse.json({ season_year: SEASON_YEAR, matches: out });
}
