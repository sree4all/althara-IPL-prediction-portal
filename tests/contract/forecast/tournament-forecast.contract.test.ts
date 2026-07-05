import assert from "node:assert/strict";
import test from "node:test";
import { MVP2_ROUTES } from "@/lib/types/mvp2-routes";

test("forecast API routes defined", () => {
  assert.equal(MVP2_ROUTES.FORECAST_ELIGIBILITY, "/api/forecast/eligibility");
  assert.equal(MVP2_ROUTES.FORECAST_ANSWERS, "/api/forecast/answers");
  assert.equal(MVP2_ROUTES.FORECAST_STATS, "/api/forecast/stats");
  assert.equal(MVP2_ROUTES.ADMIN_FIFA_SYNC_SCHEDULE, "/api/admin/fifa/sync-schedule");
});
