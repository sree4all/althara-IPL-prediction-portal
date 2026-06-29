import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMatchTeamsLabel, formatMatchTeamsWithStage } from "@/lib/matches/match-display-label";

test("match display label omits fixture codes", () => {
  assert.equal(formatMatchTeamsLabel("Brazil", "Japan"), "Brazil vs Japan");
  assert.equal(
    formatMatchTeamsWithStage("Brazil", "Japan", "r32"),
    "Brazil vs Japan · Round of 32",
  );
});
