export type GeneratedBonus = {
  prompt_text: string;
  options: { label: string; value: string }[];
};

export type MatchBonusContext = {
  match_number: number;
  home_team: string;
  away_team: string;
  tournament_stage: string;
  match_time_utc: string;
};

/** Yes/No options matching manually seeded R32 match bonuses (A/B values). */
export const YES_NO_OPTIONS: GeneratedBonus["options"] = [
  { label: "Yes", value: "A" },
  { label: "No", value: "B" },
];

/**
 * Manually ordered match bonus templates (from R32 seeds M82/M84/M86/M88).
 * `{home_team}` and `{away_team}` are substituted per fixture.
 */
export const MATCH_BONUS_TEMPLATES: { prompt_text: string; options: GeneratedBonus["options"] }[] = [
  {
    prompt_text: "Does {home_team} score first?",
    options: YES_NO_OPTIONS,
  },
  {
    prompt_text: "Does {home_team} have 60%+ possession?",
    options: YES_NO_OPTIONS,
  },
  {
    prompt_text: "Does a {home_team} player get a goal or assist?",
    options: YES_NO_OPTIONS,
  },
  {
    prompt_text: "Does the match need extra time or penalties?",
    options: YES_NO_OPTIONS,
  },
  {
    prompt_text: "Will both teams score?",
    options: YES_NO_OPTIONS,
  },
  {
    prompt_text: "Will there be 3 or more goals in the match?",
    options: YES_NO_OPTIONS,
  },
];

function applyTeamPlaceholders(text: string, ctx: MatchBonusContext): string {
  return text
    .replaceAll("{home_team}", ctx.home_team)
    .replaceAll("{away_team}", ctx.away_team);
}

/** Pick a curated template by match number (cycles through the manual set). */
export function pickMatchBonusTemplate(ctx: MatchBonusContext): GeneratedBonus {
  const idx = Math.abs(ctx.match_number) % MATCH_BONUS_TEMPLATES.length;
  const template = MATCH_BONUS_TEMPLATES[idx]!;
  return {
    prompt_text: applyTeamPlaceholders(template.prompt_text, ctx),
    options: template.options.map((o) => ({ ...o })),
  };
}

/** Reject LLM drafts that duplicate the main match-winner prediction. */
export function isWinnerDuplicateBonus(promptText: string): boolean {
  const normalized = promptText.trim().toLowerCase();
  return (
    /^who will win\b/.test(normalized) ||
    /\bwho wins\b/.test(normalized) ||
    /\bmatch winner\b/.test(normalized)
  );
}
