/** FIFA World Cup 2026 tournament stage slugs (from docs/fifa/tournament_stages.csv). */

export type TournamentStageSlug =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export const DRAW_PICK = "Draw";

/** CSV stage_id → DB slug */
export const STAGE_ID_TO_SLUG: Record<number, TournamentStageSlug> = {
  1: "group",
  2: "r32",
  3: "r16",
  4: "qf",
  5: "sf",
  6: "third_place",
  7: "final",
};

export const STAGE_LABEL: Record<TournamentStageSlug, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-Finals",
  sf: "Semi-Finals",
  third_place: "Third Place Playoff",
  final: "Final",
};

/** DB `stage_key` values used in extended FIFA match imports */
export const STAGE_SLUG_TO_KEY: Record<TournamentStageSlug, string> = {
  group: "group_stage",
  r32: "round_of_32",
  r16: "round_of_16",
  qf: "quarterfinals",
  sf: "semifinals",
  third_place: "third_place",
  final: "final",
};

export const STAGE_ORDER: TournamentStageSlug[] = [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

export const DEFAULT_STAGE_SCORING: {
  stage_slug: TournamentStageSlug;
  correct_points: number;
  incorrect_points: number;
}[] = [
  { stage_slug: "group", correct_points: 2, incorrect_points: 0 },
  { stage_slug: "r32", correct_points: 3, incorrect_points: -1 },
  { stage_slug: "r16", correct_points: 5, incorrect_points: -2 },
  { stage_slug: "qf", correct_points: 8, incorrect_points: -3 },
  { stage_slug: "sf", correct_points: 12, incorrect_points: -4 },
  { stage_slug: "third_place", correct_points: 8, incorrect_points: -3 },
  { stage_slug: "final", correct_points: 20, incorrect_points: -10 },
];

export function stageIdToSlug(stageId: number): TournamentStageSlug | null {
  return STAGE_ID_TO_SLUG[stageId] ?? null;
}

export function parseTournamentStage(
  value: string | null | undefined,
): TournamentStageSlug | null {
  if (!value) return null;
  return STAGE_ORDER.includes(value as TournamentStageSlug)
    ? (value as TournamentStageSlug)
    : null;
}

export function stageScoringHint(
  slug: TournamentStageSlug | null,
  correct: number,
  incorrect: number,
): string | null {
  if (!slug) return null;
  const label = STAGE_LABEL[slug];
  const wrong =
    incorrect === 0 ? "0 wrong" : `${incorrect} wrong`;
  return `${label}: +${correct} correct, ${wrong}`;
}
