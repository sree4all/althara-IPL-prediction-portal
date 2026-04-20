import assert from "node:assert/strict";
import test from "node:test";
import { isTournamentAnswersLocked } from "@/lib/utils/tournament-lock";

test("tournament lock evaluates by utc timestamp", () => {
  assert.equal(isTournamentAnswersLocked("2099-01-01T00:00:00Z"), false);
});

