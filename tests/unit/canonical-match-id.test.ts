import assert from "node:assert/strict";
import test from "node:test";
import {
  aliasIdsFromRows,
  canonicalMatchIdFromRows,
} from "@/lib/matches/canonical-match-id";

test("canonicalMatchIdFromRows prefers WC26-M{n} over legacy wc2026:m{n}", () => {
  const canonical = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const legacy = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const rows = [
    { id: canonical, external_key: "WC26-M8", match_number: null },
    { id: legacy, external_key: "wc2026:m8", match_number: 8 },
  ];

  assert.equal(canonicalMatchIdFromRows(rows, legacy), canonical);
  assert.equal(canonicalMatchIdFromRows(rows, canonical), canonical);
  assert.deepEqual(aliasIdsFromRows(rows, legacy), [canonical, legacy]);
});

test("canonicalMatchIdFromRows returns the same id when no aliases exist", () => {
  const m1 = "11111111-1111-1111-1111-111111111111";
  const rows = [{ id: m1, external_key: "WC26-M1", match_number: 1 }];

  assert.equal(canonicalMatchIdFromRows(rows, m1), m1);
  assert.deepEqual(aliasIdsFromRows(rows, m1), [m1]);
});
