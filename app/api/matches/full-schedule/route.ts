import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        "Match picks lock 30 minutes before match start (IST).",
        "Tournament answers lock at configured IST time.",
        "Bonus prompts can be match-specific or tournament-wide.",
      ],
    },
    matches: matches ?? [],
  });
}

