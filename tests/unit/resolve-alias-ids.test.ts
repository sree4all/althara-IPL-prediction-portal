import assert from "node:assert/strict";
import test from "node:test";
import { buildMatchAliasIndex } from "@/lib/matches/resolve-alias-ids";

test("buildMatchAliasIndex links canonical and legacy rows by fixture number", () => {
  const canonical = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const legacy = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  const index = buildMatchAliasIndex([
    { id: canonical, external_key: "WC26-M8", match_number: null },
    { id: legacy, external_key: "wc2026:m8", match_number: 8 },
  ]);

  assert.deepEqual(index.get(canonical), [canonical, legacy]);
  assert.deepEqual(index.get(legacy), [canonical, legacy]);
});

test("buildMatchAliasIndex keeps unrelated fixtures separate", () => {
  const m1 = "11111111-1111-1111-1111-111111111111";
  const m2 = "22222222-2222-2222-2222-222222222222";

  const index = buildMatchAliasIndex([
    { id: m1, external_key: "WC26-M1", match_number: 1 },
    { id: m2, external_key: "WC26-M2", match_number: 2 },
  ]);

  assert.deepEqual(index.get(m1), [m1]);
  assert.deepEqual(index.get(m2), [m2]);
});
