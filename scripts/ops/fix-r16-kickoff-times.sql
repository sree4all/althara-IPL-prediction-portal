-- Round of 16: fix kickoff times by team pairing (FIFA match centre).
-- Does NOT use match_number / WC26-M{n} — pairs are identified by country names.
-- match_time_utc is stored as UTC; the app displays IST and locks at kickoff.
--
-- Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

begin;

update public.matches m
set
  match_time_utc = v.match_time_utc,
  updated_at = now()
from (
  values
    ('Paraguay', 'France', '2026-07-04 21:00:00+00'::timestamptz),
    ('Canada', 'Morocco', '2026-07-04 22:00:00+00'::timestamptz),
    ('Brazil', 'Norway', '2026-07-06 00:00:00+00'::timestamptz),
    ('Mexico', 'England', '2026-07-06 06:00:00+00'::timestamptz),
    ('Portugal', 'Spain', '2026-07-07 00:00:00+00'::timestamptz),
    ('USA', 'Belgium', '2026-07-07 00:00:00+00'::timestamptz),
    ('United States', 'Belgium', '2026-07-07 00:00:00+00'::timestamptz),
    ('Argentina', 'Egypt', '2026-07-07 16:00:00+00'::timestamptz),
    ('Switzerland', 'Colombia', '2026-07-07 20:00:00+00'::timestamptz)
) as v (home_team, away_team, match_time_utc)
where trim(m.home_team) = v.home_team
  and trim(m.away_team) = v.away_team
  and m.match_time_utc is distinct from v.match_time_utc;

commit;

-- Verify (sorted by kickoff)
select
  match_number,
  home_team,
  away_team,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist
from public.matches
where (home_team, away_team) in (
  ('Paraguay', 'France'),
  ('Canada', 'Morocco'),
  ('Brazil', 'Norway'),
  ('Mexico', 'England'),
  ('Portugal', 'Spain'),
  ('USA', 'Belgium'),
  ('United States', 'Belgium'),
  ('Argentina', 'Egypt'),
  ('Switzerland', 'Colombia')
)
order by match_time_utc, home_team;
