import { isMatchLocked } from "@/lib/utils/match-lock";

const TERMINAL_STATUSES = new Set(["completed", "abandoned", "cancelled"]);

export type OddBonusMatchRow = {
  id: string;
  match_number: number | null;
  match_time_utc: string;
  status: string | null;
};

/** True when an odd-match AI bonus may still be created (upcoming, prediction window open). */
export function isEligibleForOddMatchBonus(
  match: OddBonusMatchRow,
  nowUtc: Date = new Date(),
): boolean {
  const status = String(match.status ?? "").toLowerCase();
  if (TERMINAL_STATUSES.has(status)) return false;
  const kickoffMs = Date.parse(match.match_time_utc);
  if (!Number.isFinite(kickoffMs)) return false;
  return !isMatchLocked(new Date(kickoffMs), nowUtc);
}

export function selectOddMatchBonusCandidates<T extends OddBonusMatchRow>(
  matches: T[],
  opts: { cutoff: number; hasBonusMatchIds: Set<string> },
  nowUtc: Date = new Date(),
): T[] {
  return matches
    .filter((m) => {
      const mn = m.match_number;
      if (mn == null || mn % 2 !== 1) return false;
      if (mn <= opts.cutoff) return false;
      if (opts.hasBonusMatchIds.has(m.id)) return false;
      return isEligibleForOddMatchBonus(m, nowUtc);
    })
    .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));
}
