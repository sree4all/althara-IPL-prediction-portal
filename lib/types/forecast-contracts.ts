export type ForecastAnswersPayload = {
  semi_finalist_teams: string[];
  finalist_teams: string[];
  winner_team: string | null;
};

export type FifaSyncSchedulePayload = {
  fifa_dir?: string;
  season_year?: number;
};

export type GenerateOddBonusesPayload = {
  season_year?: number;
  dry_run?: boolean;
  limit?: number;
};

export function parseForecastAnswersPayload(body: unknown): ForecastAnswersPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.semi_finalist_teams) || !Array.isArray(o.finalist_teams)) return null;
  const semi = o.semi_finalist_teams.map((t) => String(t).trim()).filter(Boolean);
  const final = o.finalist_teams.map((t) => String(t).trim()).filter(Boolean);
  const winner =
    o.winner_team === null || o.winner_team === undefined
      ? null
      : String(o.winner_team).trim() || null;
  return {
    semi_finalist_teams: semi,
    finalist_teams: final,
    winner_team: winner,
  };
}
