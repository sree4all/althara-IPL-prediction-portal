import assert from "node:assert/strict";
import test from "node:test";
import { feedsFromSource } from "@/lib/fifa/bracket-map";
import { isBracketPlaceholder, teamForFeed } from "@/lib/fifa/bracket-progression";

test("R32 M73 propagates to M89 home slot", () => {
  const feeds = feedsFromSource(73);
  assert.equal(feeds[0].targetMatchNumber, 89);
  assert.equal(feeds[0].targetSlot, "home");
  assert.equal(feeds[0].kind ?? "winner", "winner");
});

test("SF M101 propagates winner to Final M104 home and loser to Third Place M103 home", () => {
  const feeds = feedsFromSource(101);
  assert.equal(feeds.length, 2);
  const finalFeed = feeds.find((f) => f.targetMatchNumber === 104);
  const thirdFeed = feeds.find((f) => f.targetMatchNumber === 103);
  assert.ok(finalFeed);
  assert.ok(thirdFeed);
  assert.equal(finalFeed!.targetSlot, "home");
  assert.equal(finalFeed!.kind ?? "winner", "winner");
  assert.equal(thirdFeed!.targetSlot, "home");
  assert.equal(thirdFeed!.kind, "loser");
});

test("SF M102 propagates winner to Final M104 away and loser to Third Place M103 away", () => {
  const feeds = feedsFromSource(102);
  assert.equal(feeds.length, 2);
  const finalFeed = feeds.find((f) => f.targetMatchNumber === 104);
  const thirdFeed = feeds.find((f) => f.targetMatchNumber === 103);
  assert.ok(finalFeed);
  assert.ok(thirdFeed);
  assert.equal(finalFeed!.targetSlot, "away");
  assert.equal(finalFeed!.kind ?? "winner", "winner");
  assert.equal(thirdFeed!.targetSlot, "away");
  assert.equal(thirdFeed!.kind, "loser");
});

test("teamForFeed returns loser for M103 when winner is home", () => {
  const loserFeed = feedsFromSource(101).find((f) => f.kind === "loser")!;
  const team = teamForFeed(loserFeed, "France", {
    homeTeam: "France",
    awayTeam: "Spain",
  });
  assert.equal(team, "Spain");
});

test("teamForFeed returns loser for M103 when winner is away", () => {
  const loserFeed = feedsFromSource(102).find((f) => f.kind === "loser")!;
  const team = teamForFeed(loserFeed, "Argentina", {
    homeTeam: "Brazil",
    awayTeam: "Argentina",
  });
  assert.equal(team, "Brazil");
});

test("teamForFeed returns winner for Final feed", () => {
  const winnerFeed = feedsFromSource(101).find((f) => (f.kind ?? "winner") === "winner")!;
  const team = teamForFeed(winnerFeed, "France", {
    homeTeam: "France",
    awayTeam: "Spain",
  });
  assert.equal(team, "France");
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

test("isBracketPlaceholder recognizes W92, RU101 and TBD", () => {
  assert.equal(isBracketPlaceholder("W92"), true);
  assert.equal(isBracketPlaceholder("RU101"), true);
  assert.equal(isBracketPlaceholder("RU102"), true);
  assert.equal(isBracketPlaceholder("TBD"), true);
  assert.equal(isBracketPlaceholder("England"), false);
});
