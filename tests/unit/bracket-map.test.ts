import assert from "node:assert/strict";
import test from "node:test";
import { feedsFromSource, SF_EXCLUSION_GROUPS } from "@/lib/fifa/bracket-map";

test("M73 and M75 feed M89 (Canada/Morocco exclusion group)", () => {
  const f73 = feedsFromSource(73);
  const f75 = feedsFromSource(75);
  assert.equal(f73.length, 1);
  assert.equal(f75.length, 1);
  assert.equal(f73[0].targetMatchNumber, 89);
  assert.equal(f75[0].targetMatchNumber, 89);
  assert.equal(f73[0].targetSlot, "home");
  assert.equal(f75[0].targetSlot, "away");

  const group = SF_EXCLUSION_GROUPS.find((g) => g.r16_match_number === 89);
  assert.ok(group);
  assert.deepEqual(group!.feeder_r32_match_numbers, [73, 75]);
});

test("each R32 winner has a propagation target", () => {
  for (let mn = 73; mn <= 88; mn++) {
    assert.ok(feedsFromSource(mn).length >= 1, `missing feed for M${mn}`);
  }
});
