import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dedupeMatchesByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";

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

  return NextResponse.json({
    season_year: 2026,
    onboarding: {
      title: "How predictions work",
      items: [
        "Match picks lock at match start time (IST).",
        "Watch for bonus prompts—they may appear on match pages when organizers post them.",
      ],
    },
    matches: dedupeMatchesByFixtureNumber(matches ?? []),
  });
}

