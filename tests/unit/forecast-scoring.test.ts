import assert from "node:assert/strict";
import test from "node:test";

import {
  computeForecastScoringBreakdown,
  FORECAST_MAX_POINTS,
  FORECAST_POINTS,
  scoreForecastAnswer,
  type ForecastActuals,
} from "../../lib/scoring/forecast-scoring";

const AWARDED_AT = "2026-07-10T00:00:00.000Z";
const ANSWER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const USER_ID = "11111111-2222-3333-4444-555555555555";

const fullActuals: ForecastActuals = {
  semiFinalists: ["Brazil", "France", "Germany", "Spain"],
  finalists: ["Brazil", "Argentina"],
  winner: "Brazil",
};

test("semi-finalists are discarded and never scored", () => {
  const breakdown = computeForecastScoringBreakdown(
    {
      semi_finalist_teams: ["Brazil", "France", "Germany", "Spain"],
      finalist_teams: ["Brazil", "Argentina"],
      winner_team: "Brazil",
    },
    fullActuals,
  );

  assert.equal(breakdown.scoring.semi.scored, false);
  assert.equal(breakdown.scoring.semi.earned, 0);
  assert.equal(breakdown.scoring.semi.max, 0);
  assert.deepEqual(breakdown.scoring.semi.correct_teams, []);
  assert.deepEqual(breakdown.actuals.semi_finalists, []);
});

test("computeForecastScoringBreakdown awards 15/20 per correct pick", () => {
  const breakdown = computeForecastScoringBreakdown(
    {
      semi_finalist_teams: ["Brazil", "France", "England", "Argentina"],
      finalist_teams: ["Brazil", "France"],
      winner_team: "Brazil",
    },
    fullActuals,
  );

  assert.equal(breakdown.scoring.finalist.earned, 15);
  assert.equal(breakdown.scoring.finalist.max, 30);
  assert.deepEqual(breakdown.scoring.finalist.correct_teams, ["Brazil"]);

  assert.equal(breakdown.scoring.winner.earned, 20);
  assert.equal(breakdown.scoring.winner.correct, true);
  assert.equal(breakdown.scoring.total_earned, 35);
  assert.equal(breakdown.scoring.total_max, FORECAST_MAX_POINTS);
  assert.equal(FORECAST_MAX_POINTS, 50);
});

test("computeForecastScoringBreakdown scores only known stages", () => {
  const partialActuals: ForecastActuals = {
    semiFinalists: ["Brazil", "France", "Germany", "Spain"],
    finalists: null,
    winner: null,
  };

  const breakdown = computeForecastScoringBreakdown(
    {
      semi_finalist_teams: ["Brazil", "France", "England", "Argentina"],
      finalist_teams: ["Brazil", "France"],
      winner_team: "Brazil",
    },
    partialActuals,
  );

  assert.equal(breakdown.scoring.finalist.scored, false);
  assert.equal(breakdown.scoring.finalist.earned, 0);
  assert.equal(breakdown.scoring.winner.scored, false);
  assert.equal(breakdown.scoring.winner.earned, 0);
  assert.equal(breakdown.scoring.total_earned, 0);
});

test("scoreForecastAnswer writes ledger rows only for finalist and winner", () => {
  const rows = scoreForecastAnswer(
    {
      id: ANSWER_ID,
      user_id: USER_ID,
      semi_finalist_teams: ["Brazil", "France", "England", "Argentina"],
      finalist_teams: ["Brazil", "France"],
      winner_team: "Brazil",
    },
    fullActuals,
    AWARDED_AT,
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => ({ points_delta: r.points_delta, reason: r.reason })),
    [
      { points_delta: FORECAST_POINTS.finalist, reason: "forecast_finalist:BRAZIL" },
      { points_delta: FORECAST_POINTS.winner, reason: "forecast_winner:BRAZIL" },
    ],
  );
  assert.ok(rows.every((r) => r.user_id === USER_ID && r.source_id === ANSWER_ID));
});

test("perfect forecast earns 50 points", () => {
  const breakdown = computeForecastScoringBreakdown(
    {
      semi_finalist_teams: ["Brazil", "France", "Germany", "Spain"],
      finalist_teams: ["Brazil", "Argentina"],
      winner_team: "Brazil",
    },
    fullActuals,
  );

  assert.equal(breakdown.scoring.total_earned, 50);
});

test("no correct picks earns zero", () => {
  const breakdown = computeForecastScoringBreakdown(
    {
      semi_finalist_teams: ["England", "Argentina", "USA", "Mexico"],
      finalist_teams: ["England", "USA"],
      winner_team: "England",
    },
    fullActuals,
  );

  assert.equal(breakdown.scoring.total_earned, 0);
});
