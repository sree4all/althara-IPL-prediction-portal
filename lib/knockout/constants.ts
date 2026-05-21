/** Knockout (M71–M74) bracket — not league / playoff wording in product copy. */

export type KnockoutStage = "q1" | "eliminator" | "q2" | "final";

export const KNOCKOUT_EXTERNAL_KEY: Record<KnockoutStage, string> = {
  q1: "M71",
  eliminator: "M72",
  q2: "M73",
  final: "M74",
};

export const KNOCKOUT_STAGE_BY_KEY: Record<string, KnockoutStage> = {
  M71: "q1",
  M72: "eliminator",
  M73: "q2",
  M74: "final",
};

/** Default labels before admin sets league positions (Team 1–4). */
export const KNOCKOUT_SEED_HOME = "Team 1 (set in Admin → Knockout)";
export const KNOCKOUT_SEED_AWAY = "Team 2 (set in Admin → Knockout)";
export const KNOCKOUT_SEED_HOME_ELIM = "Team 3 (set in Admin → Knockout)";
export const KNOCKOUT_SEED_AWAY_ELIM = "Team 4 (set in Admin → Knockout)";

export const KNOCKOUT_PLACEHOLDER_LOSER_Q1 = "Loser of Qualifier 1";
export const KNOCKOUT_PLACEHOLDER_WINNER_ELIM = "Winner of Eliminator";
export const KNOCKOUT_PLACEHOLDER_WINNER_Q1 = "Winner of Qualifier 1";
export const KNOCKOUT_PLACEHOLDER_WINNER_Q2 = "Winner of Qualifier 2";

export const KNOCKOUT_STAGE_LABEL: Record<KnockoutStage, string> = {
  q1: "Qualifier 1",
  eliminator: "Eliminator",
  q2: "Qualifier 2",
  final: "Final",
};

export const KNOCKOUT_SCORING_HINT: Record<KnockoutStage, string> = {
  q1: "Knockout scoring: +3 correct, −1 wrong",
  eliminator: "Knockout scoring: +3 correct, −1 wrong",
  q2: "Knockout scoring: +3 correct, −1 wrong",
  final: "Knockout scoring: +5 correct, −2 wrong",
};
