/** True when both sides have real team names (not TBD / empty placeholders). */
export function isMatchReadyForPredictions(
  homeTeam: string,
  awayTeam: string,
): boolean {
  const home = homeTeam?.trim() ?? "";
  const away = awayTeam?.trim() ?? "";
  if (!home || !away) return false;
  if (home.toUpperCase() === "TBD" || away.toUpperCase() === "TBD") return false;
  if (home.startsWith("TBD") || away.startsWith("TBD")) return false;
  return true;
}
