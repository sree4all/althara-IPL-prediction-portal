/** Highest match_number with a manual bonus when odd-match AI generation shipped (R32 through M88). */
export const DEFAULT_ODD_BONUS_CUTOFF_2026 = 88;

/**
 * Deployment floor for odd-match AI bonuses. Odd fixtures at or below this match number are
 * never auto-generated (legacy era). Override with ODD_BONUS_START_MATCH_NUMBER.
 *
 * Do not derive this from the current max bonus match_number — bonuses on higher even fixtures
 * (e.g. M90) would incorrectly block lower odd fixtures (e.g. M89) that still need prompts.
 */
export function resolveOddBonusCutoff(seasonYear: number = 2026): number {
  const envRaw = process.env.ODD_BONUS_START_MATCH_NUMBER?.trim();
  if (envRaw) {
    const n = Number(envRaw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (seasonYear === 2026) return DEFAULT_ODD_BONUS_CUTOFF_2026;
  return 0;
}
