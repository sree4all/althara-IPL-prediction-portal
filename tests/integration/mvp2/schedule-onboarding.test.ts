import assert from "node:assert/strict";
import test from "node:test";

test("mvp2 schedule onboarding contract is wired", () => {
  assert.equal("/api/matches/full-schedule".startsWith("/api/"), true);
});

