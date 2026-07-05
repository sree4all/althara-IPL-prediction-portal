import assert from "node:assert/strict";
import test from "node:test";
import { feedsFromSource } from "@/lib/fifa/bracket-map";

test("R32 M73 propagates to M89 home slot", () => {
  const feeds = feedsFromSource(73);
  assert.equal(feeds[0].targetMatchNumber, 89);
  assert.equal(feeds[0].targetSlot, "home");
});

test("SF M101 propagates to M104 home slot", () => {
  const feeds = feedsFromSource(101);
  assert.equal(feeds[0].targetMatchNumber, 104);
  assert.equal(feeds[0].targetSlot, "home");
});
