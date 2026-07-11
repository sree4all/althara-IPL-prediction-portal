import {
  FINAL_HALVES,
  R32_INITIAL_TEAMS,
  R32_MATCH_NUMBERS,
  SF_EXCLUSION_GROUPS,
  finalHalfForGroup,
  sfGroupForTeam,
} from "@/lib/fifa/bracket-map";
import type { ForecastAnswersPayload } from "@/lib/types/forecast-contracts";

export type MatchResultRow = {
  match_number: number | null;
  home_team: string;
  away_team: string;
  winner: string | null;
  status: string;
  tournament_stage: string | null;
};

export type BracketState = {
  aliveTeams: Set<string>;
  eliminatedTeams: Set<string>;
};

export function computeBracketState(matches: MatchResultRow[]): BracketState {
  const alive = new Set<string>();
  const eliminated = new Set<string>();

  for (const mn of R32_MATCH_NUMBERS) {
    for (const t of R32_INITIAL_TEAMS[mn] ?? []) alive.add(t);
  }

  for (const m of matches) {
    const mn = m.match_number;
    if (mn == null || mn < 73 || mn > 96) continue;
    if (m.status !== "completed" || !m.winner?.trim()) continue;
    const winner = m.winner.trim();
    const home = m.home_team.trim();
    const away = m.away_team.trim();
    if (winner !== home && winner !== away) continue;
    const loser = winner === home ? away : home;
    if (alive.has(loser)) {
      alive.delete(loser);
      eliminated.add(loser);
    }
  }

  return { aliveTeams: alive, eliminatedTeams: eliminated };
}

export function buildEligibilityResponse(state: BracketState) {
  const sfGroups = SF_EXCLUSION_GROUPS.map((g) => ({
    group_id: g.group_id,
    teams: g.feeder_r32_match_numbers.flatMap(
      (mn) => R32_INITIAL_TEAMS[mn]?.filter((t) => state.aliveTeams.has(t)) ?? [],
    ),
  }));

  const finalHalves = FINAL_HALVES.map((h) => ({
    half_id: h.half_id,
    teams: h.sf_exclusion_group_ids.flatMap((gid) => {
      const g = sfGroups.find((x) => x.group_id === gid);
      return g?.teams ?? [];
    }),
  }));

  return {
    eligible_teams: [...state.aliveTeams].sort(),
    eliminated_teams: [...state.eliminatedTeams].sort(),
    sf_exclusion_groups: sfGroups,
    final_halves: finalHalves,
  };
}

export type ForecastValidationError =
  | "INVALID_SEMI_FINALISTS"
  | "INVALID_FINALISTS"
  | "INVALID_WINNER"
  | "ELIMINATED_TEAM";

export function validateForecastAnswers(
  payload: ForecastAnswersPayload,
  state: BracketState,
): ForecastValidationError | null {
  // The semi-finalist question is discarded, so only finalists and the winner
  // are validated. Finalists are now picked directly from eligible teams
  // (opposite halves of the bracket) rather than from a semi-finalist shortlist.
  const { finalist_teams: final, winner_team: winner } = payload;

  const picked = [...final, ...(winner ? [winner] : [])];
  for (const t of picked) {
    if (state.eliminatedTeams.has(t)) return "ELIMINATED_TEAM";
    if (!state.aliveTeams.has(t)) return "ELIMINATED_TEAM";
  }

  if (final.length !== 2) return "INVALID_FINALISTS";
  const finalSet = new Set(final);
  if (finalSet.size !== 2) return "INVALID_FINALISTS";

  const halves = final.map((t) => {
    const gid = sfGroupForTeam(t, state.aliveTeams);
    return gid ? finalHalfForGroup(gid) : null;
  });
  if (halves[0] === halves[1] || !halves[0] || !halves[1]) return "INVALID_FINALISTS";

  if (winner) {
    if (!finalSet.has(winner)) return "INVALID_WINNER";
  }

  return null;
}
