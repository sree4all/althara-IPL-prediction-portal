import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEligibilityResponse,
  computeBracketState,
  type MatchResultRow,
} from "@/lib/fifa/bracket-eligibility";
import { earliestQuarterFinalKickoff, isForecastLocked } from "@/lib/fifa/forecast-lock";

const SEASON_YEAR = 2026;

export async function loadKnockoutMatchRows(supabase: SupabaseClient): Promise<MatchResultRow[]> {
  const { data } = await supabase
    .from("matches")
    .select("match_number, home_team, away_team, winner, status, tournament_stage")
    .eq("season_year", SEASON_YEAR)
    .gte("match_number", 73)
    .lte("match_number", 96);
  return (data ?? []) as MatchResultRow[];
}

export async function loadForecastLockContext(supabase: SupabaseClient) {
  const { data: qfRows } = await supabase
    .from("matches")
    .select("match_time_utc, tournament_stage, match_number")
    .eq("season_year", SEASON_YEAR)
    .or("tournament_stage.eq.qf,match_number.in.(97,98,99,100)");

  const lockAtUtc = earliestQuarterFinalKickoff(qfRows ?? []);
  return {
    season_year: SEASON_YEAR,
    locked: isForecastLocked(lockAtUtc),
    lock_at_utc: lockAtUtc,
  };
}

export async function buildForecastEligibility(supabase: SupabaseClient) {
  const [knockoutRows, lockCtx] = await Promise.all([
    loadKnockoutMatchRows(supabase),
    loadForecastLockContext(supabase),
  ]);
  const state = computeBracketState(knockoutRows);
  return {
    ...lockCtx,
    ...buildEligibilityResponse(state),
    _state: state,
  };
}

export { SEASON_YEAR as FORECAST_SEASON_YEAR };
