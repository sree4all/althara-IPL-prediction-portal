import assert from "node:assert/strict";
import test from "node:test";
import { feedsFromSource } from "@/lib/fifa/bracket-map";
import { isBracketPlaceholder } from "@/lib/fifa/bracket-progression";

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

test("R16 M92 propagates to M99 away slot", () => {
  const feeds = feedsFromSource(92);
  assert.equal(feeds.length, 1);
  assert.equal(feeds[0].targetMatchNumber, 99);
  assert.equal(feeds[0].targetSlot, "away");
});

test("R16 M93 propagates to M98 home slot", () => {
  const feeds = feedsFromSource(93);
  assert.equal(feeds[0].targetMatchNumber, 98);
  assert.equal(feeds[0].targetSlot, "home");
});

test("isBracketPlaceholder recognizes W92 and TBD", () => {
  assert.equal(isBracketPlaceholder("W92"), true);
  assert.equal(isBracketPlaceholder("TBD"), true);
  assert.equal(isBracketPlaceholder("England"), false);
});
