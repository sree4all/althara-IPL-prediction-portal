-- Operator: replace Round of 32 bracket placeholders (matches 73–88) with confirmed teams.
-- Paste into Supabase SQL editor after group stage concludes and FIFA publishes fixtures.
--
-- Before: home/away are bracket codes from match_label (e.g. "2A", "1C", "3ABCDF").
-- After:  real team names from the published schedule (June 28 – July 3, 2026).

begin;

update public.matches m
set
  home_team = v.home_team,
  away_team = v.away_team,
  home_team_display = v.home_team,
  away_team_display = v.away_team,
  updated_at = now()
from (
  values
    (73, 'South Africa', 'Canada'),
    (74, 'Germany', 'Paraguay'),
    (75, 'Netherlands', 'Morocco'),
    (76, 'Brazil', 'Japan'),
    (77, 'Ivory Coast', 'Norway'),
    (78, 'France', 'Sweden'),
    (79, 'Mexico', 'Ecuador'),
    (80, 'England', 'DR Congo'),
    (81, 'United States', 'Bosnia and Herzegovina'),
    (82, 'Belgium', 'Senegal'),
    (83, 'Portugal', 'Croatia'),
    (84, 'Spain', 'Austria'),
    (85, 'Switzerland', 'Algeria'),
    (86, 'Argentina', 'Cabo Verde'),
    (87, 'Colombia', 'Ghana'),
    (88, 'Australia', 'Egypt')
) as v (match_number, home_team, away_team)
where m.match_number = v.match_number
   or m.external_key = 'WC26-M' || v.match_number::text;

commit;

-- Verify
select
  match_number,
  external_key,
  home_team,
  away_team,
  tournament_stage,
  stage_key,
  match_time_utc,
  venue_label,
  status
from public.matches
where match_number between 73 and 88
   or external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
order by match_number;
