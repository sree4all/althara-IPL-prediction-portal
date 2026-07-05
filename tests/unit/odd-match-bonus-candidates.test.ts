import assert from "node:assert/strict";
import test from "node:test";
import {
  isEligibleForOddMatchBonus,
  selectOddMatchBonusCandidates,
} from "@/lib/fifa/odd-match-bonus-candidates";

const futureKickoff = "2099-06-01T18:00:00.000Z";
const pastKickoff = "2020-06-01T18:00:00.000Z";

test("isEligibleForOddMatchBonus rejects completed and past-kickoff matches", () => {
  assert.equal(
    isEligibleForOddMatchBonus(
      { id: "1", match_number: 89, match_time_utc: futureKickoff, status: "completed" },
      new Date("2026-07-05T12:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isEligibleForOddMatchBonus(
      { id: "2", match_number: 89, match_time_utc: pastKickoff, status: "scheduled" },
      new Date("2026-07-05T12:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isEligibleForOddMatchBonus(
      { id: "3", match_number: 91, match_time_utc: futureKickoff, status: "scheduled" },
      new Date("2026-07-05T12:00:00.000Z"),
    ),
    true,
  );
});

test("selectOddMatchBonusCandidates only returns odd upcoming matches above cutoff", () => {
  const now = new Date("2026-07-05T12:00:00.000Z");
  const rows = [
    { id: "a", match_number: 88, match_time_utc: futureKickoff, status: "scheduled" },
    { id: "b", match_number: 89, match_time_utc: pastKickoff, status: "scheduled" },
    { id: "c", match_number: 90, match_time_utc: futureKickoff, status: "scheduled" },
    { id: "d", match_number: 91, match_time_utc: futureKickoff, status: "scheduled" },
    { id: "e", match_number: 93, match_time_utc: futureKickoff, status: "completed" },
  ];
  const picked = selectOddMatchBonusCandidates(
    rows,
    { cutoff: 88, hasBonusMatchIds: new Set() },
    now,
  );
  assert.deepEqual(
    picked.map((m) => m.match_number),
    [91],
  );
});
