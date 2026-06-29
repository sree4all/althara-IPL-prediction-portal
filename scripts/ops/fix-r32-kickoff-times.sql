-- Round of 32: fix kickoff times by team pairing (FIFA scores & fixtures).
-- Does NOT use match_number / WC26-M{n} — pairs are identified by country names.
-- match_time_utc is stored as UTC; the app displays IST and locks at kickoff.
--
-- Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures

begin;

update public.matches m
set
  match_time_utc = v.match_time_utc,
  updated_at = now()
from (
  values
    ('South Africa', 'Canada', '2026-06-28 19:00:00+00'::timestamptz),
    ('Brazil', 'Japan', '2026-06-29 17:00:00+00'::timestamptz),
    ('Germany', 'Paraguay', '2026-06-29 20:30:00+00'::timestamptz),
    ('Netherlands', 'Morocco', '2026-06-30 01:00:00+00'::timestamptz),
    ('Côte d''Ivoire', 'Norway', '2026-06-30 17:00:00+00'::timestamptz),
    ('Ivory Coast', 'Norway', '2026-06-30 17:00:00+00'::timestamptz),
    ('France', 'Sweden', '2026-06-30 21:00:00+00'::timestamptz),
    ('Mexico', 'Ecuador', '2026-07-01 01:00:00+00'::timestamptz),
    ('England', 'DR Congo', '2026-07-01 16:00:00+00'::timestamptz),
    ('England', 'Congo DR', '2026-07-01 16:00:00+00'::timestamptz),
    ('Belgium', 'Senegal', '2026-07-01 20:00:00+00'::timestamptz),
    ('USA', 'Bosnia and Herzegovina', '2026-07-02 00:00:00+00'::timestamptz),
    ('United States', 'Bosnia and Herzegovina', '2026-07-02 00:00:00+00'::timestamptz),
    ('Spain', 'Austria', '2026-07-02 19:00:00+00'::timestamptz),
    ('Portugal', 'Croatia', '2026-07-02 23:00:00+00'::timestamptz),
    ('Switzerland', 'Algeria', '2026-07-03 03:00:00+00'::timestamptz),
    ('Australia', 'Egypt', '2026-07-03 18:00:00+00'::timestamptz),
    ('Argentina', 'Cabo Verde', '2026-07-03 22:00:00+00'::timestamptz),
    ('Argentina', 'Cape Verde', '2026-07-03 22:00:00+00'::timestamptz),
    ('Colombia', 'Ghana', '2026-07-04 01:30:00+00'::timestamptz)
) as v (home_team, away_team, match_time_utc)
where trim(m.home_team) = v.home_team
  and trim(m.away_team) = v.away_team
  and m.match_time_utc is distinct from v.match_time_utc;

commit;

-- Verify (sorted by kickoff — Brazil vs Japan first on 29 Jun UTC / 10:30 PM IST)
select
  home_team,
  away_team,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist
from public.matches
where (home_team, away_team) in (
  ('South Africa', 'Canada'),
  ('Brazil', 'Japan'),
  ('Germany', 'Paraguay'),
  ('Netherlands', 'Morocco'),
  ('Côte d''Ivoire', 'Norway'),
  ('Ivory Coast', 'Norway'),
  ('France', 'Sweden'),
  ('Mexico', 'Ecuador'),
  ('England', 'DR Congo'),
  ('England', 'Congo DR'),
  ('Belgium', 'Senegal'),
  ('USA', 'Bosnia and Herzegovina'),
  ('United States', 'Bosnia and Herzegovina'),
  ('Spain', 'Austria'),
  ('Portugal', 'Croatia'),
  ('Switzerland', 'Algeria'),
  ('Australia', 'Egypt'),
  ('Argentina', 'Cabo Verde'),
  ('Argentina', 'Cape Verde'),
  ('Colombia', 'Ghana')
)
order by match_time_utc, home_team;
