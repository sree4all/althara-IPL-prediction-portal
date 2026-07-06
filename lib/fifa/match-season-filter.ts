/** PostgREST filter: WC 2026 rows may have season_year set or null (legacy FIFA import). */
export function matchSeasonYearOrNullFilter(seasonYear: number): string {
  return `season_year.eq.${seasonYear},season_year.is.null`;
}
