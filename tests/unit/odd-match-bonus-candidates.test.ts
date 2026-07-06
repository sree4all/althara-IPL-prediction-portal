import assert from "node:assert/strict";
import test from "node:test";
import {
  isEligibleForOddMatchBonus,
  selectOddMatchBonusCandidates,
} from "@/lib/fifa/odd-match-bonus-candidates";
import { resolveOddBonusCutoff } from "@/lib/fifa/odd-match-bonus-cutoff";

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

test("selectOddMatchBonusCandidates still picks M93 when a higher even match has a bonus", () => {
  const now = new Date("2026-07-06T03:00:00.000Z");
  const rows = [
    { id: "m90", match_number: 90, match_time_utc: futureKickoff, status: "scheduled" },
    { id: "m93", match_number: 93, match_time_utc: futureKickoff, status: "scheduled" },
    { id: "m94", match_number: 94, match_time_utc: futureKickoff, status: "scheduled" },
  ];
  const picked = selectOddMatchBonusCandidates(
    rows,
    { cutoff: 88, hasBonusMatchIds: new Set(["m94"]) },
    now,
  );
  assert.deepEqual(
    picked.map((m) => m.match_number),
    [93],
  );
});

test("resolveOddBonusCutoff uses env override and 2026 default", () => {
  const prev = process.env.ODD_BONUS_START_MATCH_NUMBER;
  process.env.ODD_BONUS_START_MATCH_NUMBER = "95";
  assert.equal(resolveOddBonusCutoff(2026), 95);
  delete process.env.ODD_BONUS_START_MATCH_NUMBER;
  assert.equal(resolveOddBonusCutoff(2026), 88);
  if (prev !== undefined) process.env.ODD_BONUS_START_MATCH_NUMBER = prev;
});
