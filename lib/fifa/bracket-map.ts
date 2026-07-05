/** FIFA WC26 knockout bracket derived from docs/fifa/matches.csv (M73–M104). */

export type BracketFeed = {
  sourceMatchNumber: number;
  targetMatchNumber: number;
  targetSlot: "home" | "away";
};

export type SfExclusionGroup = {
  group_id: string;
  r16_match_number: number;
  feeder_r32_match_numbers: [number, number];
};

export type FinalHalf = {
  half_id: "left" | "right";
  sf_exclusion_group_ids: string[];
};

/** Winner of source match fills target slot on target match. */
export const BRACKET_FEEDS: BracketFeed[] = [
  { sourceMatchNumber: 73, targetMatchNumber: 89, targetSlot: "home" },
  { sourceMatchNumber: 75, targetMatchNumber: 89, targetSlot: "away" },
  { sourceMatchNumber: 74, targetMatchNumber: 90, targetSlot: "home" },
  { sourceMatchNumber: 77, targetMatchNumber: 90, targetSlot: "away" },
  { sourceMatchNumber: 76, targetMatchNumber: 91, targetSlot: "home" },
  { sourceMatchNumber: 78, targetMatchNumber: 91, targetSlot: "away" },
  { sourceMatchNumber: 79, targetMatchNumber: 92, targetSlot: "home" },
  { sourceMatchNumber: 80, targetMatchNumber: 92, targetSlot: "away" },
  { sourceMatchNumber: 83, targetMatchNumber: 93, targetSlot: "home" },
  { sourceMatchNumber: 84, targetMatchNumber: 93, targetSlot: "away" },
  { sourceMatchNumber: 81, targetMatchNumber: 94, targetSlot: "home" },
  { sourceMatchNumber: 82, targetMatchNumber: 94, targetSlot: "away" },
  { sourceMatchNumber: 86, targetMatchNumber: 95, targetSlot: "home" },
  { sourceMatchNumber: 88, targetMatchNumber: 95, targetSlot: "away" },
  { sourceMatchNumber: 85, targetMatchNumber: 96, targetSlot: "home" },
  { sourceMatchNumber: 87, targetMatchNumber: 96, targetSlot: "away" },
  { sourceMatchNumber: 89, targetMatchNumber: 97, targetSlot: "home" },
  { sourceMatchNumber: 90, targetMatchNumber: 97, targetSlot: "away" },
  { sourceMatchNumber: 93, targetMatchNumber: 98, targetSlot: "home" },
  { sourceMatchNumber: 94, targetMatchNumber: 98, targetSlot: "away" },
  { sourceMatchNumber: 91, targetMatchNumber: 99, targetSlot: "home" },
  { sourceMatchNumber: 92, targetMatchNumber: 99, targetSlot: "away" },
  { sourceMatchNumber: 95, targetMatchNumber: 100, targetSlot: "home" },
  { sourceMatchNumber: 96, targetMatchNumber: 100, targetSlot: "away" },
  { sourceMatchNumber: 97, targetMatchNumber: 101, targetSlot: "home" },
  { sourceMatchNumber: 98, targetMatchNumber: 101, targetSlot: "away" },
  { sourceMatchNumber: 99, targetMatchNumber: 102, targetSlot: "home" },
  { sourceMatchNumber: 100, targetMatchNumber: 102, targetSlot: "away" },
  { sourceMatchNumber: 101, targetMatchNumber: 104, targetSlot: "home" },
  { sourceMatchNumber: 102, targetMatchNumber: 104, targetSlot: "away" },
];

/** At most one semi-finalist pick per R16 feeder pair. */
export const SF_EXCLUSION_GROUPS: SfExclusionGroup[] = [
  { group_id: "r16-89", r16_match_number: 89, feeder_r32_match_numbers: [73, 75] },
  { group_id: "r16-90", r16_match_number: 90, feeder_r32_match_numbers: [74, 77] },
  { group_id: "r16-91", r16_match_number: 91, feeder_r32_match_numbers: [76, 78] },
  { group_id: "r16-92", r16_match_number: 92, feeder_r32_match_numbers: [79, 80] },
  { group_id: "r16-93", r16_match_number: 93, feeder_r32_match_numbers: [83, 84] },
  { group_id: "r16-94", r16_match_number: 94, feeder_r32_match_numbers: [81, 82] },
  { group_id: "r16-95", r16_match_number: 95, feeder_r32_match_numbers: [86, 88] },
  { group_id: "r16-96", r16_match_number: 96, feeder_r32_match_numbers: [85, 87] },
];

/** Finalists must be one from each half among semi-finalist picks. */
export const FINAL_HALVES: FinalHalf[] = [
  {
    half_id: "left",
    sf_exclusion_group_ids: ["r16-89", "r16-90", "r16-93", "r16-94"],
  },
  {
    half_id: "right",
    sf_exclusion_group_ids: ["r16-91", "r16-92", "r16-95", "r16-96"],
  },
];

/** Initial R32 participants (team names from docs/fifa/matches.csv). */
export const R32_INITIAL_TEAMS: Record<number, [string, string]> = {
  73: ["South Africa", "Canada"],
  74: ["Germany", "Paraguay"],
  75: ["Netherlands", "Morocco"],
  76: ["Brazil", "Japan"],
  77: ["France", "Sweden"],
  78: ["Côte d'Ivoire", "Norway"],
  79: ["Mexico", "Ecuador"],
  80: ["England", "DR Congo"],
  81: ["USA", "Bosnia and Herzegovina"],
  82: ["Belgium", "Senegal"],
  83: ["Portugal", "Croatia"],
  84: ["Spain", "Austria"],
  85: ["Switzerland", "Algeria"],
  86: ["Argentina", "Cabo Verde"],
  87: ["Colombia", "Ghana"],
  88: ["Australia", "Egypt"],
};

export const R32_MATCH_NUMBERS = Object.keys(R32_INITIAL_TEAMS).map(Number);

export function feedsFromSource(sourceMatchNumber: number): BracketFeed[] {
  return BRACKET_FEEDS.filter((f) => f.sourceMatchNumber === sourceMatchNumber);
}

export function sfGroupForTeam(team: string, aliveTeams: Set<string>): string | null {
  for (const g of SF_EXCLUSION_GROUPS) {
    const teamsInGroup = g.feeder_r32_match_numbers.flatMap(
      (mn) => R32_INITIAL_TEAMS[mn]?.filter((t) => aliveTeams.has(t)) ?? [],
    );
    if (teamsInGroup.includes(team)) return g.group_id;
  }
  return null;
}

export function finalHalfForGroup(groupId: string): "left" | "right" | null {
  for (const h of FINAL_HALVES) {
    if (h.sf_exclusion_group_ids.includes(groupId)) return h.half_id;
  }
  return null;
}
