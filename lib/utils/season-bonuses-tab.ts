/**
 * Season Bonuses tab is shown or hidden as a whole (all questions together).
 * Controlled from `tournament_config` (not per-question flags).
 */
export function isSeasonBonusesTabVisible(
  cfg: {
    season_bonuses_visible_after_utc?: string | null;
    season_bonuses_revealed_by_admin?: boolean | null;
  } | null,
  now = new Date(),
): boolean {
  if (!cfg) return true;
  if (cfg.season_bonuses_revealed_by_admin) return true;
  if (cfg.season_bonuses_visible_after_utc) {
    return new Date(cfg.season_bonuses_visible_after_utc) <= now;
  }
  return false;
}
