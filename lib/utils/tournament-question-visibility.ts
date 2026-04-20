/** Participant-facing visibility for a tournament question row. */
export function isTournamentQuestionVisible(q: {
  is_active: boolean;
  visible_after_utc: string | null;
  revealed_by_admin: boolean;
}, now = new Date()): boolean {
  if (!q.is_active) return false;
  if (q.revealed_by_admin) return true;
  if (q.visible_after_utc) {
    return new Date(q.visible_after_utc) <= now;
  }
  return false;
}
