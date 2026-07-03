-- Operator: replace Round of 16 bracket placeholders (matches 89–96) with confirmed teams.
-- Paste into Supabase SQL editor after Round of 32 concludes and FIFA publishes fixtures.
--
-- Confirmed as of 3 Jul 2026 (M95–M96 still depend on M86–M88 winners).
-- Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

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
    (89, 'Paraguay', 'France'),
    (90, 'Canada', 'Morocco'),
    (91, 'Brazil', 'Norway'),
    (92, 'Mexico', 'England'),
    (93, 'Portugal', 'Spain'),
    (94, 'USA', 'Belgium')
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
where match_number between 89 and 96
   or external_key ~ '^WC26-M(8[9]|9[0-6])$'
order by match_number;
