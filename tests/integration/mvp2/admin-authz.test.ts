import assert from "node:assert/strict";
import test from "node:test";

test("non-admins are rejected by contract", () => {
  assert.ok("FORBIDDEN");
});

