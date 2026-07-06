import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_NO_DRAW_MATCH_NUMBER,
  allowedWinnerPicks,
  isDrawAllowedForMatch,
  isMatchReadyForPredictions,
} from "@/lib/fifa/match-ready";
import { DRAW_PICK } from "@/lib/fifa/stages";

test("draw allowed for group-stage fixtures before match 73", () => {
  assert.equal(isDrawAllowedForMatch(1), true);
  assert.equal(isDrawAllowedForMatch(72), true);
  assert.equal(isDrawAllowedForMatch(FIRST_NO_DRAW_MATCH_NUMBER - 1), true);
});

test("draw disallowed from match 73 onward (Round of 32+)", () => {
  assert.equal(isDrawAllowedForMatch(73), false);
  assert.equal(isDrawAllowedForMatch(104), false);
});

test("knockout tournament stage disallows draw when match number unknown", () => {
  assert.equal(isDrawAllowedForMatch(null, "r32"), false);
  assert.equal(isDrawAllowedForMatch(null, "final"), false);
  assert.equal(isDrawAllowedForMatch(null, "group"), true);
});

test("allowedWinnerPicks omits draw for knockout fixtures", () => {
  const picks = allowedWinnerPicks("Brazil", "Japan", 76, "r32");
  assert.deepEqual(picks, ["Brazil", "Japan"]);
});

test("allowedWinnerPicks includes draw for group fixtures", () => {
  const picks = allowedWinnerPicks("Brazil", "Japan", 12, "group");
  assert.deepEqual(picks, ["Brazil", "Japan", DRAW_PICK]);
});

test("isMatchReadyForPredictions rejects bracket placeholders and TBD", () => {
  assert.equal(isMatchReadyForPredictions("France", "Morocco"), true);
  assert.equal(isMatchReadyForPredictions("W93", "W94"), false);
  assert.equal(isMatchReadyForPredictions("France", "W90"), false);
  assert.equal(isMatchReadyForPredictions("TBD", "Spain"), false);
  assert.equal(isMatchReadyForPredictions("RU101", "RU102"), false);
});
