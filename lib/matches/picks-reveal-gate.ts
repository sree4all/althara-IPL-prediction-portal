/** Pre-kickoff community pick visibility (regular members see only self). */

export function arePicksRevealed(matchTimeUtc: string, now = new Date()): boolean {
  const t = Date.parse(matchTimeUtc);
  if (!Number.isFinite(t)) return true;
  return now.getTime() >= t;
}

export function shouldRevealAllPicks(
  matchTimeUtc: string,
  isAdmin: boolean,
  now = new Date(),
): boolean {
  if (isAdmin) return true;
  return arePicksRevealed(matchTimeUtc, now);
}

export type PickRow = { user_id: string; user_display_name: string; predicted_winner: string };

export function filterPickRows<T extends { user_id: string }>(
  rows: T[],
  viewerUserId: string,
  revealAll: boolean,
): T[] {
  if (revealAll) return rows;
  return rows.filter((r) => r.user_id === viewerUserId);
}
