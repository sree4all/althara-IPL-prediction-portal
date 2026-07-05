/** Tournament Forecast locks at the earliest quarter-final kickoff. */

export function isForecastLocked(lockAtUtc: string | null, now = new Date()): boolean {
  if (!lockAtUtc) return false;
  const t = Date.parse(lockAtUtc);
  if (!Number.isFinite(t)) return false;
  return now.getTime() >= t;
}

export function earliestQuarterFinalKickoff(
  matches: { match_time_utc: string; tournament_stage: string | null }[],
): string | null {
  let earliest: string | null = null;
  let earliestMs = Infinity;
  for (const m of matches) {
    if (m.tournament_stage !== "qf") continue;
    const ms = Date.parse(m.match_time_utc);
    if (!Number.isFinite(ms)) continue;
    if (ms < earliestMs) {
      earliestMs = ms;
      earliest = m.match_time_utc;
    }
  }
  return earliest;
}
