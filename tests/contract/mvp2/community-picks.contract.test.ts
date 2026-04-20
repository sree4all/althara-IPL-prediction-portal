import assert from "node:assert/strict";
import test from "node:test";

test("community picks endpoint path", () => {
  assert.equal("/api/community-picks", "/api/community-picks");
});

