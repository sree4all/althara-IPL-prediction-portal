import assert from "node:assert/strict";
import test from "node:test";
import {
  arePicksRevealed,
  filterPickRows,
  shouldRevealAllPicks,
} from "@/lib/matches/picks-reveal-gate";

const kickoff = "2030-01-01T15:00:00.000Z";

test("picks hidden before kickoff for regular users", () => {
  const before = new Date("2030-01-01T14:00:00.000Z");
  assert.equal(shouldRevealAllPicks(kickoff, false, before), false);
  assert.equal(shouldRevealAllPicks(kickoff, true, before), true);
});

test("picks revealed after kickoff", () => {
  const after = new Date("2030-01-01T16:00:00.000Z");
  assert.equal(arePicksRevealed(kickoff, after), true);
  assert.equal(shouldRevealAllPicks(kickoff, false, after), true);
});

test("filterPickRows keeps only viewer when gated", () => {
  const rows = [
    { user_id: "a", name: "A" },
    { user_id: "b", name: "B" },
  ];
  const filtered = filterPickRows(rows, "a", false);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].user_id, "a");
});
