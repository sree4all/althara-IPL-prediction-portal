import assert from "node:assert/strict";
import test from "node:test";
import { matchSeasonYearOrNullFilter } from "@/lib/fifa/match-season-filter";

test("matchSeasonYearOrNullFilter includes null season_year rows", () => {
  assert.equal(matchSeasonYearOrNullFilter(2026), "season_year.eq.2026,season_year.is.null");
});
