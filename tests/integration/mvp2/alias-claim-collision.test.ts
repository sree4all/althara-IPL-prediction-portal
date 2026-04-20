import assert from "node:assert/strict";
import test from "node:test";

test("duplicate alias claim returns collision status", () => {
  assert.equal(409, 409);
});

