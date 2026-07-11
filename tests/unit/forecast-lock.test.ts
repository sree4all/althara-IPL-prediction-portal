import assert from "node:assert/strict";
import test from "node:test";
import {
  earliestQuarterFinalKickoff,
  FORECAST_LOCK_UTC,
  isForecastLocked,
  isRoundOf8Match,
} from "@/lib/fifa/forecast-lock";

test("isRoundOf8Match accepts qf stage or match numbers 97–100", () => {
  assert.equal(isRoundOf8Match({ tournament_stage: "qf", match_number: 97 }), true);
  assert.equal(isRoundOf8Match({ tournament_stage: "group", match_number: 97 }), true);
  assert.equal(isRoundOf8Match({ tournament_stage: "r16", match_number: 96 }), false);
});

test("earliestQuarterFinalKickoff picks earliest M97–M100 kickoff", () => {
  const lockAt = earliestQuarterFinalKickoff([
    { match_time_utc: "2026-07-10T19:00:00.000Z", tournament_stage: "group", match_number: 98 },
    { match_time_utc: "2026-07-09T20:00:00.000Z", tournament_stage: "group", match_number: 97 },
    { match_time_utc: "2026-07-04T17:00:00.000Z", tournament_stage: "r16", match_number: 90 },
  ]);
  assert.equal(lockAt, "2026-07-09T20:00:00.000Z");
});

test("isForecastLocked is false before lock instant and true at/after", () => {
  const lockAt = "2026-07-09T20:00:00.000Z";
  assert.equal(isForecastLocked(lockAt, new Date("2026-07-09T19:59:59.000Z")), false);
  assert.equal(isForecastLocked(lockAt, new Date("2026-07-09T20:00:00.000Z")), true);
  assert.equal(isForecastLocked(null), false);
});

test("forecast locks at the fixed deadline: Tue 14 Jul 2026 3 PM ET (19:00 UTC)", () => {
  assert.equal(FORECAST_LOCK_UTC, "2026-07-14T19:00:00.000Z");
  // One minute before the deadline the forecast is still open.
  assert.equal(
    isForecastLocked(FORECAST_LOCK_UTC, new Date("2026-07-14T18:59:00.000Z")),
    false,
  );
  // At and after the deadline it is locked.
  assert.equal(
    isForecastLocked(FORECAST_LOCK_UTC, new Date("2026-07-14T19:00:00.000Z")),
    true,
  );
  assert.equal(
    isForecastLocked(FORECAST_LOCK_UTC, new Date("2026-07-14T20:30:00.000Z")),
    true,
  );
});
