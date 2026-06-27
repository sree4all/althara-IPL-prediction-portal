import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_STAGE_SCORING } from "@/lib/fifa/stages";
import { winnerPointsDelta } from "@/lib/scoring/stage-scoring";

const stageMap = new Map(
  DEFAULT_STAGE_SCORING.map((row) => [
    row.stage_slug,
    {
      season_year: 2026,
      stage_slug: row.stage_slug,
      correct_points: row.correct_points,
      incorrect_points: row.incorrect_points,
    },
  ]),
);

test("group stage awards +2 for correct winner and 0 for wrong", () => {
  const group = stageMap.get("group")!;
  assert.equal(winnerPointsDelta("Brazil", "Brazil", group), 2);
  assert.equal(winnerPointsDelta("Brazil", "Argentina", group), 0);
});

test("knockout stages apply negative points for wrong winner", () => {
  const r32 = stageMap.get("r32")!;
  const final = stageMap.get("final")!;
  assert.equal(winnerPointsDelta("Brazil", "Brazil", r32), 3);
  assert.equal(winnerPointsDelta("Brazil", "Argentina", r32), -1);
  assert.equal(winnerPointsDelta("Draw", "Draw", final), 20);
  assert.equal(winnerPointsDelta("Brazil", "Draw", final), -10);
});

test("winner comparison trims whitespace", () => {
  const group = stageMap.get("group")!;
  assert.equal(winnerPointsDelta(" Brazil ", "Brazil", group), 2);
});
