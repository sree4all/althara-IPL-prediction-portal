import {
  isEligibleForOddMatchBonus,
  type OddBonusMatchRow,
} from "@/lib/fifa/odd-match-bonus-candidates";

export type OddBonusSkipReason =
  | "even"
  | "missing_match_number"
  | "below_cutoff"
  | "has_bonus"
  | "locked_or_completed";

export function summarizeOddBonusSkips(
  matches: OddBonusMatchRow[],
  opts: { cutoff: number; hasBonusMatchIds: Set<string> },
  nowUtc: Date = new Date(),
): { reason: OddBonusSkipReason; match_number: number }[] {
  const skipped: { reason: OddBonusSkipReason; match_number: number }[] = [];

  for (const m of matches) {
    const mn = m.match_number;
    if (mn == null) {
      skipped.push({ reason: "missing_match_number", match_number: -1 });
      continue;
    }
    if (mn % 2 !== 1) {
      skipped.push({ reason: "even", match_number: mn });
      continue;
    }
    if (mn <= opts.cutoff) {
      skipped.push({ reason: "below_cutoff", match_number: mn });
      continue;
    }
    if (opts.hasBonusMatchIds.has(m.id)) {
      skipped.push({ reason: "has_bonus", match_number: mn });
      continue;
    }
    if (!isEligibleForOddMatchBonus(m, nowUtc)) {
      skipped.push({ reason: "locked_or_completed", match_number: mn });
    }
  }

  return skipped;
}

export function formatOddBonusNoMatchesMessage(
  cutoff: number,
  skipped: { reason: OddBonusSkipReason; match_number: number }[],
): string {
  const locked = skipped
    .filter((s) => s.reason === "locked_or_completed" && s.match_number > cutoff)
    .map((s) => s.match_number)
    .sort((a, b) => a - b);
  const hasBonus = skipped
    .filter((s) => s.reason === "has_bonus" && s.match_number > cutoff)
    .map((s) => s.match_number)
    .sort((a, b) => a - b);

  const parts = [
    `No upcoming odd fixtures above match M${cutoff} without an active bonus.`,
  ];
  if (locked.length > 0) {
    parts.push(`Past kickoff or completed: M${locked.join(", M")}.`);
  }
  if (hasBonus.length > 0) {
    parts.push(`Already have bonuses: M${hasBonus.join(", M")}.`);
  }
  parts.push("Run Sync FIFA schedule if match numbers or kickoffs look wrong.");
  return parts.join(" ");
}
