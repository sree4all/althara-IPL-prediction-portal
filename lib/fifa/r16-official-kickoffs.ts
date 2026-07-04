/**
 * Round of 16 kickoffs from FIFA match centre (UTC instants).
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
 *
 * Matched by home/away country names — not by FIFA match number.
 */
export type R16Kickoff = {
  home: string;
  away: string;
  /** ISO-8601 UTC for `matches.match_time_utc` */
  match_time_utc: string;
  homeAliases?: string[];
  awayAliases?: string[];
};

export const R16_OFFICIAL_KICKOFFS: R16Kickoff[] = [
  {
    home: "Paraguay",
    away: "France",
    match_time_utc: "2026-07-04T21:00:00.000Z",
  },
  {
    home: "Canada",
    away: "Morocco",
    match_time_utc: "2026-07-04T17:00:00.000Z",
  },
  {
    home: "Brazil",
    away: "Norway",
    match_time_utc: "2026-07-05T20:00:00.000Z",
  },
  {
    home: "Mexico",
    away: "England",
    match_time_utc: "2026-07-06T00:00:00.000Z",
  },
  {
    home: "Portugal",
    away: "Spain",
    match_time_utc: "2026-07-06T19:00:00.000Z",
  },
  {
    home: "USA",
    away: "Belgium",
    homeAliases: ["United States"],
    match_time_utc: "2026-07-06T21:00:00.000Z",
  },
  {
    home: "Argentina",
    away: "Egypt",
    match_time_utc: "2026-07-07T16:00:00.000Z",
  },
  {
    home: "Switzerland",
    away: "Colombia",
    match_time_utc: "2026-07-07T20:00:00.000Z",
  },
];

export function r16HomeNames(row: R16Kickoff): string[] {
  return [row.home, ...(row.homeAliases ?? [])];
}

export function r16AwayNames(row: R16Kickoff): string[] {
  return [row.away, ...(row.awayAliases ?? [])];
}
