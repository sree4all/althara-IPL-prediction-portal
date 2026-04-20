import assert from "node:assert/strict";
import test from "node:test";

test("migration alias endpoints exist", () => {
  assert.ok("/api/migration/import-legacy");
  assert.ok("/api/migration/aliases");
  assert.ok("/api/migration/aliases/claim");
  assert.ok("/api/migration/aliases/skip-onboarding");
});

