/**
 * Lock applies when current time is strictly after match start (displayed in IST in UI).
 * At exactly kickoff the window is still open; one second after kickoff it locks.
 */
export function isMatchLocked(
  matchTimeUtc: Date,
  nowUtc: Date = new Date(),
): boolean {
  return nowUtc.getTime() > matchTimeUtc.getTime();
}

/** True while predictions may still be submitted or revised (inverse of lock). */
export function isPredictionWindowOpen(
  matchTimeUtc: Date,
  nowUtc?: Date,
): boolean {
  return !isMatchLocked(matchTimeUtc, nowUtc ?? new Date());
}
