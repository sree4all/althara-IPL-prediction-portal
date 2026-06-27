import assert from "node:assert/strict";
import test from "node:test";

import {
  isMatchLocked,
  isPredictionWindowOpen,
} from "@/lib/utils/match-lock";

const kickoff = new Date("2026-06-15T14:00:00.000Z");

test("prediction window stays open until kickoff", () => {
  const thirtyMinBefore = new Date("2026-06-15T13:30:00.000Z");
  const oneSecondBefore = new Date("2026-06-15T13:59:59.000Z");

  assert.equal(isMatchLocked(kickoff, thirtyMinBefore), false);
  assert.equal(isPredictionWindowOpen(kickoff, thirtyMinBefore), true);
  assert.equal(isMatchLocked(kickoff, oneSecondBefore), false);
  assert.equal(isPredictionWindowOpen(kickoff, oneSecondBefore), true);
});

test("prediction window locks strictly after kickoff", () => {
  const atKickoff = new Date("2026-06-15T14:00:00.000Z");
  const oneSecondAfter = new Date("2026-06-15T14:00:01.000Z");

  assert.equal(isMatchLocked(kickoff, atKickoff), false);
  assert.equal(isPredictionWindowOpen(kickoff, atKickoff), true);
  assert.equal(isMatchLocked(kickoff, oneSecondAfter), true);
  assert.equal(isPredictionWindowOpen(kickoff, oneSecondAfter), false);
});
