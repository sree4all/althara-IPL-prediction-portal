import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/auth/require-admin";
import { FORECAST_SEASON_YEAR } from "@/lib/fifa/forecast-data";

export async function PATCH(request: Request) {
  const { supabase, denied } = await requireAdminOrResponse();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { forecast_stats_visible?: boolean }
    | null;
  if (body?.forecast_stats_visible === undefined) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tournament_config")
    .update({
      forecast_stats_visible: Boolean(body.forecast_stats_visible),
      updated_at: new Date().toISOString(),
    })
    .eq("season_year", FORECAST_SEASON_YEAR);

  if (error?.message?.includes("forecast_stats_visible")) {
    return NextResponse.json(
      { error: "Run migration 0036_fifa_knockout_enhancements.sql first." },
      { status: 500 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    forecast_stats_visible: Boolean(body.forecast_stats_visible),
  });
}
