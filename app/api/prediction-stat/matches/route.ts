import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dedupeMatchesByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { formatMatchLabelWithIst } from "@/lib/matches/match-display-label";
import { compareMatchOrder } from "@/lib/matches/match-order";

const SEASON_YEAR = 2026;

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, external_key, home_team, away_team, match_time_utc, status")
    .order("match_time_utc", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = dedupeMatchesByFixtureNumber([...(matches ?? [])]).sort((a, b) =>
    compareMatchOrder(
      a.external_key as string | null,
      a.match_time_utc as string,
      b.external_key as string | null,
      b.match_time_utc as string,
    ),
  );

  const list = sorted.map((m) => {
    const label = formatMatchLabelWithIst(
      m.home_team as string,
      m.away_team as string,
      m.match_time_utc as string,
    );
    return {
      id: m.id as string,
      label,
      external_key: m.external_key,
      match_time_utc: m.match_time_utc,
      status: m.status,
    };
  });

  return NextResponse.json({ season_year: SEASON_YEAR, matches: list });
}
