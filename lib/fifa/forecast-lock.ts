/**
 * Tournament Forecast lock.
 *
 * The forecast now closes at a fixed deadline — Tuesday, 14 July 2026, 3:00 PM ET
 * (Eastern Daylight Time, UTC-4) = 2026-07-14T19:00:00Z — just before the
 * France vs Spain semi-final. This replaces the previous "earliest Round of 8
 * kickoff" rule, which never engaged because knockout fixtures (M97–M100) were
 * not loaded, leaving the forecast permanently open.
 */
export const FORECAST_LOCK_UTC = "2026-07-14T19:00:00.000Z";

export const ROUND_OF_8_MATCH_NUMBERS = [97, 98, 99, 100] as const;

export function isRoundOf8Match(match: {
  tournament_stage: string | null;
  match_number?: number | null;
}): boolean {
  if (match.tournament_stage === "qf") return true;
  const n = match.match_number;
  return (
    typeof n === "number" &&
    (ROUND_OF_8_MATCH_NUMBERS as readonly number[]).includes(n)
  );
}

export function isForecastLocked(lockAtUtc: string | null, now = new Date()): boolean {
  if (!lockAtUtc) return false;
  const t = Date.parse(lockAtUtc);
  if (!Number.isFinite(t)) return false;
  return now.getTime() >= t;
}

export function earliestQuarterFinalKickoff(
  matches: {
    match_time_utc: string;
    tournament_stage: string | null;
    match_number?: number | null;
  }[],
): string | null {
  let earliest: string | null = null;
  let earliestMs = Infinity;
  for (const m of matches) {
    if (!isRoundOf8Match(m)) continue;
    const ms = Date.parse(m.match_time_utc);
    if (!Number.isFinite(ms)) continue;
    if (ms < earliestMs) {
      earliestMs = ms;
      earliest = m.match_time_utc;
    }
  }
  return earliest;
}
