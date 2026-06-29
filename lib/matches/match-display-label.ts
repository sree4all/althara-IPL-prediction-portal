import { STAGE_LABEL, parseTournamentStage } from "@/lib/fifa/stages";
import { formatIstDateTimeFriendly } from "@/lib/utils/time-format";

/** Participant-facing label: teams only (no WC26-M{n} fixture codes). */
export function formatMatchTeamsLabel(home: string, away: string): string {
  return `${home} vs ${away}`;
}

export function formatMatchTeamsWithStage(
  home: string,
  away: string,
  tournamentStage?: string | null,
): string {
  const base = formatMatchTeamsLabel(home, away);
  const stage = parseTournamentStage(tournamentStage);
  if (stage && stage !== "group") {
    return `${base} · ${STAGE_LABEL[stage]}`;
  }
  return base;
}

export function formatMatchLabelWithIst(home: string, away: string, matchTimeUtc: string): string {
  return `${formatMatchTeamsLabel(home, away)} · ${formatIstDateTimeFriendly(matchTimeUtc)}`;
}
