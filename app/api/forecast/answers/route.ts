import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateForecastAnswers } from "@/lib/fifa/bracket-eligibility";
import {
  buildForecastEligibility,
  FORECAST_SEASON_YEAR,
  loadKnockoutMatchRows,
} from "@/lib/fifa/forecast-data";
import { computeBracketState } from "@/lib/fifa/bracket-eligibility";
import { parseForecastAnswersPayload } from "@/lib/types/forecast-contracts";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data, error } = await supabase
    .from("tournament_forecast_answers")
    .select("semi_finalist_teams, finalist_teams, winner_team, updated_at")
    .eq("user_id", user.id)
    .eq("season_year", FORECAST_SEASON_YEAR)
    .maybeSingle();

  if (error?.message?.includes("tournament_forecast_answers")) {
    return NextResponse.json({
      season_year: FORECAST_SEASON_YEAR,
      semi_finalist_teams: [],
      finalist_teams: [],
      winner_team: null,
      updated_at: null,
    });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    season_year: FORECAST_SEASON_YEAR,
    semi_finalist_teams: (data?.semi_finalist_teams as string[]) ?? [],
    finalist_teams: (data?.finalist_teams as string[]) ?? [],
    winner_team: (data?.winner_team as string | null) ?? null,
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = parseForecastAnswersPayload(await request.json().catch(() => null));
  if (!body) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const lockCtx = await buildForecastEligibility(supabase);
  if (lockCtx.locked) {
    return NextResponse.json({ error: "FORECAST_LOCKED" }, { status: 403 });
  }

  const knockoutRows = await loadKnockoutMatchRows(supabase);
  const state = computeBracketState(knockoutRows);
  const validationError = validateForecastAnswers(body, state);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    season_year: FORECAST_SEASON_YEAR,
    semi_finalist_teams: body.semi_finalist_teams,
    finalist_teams: body.finalist_teams,
    winner_team: body.winner_team,
    updated_at: now,
  };

  const { error } = await supabase.from("tournament_forecast_answers").upsert(row, {
    onConflict: "user_id,season_year",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...row, updated_at: now });
}
