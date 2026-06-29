/**
 * Round of 32 kickoffs from FIFA scores & fixtures (UTC instants).
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
 *
 * Matched by home/away country names — not by FIFA match number.
 */
export type R32Kickoff = {
  home: string;
  away: string;
  /** ISO-8601 UTC for `matches.match_time_utc` */
  match_time_utc: string;
  homeAliases?: string[];
  awayAliases?: string[];
};

export const R32_OFFICIAL_KICKOFFS: R32Kickoff[] = [
  {
    home: "South Africa",
    away: "Canada",
    match_time_utc: "2026-06-28T19:00:00.000Z",
  },
  {
    home: "Brazil",
    away: "Japan",
    match_time_utc: "2026-06-29T17:00:00.000Z",
  },
  {
    home: "Germany",
    away: "Paraguay",
    match_time_utc: "2026-06-29T20:30:00.000Z",
  },
  {
    home: "Netherlands",
    away: "Morocco",
    match_time_utc: "2026-06-30T01:00:00.000Z",
  },
  {
    home: "Côte d'Ivoire",
    away: "Norway",
    homeAliases: ["Ivory Coast"],
    match_time_utc: "2026-06-30T17:00:00.000Z",
  },
  {
    home: "France",
    away: "Sweden",
    match_time_utc: "2026-06-30T21:00:00.000Z",
  },
  {
    home: "Mexico",
    away: "Ecuador",
    match_time_utc: "2026-07-01T01:00:00.000Z",
  },
  {
    home: "England",
    away: "DR Congo",
    awayAliases: ["Congo DR"],
    match_time_utc: "2026-07-01T16:00:00.000Z",
  },
  {
    home: "Belgium",
    away: "Senegal",
    match_time_utc: "2026-07-01T20:00:00.000Z",
  },
  {
    home: "USA",
    away: "Bosnia and Herzegovina",
    homeAliases: ["United States"],
    match_time_utc: "2026-07-02T00:00:00.000Z",
  },
  {
    home: "Spain",
    away: "Austria",
    match_time_utc: "2026-07-02T19:00:00.000Z",
  },
  {
    home: "Portugal",
    away: "Croatia",
    match_time_utc: "2026-07-02T23:00:00.000Z",
  },
  {
    home: "Switzerland",
    away: "Algeria",
    match_time_utc: "2026-07-03T03:00:00.000Z",
  },
  {
    home: "Australia",
    away: "Egypt",
    match_time_utc: "2026-07-03T18:00:00.000Z",
  },
  {
    home: "Argentina",
    away: "Cabo Verde",
    awayAliases: ["Cape Verde"],
    match_time_utc: "2026-07-03T22:00:00.000Z",
  },
  {
    home: "Colombia",
    away: "Ghana",
    match_time_utc: "2026-07-04T01:30:00.000Z",
  },
];

export function r32HomeNames(row: R32Kickoff): string[] {
  return [row.home, ...(row.homeAliases ?? [])];
}

export function r32AwayNames(row: R32Kickoff): string[] {
  return [row.away, ...(row.awayAliases ?? [])];
}
