import assert from "node:assert/strict";
import test from "node:test";
import {
  computeBracketState,
  validateForecastAnswers,
} from "@/lib/fifa/bracket-eligibility";
import { finalHalfForGroup, sfGroupForTeam } from "@/lib/fifa/bracket-map";

test("France and Spain cannot both be finalists (same semi-final / bracket half)", () => {
  // No knockout results loaded -> all 32 R32 teams alive (matches the live DB).
  const state = computeBracketState([]);

  // Both feed the left half (M97 winner vs M98 winner -> M101 semi-final), so
  // they meet in the semi-final and cannot both reach the final.
  const franceHalf = finalHalfForGroup(sfGroupForTeam("France", state.aliveTeams)!);
  const spainHalf = finalHalfForGroup(sfGroupForTeam("Spain", state.aliveTeams)!);
  assert.equal(franceHalf, "left");
  assert.equal(spainHalf, "left");

  const err = validateForecastAnswers(
    {
      semi_finalist_teams: [],
      finalist_teams: ["France", "Spain"],
      winner_team: "France",
    },
    state,
  );
  assert.equal(err, "INVALID_FINALISTS");

  // A genuine opposite-half pairing (France left, England right) is accepted.
  assert.equal(
    validateForecastAnswers(
      { semi_finalist_teams: [], finalist_teams: ["France", "England"], winner_team: "France" },
      state,
    ),
    null,
  );
});

test("England and Argentina cannot both be finalists (same bracket side)", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: [],
      finalist_teams: ["England", "Argentina"],
      winner_team: "England",
    },
    state,
  );
  assert.equal(err, "INVALID_FINALISTS");
});

test("finalists from opposite halves pass (semi-finalists ignored)", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: [],
      finalist_teams: ["Canada", "Brazil"],
      winner_team: "Brazil",
    },
    state,
  );
  assert.equal(err, null);
});

test("exactly two finalists are required", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: [],
      finalist_teams: ["Brazil"],
      winner_team: null,
    },
    state,
  );
  assert.equal(err, "INVALID_FINALISTS");
});

test("winner must be one of the two finalists", () => {
  const state = computeBracketState([]);
  const err = validateForecastAnswers(
    {
      semi_finalist_teams: [],
      finalist_teams: ["Canada", "Brazil"],
      winner_team: "France",
    },
    state,
  );
  assert.equal(err, "INVALID_WINNER");
});

test("eliminated finalist pick rejected", () => {
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
      semi_finalist_teams: [],
      finalist_teams: ["Canada", "Brazil"],
      winner_team: "Brazil",
    },
    state,
  );
  assert.equal(err, "ELIMINATED_TEAM");
});
