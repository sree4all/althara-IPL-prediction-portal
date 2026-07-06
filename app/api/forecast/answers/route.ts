import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateForecastAnswers } from "@/lib/fifa/bracket-eligibility";
import {
  buildForecastEligibility,
  FORECAST_SEASON_YEAR,
  loadKnockoutMatchRows,
} from "@/lib/fifa/forecast-data";
import { computeBracketState } from "@/lib/fifa/bracket-eligibility";
import {
  computeForecastScoringBreakdown,
  loadForecastActuals,
} from "@/lib/scoring/forecast-scoring";
import { parseForecastAnswersPayload } from "@/lib/types/forecast-contracts";

const EMPTY_ANSWERS = {
  semi_finalist_teams: [] as string[],
  finalist_teams: [] as string[],
  winner_team: null as string | null,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [answersRes, actuals] = await Promise.all([
    supabase
      .from("tournament_forecast_answers")
      .select("semi_finalist_teams, finalist_teams, winner_team, updated_at")
      .eq("user_id", user.id)
      .eq("season_year", FORECAST_SEASON_YEAR)
      .maybeSingle(),
    loadForecastActuals(supabase, FORECAST_SEASON_YEAR),
  ]);

  if (answersRes.error?.message?.includes("tournament_forecast_answers")) {
    const scoring = computeForecastScoringBreakdown(EMPTY_ANSWERS, actuals);
    return NextResponse.json({
      season_year: FORECAST_SEASON_YEAR,
      ...EMPTY_ANSWERS,
      updated_at: null,
      scoring,
    });
  }
  if (answersRes.error) return NextResponse.json({ error: answersRes.error.message }, { status: 500 });

  const answers = {
    semi_finalist_teams: (answersRes.data?.semi_finalist_teams as string[]) ?? [],
    finalist_teams: (answersRes.data?.finalist_teams as string[]) ?? [],
    winner_team: (answersRes.data?.winner_team as string | null) ?? null,
  };
  const scoring = computeForecastScoringBreakdown(answers, actuals);

  return NextResponse.json({
    season_year: FORECAST_SEASON_YEAR,
    ...answers,
    updated_at: answersRes.data?.updated_at ?? null,
    scoring,
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

  const actuals = await loadForecastActuals(supabase, FORECAST_SEASON_YEAR);
  const scoring = computeForecastScoringBreakdown(body, actuals);

  return NextResponse.json({ ok: true, ...row, updated_at: now, scoring });
}
