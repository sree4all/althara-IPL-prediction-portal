-- Backfill matches.season_year for WC26 rows left null by the original FIFA
-- import (it fell back to a reduced payload without extended columns).
-- Forecast scoring (lib/scoring/forecast-scoring.ts) and forecast eligibility
-- (lib/fifa/forecast-data.ts) filter matches on season_year = 2026, so null
-- rows made forecast actuals resolve to nothing and no points could be paid.

update public.matches
set
  season_year = 2026,
  updated_at = now()
where season_year is null
  and external_key like 'WC26-M%';
