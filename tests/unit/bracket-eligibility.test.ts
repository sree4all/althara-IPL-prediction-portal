import assert from "node:assert/strict";
import test from "node:test";
import {
  computeBracketState,
  validateForecastAnswers,
} from "@/lib/fifa/bracket-eligibility";

test("Canada and Morocco cannot both be semi-finalists", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: ["Canada", "Morocco", "Brazil", "France"],
      finalist_teams: [],
      winner_team: null,
    },
    state,
  );
  assert.equal(err, "INVALID_SEMI_FINALISTS");
});

test("valid semi-finalists from distinct groups pass", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: ["Canada", "Germany", "Brazil", "Argentina"],
      finalist_teams: ["Canada", "Brazil"],
      winner_team: "Brazil",
    },
    state,
  );
  assert.equal(err, null);
});

test("eliminated team rejected", () => {
  const state = computeBracketState([
    {
      match_number: 73,
      home_team: "South Africa",
      away_team: "Canada",
      winner: "South Africa",
      status: "completed",
      tournament_stage: "r32",
    },
  ]);
  assert.ok(state.eliminatedTeams.has("Canada"));
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: ["Canada", "Germany", "Brazil", "France"],
      finalist_teams: [],
      winner_team: null,
    },
    state,
  );
  assert.equal(err, "ELIMINATED_TEAM");
});
