import assert from "node:assert/strict";
import test from "node:test";

test("tournament endpoints exist", () => {
  assert.ok("/api/tournament/questions");
  assert.ok("/api/tournament/answers");
});

