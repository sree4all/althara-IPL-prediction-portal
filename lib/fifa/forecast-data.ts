import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEligibilityResponse,
  computeBracketState,
  type MatchResultRow,
} from "@/lib/fifa/bracket-eligibility";
import { FORECAST_LOCK_UTC, isForecastLocked } from "@/lib/fifa/forecast-lock";
import { matchSeasonYearOrNullFilter } from "@/lib/fifa/match-season-filter";

const SEASON_YEAR = 2026;

export async function loadKnockoutMatchRows(supabase: SupabaseClient): Promise<MatchResultRow[]> {
  // Tolerate null season_year (legacy imports left it unset; see migration 0043).
  const { data } = await supabase
    .from("matches")
    .select("match_number, home_team, away_team, winner, status, tournament_stage")
    .or(matchSeasonYearOrNullFilter(SEASON_YEAR))
    .gte("match_number", 73)
    .lte("match_number", 96);
  return (data ?? []) as MatchResultRow[];
}

export async function loadForecastLockContext(_supabase: SupabaseClient) {
  void _supabase;
  const lockAtUtc = FORECAST_LOCK_UTC;
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
