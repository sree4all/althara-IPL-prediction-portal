import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FORECAST_SEASON_YEAR } from "@/lib/fifa/forecast-data";
import {
  computeForecastScoringBreakdown,
  loadForecastActuals,
} from "@/lib/scoring/forecast-scoring";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const { data: cfg } = await supabase
    .from("tournament_config")
    .select("forecast_stats_visible")
    .eq("season_year", FORECAST_SEASON_YEAR)
    .maybeSingle();

  const visible = Boolean(
    (cfg as { forecast_stats_visible?: boolean } | null)?.forecast_stats_visible,
  );
  if (!isAdmin && !visible) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let dataClient = supabase;
  try {
    dataClient = createServiceClient();
  } catch {
    /* use user client */
  }

  const [rowsRes, actuals] = await Promise.all([
    dataClient
      .from("tournament_forecast_answers")
      .select("user_id, semi_finalist_teams, finalist_teams, winner_team, updated_at")
      .eq("season_year", FORECAST_SEASON_YEAR),
    loadForecastActuals(supabase, FORECAST_SEASON_YEAR),
  ]);

  const { data: rows, error } = rowsRes;
  if (error?.message?.includes("tournament_forecast_answers")) {
    const scoring = computeForecastScoringBreakdown(
      { semi_finalist_teams: [], finalist_teams: [], winner_team: null },
      actuals,
    );
    return NextResponse.json({
      season_year: FORECAST_SEASON_YEAR,
      entries: [],
      actuals: scoring.actuals,
      points_config: scoring.points_config,
    });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))];
  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    nameByUser = new Map((profiles ?? []).map((r) => [r.id as string, r.display_name as string]));
  }

  const sampleScoring = computeForecastScoringBreakdown(
    { semi_finalist_teams: [], finalist_teams: [], winner_team: null },
    actuals,
  );

  const entries = (rows ?? [])
    .map((r) => {
      const answers = {
        semi_finalist_teams: (r.semi_finalist_teams as string[]) ?? [],
        finalist_teams: (r.finalist_teams as string[]) ?? [],
        winner_team: (r.winner_team as string | null) ?? null,
      };
      const breakdown = computeForecastScoringBreakdown(answers, actuals);
      return {
        user_id: r.user_id as string,
        display_name: nameByUser.get(r.user_id as string) ?? "Player",
        ...answers,
        forecast_points: breakdown.scoring.total_earned,
        updated_at: (r.updated_at as string | null) ?? null,
      };
    })
    .sort((a, b) => {
      if (b.forecast_points !== a.forecast_points) return b.forecast_points - a.forecast_points;
      return a.display_name.localeCompare(b.display_name);
    });

  return NextResponse.json({
    season_year: FORECAST_SEASON_YEAR,
    entries,
    actuals: sampleScoring.actuals,
    points_config: sampleScoring.points_config,
  });
}
