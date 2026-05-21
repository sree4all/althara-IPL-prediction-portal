import {
  KNOCKOUT_PLACEHOLDER_LOSER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_ELIM,
  KNOCKOUT_PLACEHOLDER_WINNER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_Q2,
  KNOCKOUT_SEED_AWAY,
  KNOCKOUT_SEED_AWAY_ELIM,
  KNOCKOUT_SEED_HOME,
  KNOCKOUT_SEED_HOME_ELIM,
} from "@/lib/knockout/constants";

const PLACEHOLDER_TEAMS = new Set([
  KNOCKOUT_SEED_HOME,
  KNOCKOUT_SEED_AWAY,
  KNOCKOUT_SEED_HOME_ELIM,
  KNOCKOUT_SEED_AWAY_ELIM,
  KNOCKOUT_PLACEHOLDER_LOSER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_ELIM,
  KNOCKOUT_PLACEHOLDER_WINNER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_Q2,
]);

/** True when this side is still a bracket placeholder (predictions blocked). */
export function isKnockoutPlaceholderTeam(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (PLACEHOLDER_TEAMS.has(t)) return true;
  if (/^\s*team\s+[1-4]\s*\(/i.test(t)) return true;
  if (/loser of|winner of/i.test(t)) return true;
  return false;
}

export function isKnockoutMatchReadyForPredictions(homeTeam: string, awayTeam: string): boolean {
  return (
    !isKnockoutPlaceholderTeam(homeTeam) && !isKnockoutPlaceholderTeam(awayTeam)
  );
}
