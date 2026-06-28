import { DRAW_PICK } from "@/lib/fifa/stages";

/** First fixture where draw is not a valid prediction (Round of 32). */
export const FIRST_NO_DRAW_MATCH_NUMBER = 73;

/** True when players may pick a draw (group stage only; knockout from match 73). */
export function isDrawAllowedForMatch(
  matchNumber: number | null | undefined,
  tournamentStage?: string | null,
): boolean {
  if (matchNumber != null && Number.isFinite(matchNumber)) {
    return matchNumber < FIRST_NO_DRAW_MATCH_NUMBER;
  }
  if (tournamentStage && tournamentStage !== "group") {
    return false;
  }
  return true;
}

export function allowedWinnerPicks(
  homeTeam: string,
  awayTeam: string,
  matchNumber: number | null | undefined,
  tournamentStage?: string | null,
): string[] {
  const picks = [homeTeam, awayTeam];
  if (isDrawAllowedForMatch(matchNumber, tournamentStage)) {
    picks.push(DRAW_PICK);
  }
  return picks;
}

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
