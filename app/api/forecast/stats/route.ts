import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FORECAST_SEASON_YEAR } from "@/lib/fifa/forecast-data";

const MIN_FOR_PCT = 3;

function aggregateCounts(arrays: string[][]) {
  const counts = new Map<string, number>();
  for (const arr of arrays) {
    for (const t of arr) {
      if (!t?.trim()) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return counts;
}

function toStats(counts: Map<string, number>, total: number, showPct: boolean) {
  return [...counts.entries()]
    .map(([team, count]) => ({
      team,
      count,
      pct: showPct ? Math.round((count / total) * 1000) / 10 : undefined,
    }))
    .sort((a, b) => b.count - a.count);
}

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
    .select("semi_finalist_teams, finalist_teams, winner_team")
    .eq("season_year", FORECAST_SEASON_YEAR);

  if (error?.message?.includes("tournament_forecast_answers")) {
    return NextResponse.json({
      season_year: FORECAST_SEASON_YEAR,
      total_forecasts: 0,
      show_percentages: false,
      semi_finalists: [],
      finalists: [],
      winners: [],
    });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = rows?.length ?? 0;
  const showPct = total >= MIN_FOR_PCT;

  const semiRows = (rows ?? []).map((r) => (r.semi_finalist_teams as string[]) ?? []);
  const finalRows = (rows ?? []).map((r) => (r.finalist_teams as string[]) ?? []);
  const winnerRows = (rows ?? [])
    .map((r) => (r.winner_team as string | null) ?? "")
    .filter(Boolean)
    .map((w) => [w]);

  return NextResponse.json({
    season_year: FORECAST_SEASON_YEAR,
    total_forecasts: total,
    show_percentages: showPct,
    semi_finalists: toStats(aggregateCounts(semiRows), total, showPct),
    finalists: toStats(aggregateCounts(finalRows), total, showPct),
    winners: toStats(aggregateCounts(winnerRows), total, showPct),
  });
}
