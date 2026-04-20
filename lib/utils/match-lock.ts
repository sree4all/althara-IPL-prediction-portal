const THIRTY_MIN_MS = 30 * 60 * 1000;

/**
 * Lock applies when current time is strictly after (match start − 30 minutes).
 * Predictions are rejected in that case; at exactly (match − 30m) the window is still open.
 */
export function isMatchLocked(
  matchTimeUtc: Date,
  nowUtc: Date = new Date(),
): boolean {
  const lockBoundary = new Date(matchTimeUtc.getTime() - THIRTY_MIN_MS);
  return nowUtc.getTime() > lockBoundary.getTime();
}

/** True while predictions may still be submitted or revised (inverse of lock). */
export function isPredictionWindowOpen(
  matchTimeUtc: Date,
  nowUtc?: Date,
): boolean {
  return !isMatchLocked(matchTimeUtc, nowUtc ?? new Date());
}
