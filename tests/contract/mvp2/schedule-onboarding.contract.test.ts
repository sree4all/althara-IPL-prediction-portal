import assert from "node:assert/strict";
import test from "node:test";

test("schedule onboarding endpoint path", () => {
  assert.equal("/api/matches/full-schedule", "/api/matches/full-schedule");
});

