/** Tournament Forecast locks at the earliest Round of 8 (quarter-final) kickoff — M97–M100. */

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
