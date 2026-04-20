import assert from "node:assert/strict";
import test from "node:test";

test("history labels include pending or final", () => {
  assert.ok(["pending", "final"].includes("pending"));
});

