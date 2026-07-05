import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FORECAST_SEASON_YEAR } from "@/lib/fifa/forecast-data";

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

  const { data: rows, error } = await dataClient
    .from("tournament_forecast_answers")
    .select("user_id, semi_finalist_teams, finalist_teams, winner_team, updated_at")
    .eq("season_year", FORECAST_SEASON_YEAR);

  if (error?.message?.includes("tournament_forecast_answers")) {
    return NextResponse.json({ season_year: FORECAST_SEASON_YEAR, entries: [] });
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

  const entries = (rows ?? [])
    .map((r) => ({
      user_id: r.user_id as string,
      display_name: nameByUser.get(r.user_id as string) ?? "Player",
      semi_finalist_teams: (r.semi_finalist_teams as string[]) ?? [],
      finalist_teams: (r.finalist_teams as string[]) ?? [],
      winner_team: (r.winner_team as string | null) ?? null,
      updated_at: (r.updated_at as string | null) ?? null,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({
    season_year: FORECAST_SEASON_YEAR,
    entries,
  });
}
