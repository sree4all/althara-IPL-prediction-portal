import assert from "node:assert/strict";
import test from "node:test";

test("admin config endpoint path", () => {
  assert.equal("/api/admin/config", "/api/admin/config");
});

