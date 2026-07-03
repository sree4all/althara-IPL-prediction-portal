-- Round of 16: apply confirmed fixtures M89–M94 (teams, venues, kickoffs).
-- Paste into Supabase SQL editor. Run the preview SELECT first, then begin … commit.
--
-- Confirmed as of 3 Jul 2026. M95–M96 remain bracket placeholders until M86–M88 conclude.
-- Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

-- Preview current state
select
  match_number,
  external_key,
  home_team,
  away_team,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist,
  venue_label,
  status
from public.matches
where match_number between 89 and 96
   or external_key ~ '^WC26-M(8[9]|9[0-6])$'
order by match_number;

begin;

update public.matches m
set
  home_team = v.home_team,
  away_team = v.away_team,
  home_team_display = v.home_team,
  away_team_display = v.away_team,
  external_team_home_id = v.home_team_id,
  external_team_away_id = v.away_team_id,
  venue_label = v.venue_label,
  match_time_utc = v.match_time_utc,
  updated_at = now()
from (
  values
    (
      89,
      'Paraguay',
      'France',
      14,
      33,
      ' — Lincoln Financial Field',
      '2026-07-04 21:00:00+00'::timestamptz
    ),
    (
      90,
      'Canada',
      'Morocco',
      5,
      10,
      ' — NRG Stadium',
      '2026-07-04 22:00:00+00'::timestamptz
    ),
    (
      91,
      'Brazil',
      'Norway',
      9,
      36,
      ' — MetLife Stadium',
      '2026-07-06 00:00:00+00'::timestamptz
    ),
    (
      92,
      'Mexico',
      'England',
      1,
      45,
      ' — Estadio Azteca',
      '2026-07-06 06:00:00+00'::timestamptz
    ),
    (
      93,
      'Portugal',
      'Spain',
      41,
      29,
      ' — AT&T Stadium',
      '2026-07-07 00:00:00+00'::timestamptz
    ),
    (
      94,
      'USA',
      'Belgium',
      13,
      25,
      ' — Lumen Field',
      '2026-07-07 00:00:00+00'::timestamptz
    )
) as v (
  match_number,
  home_team,
  away_team,
  home_team_id,
  away_team_id,
  venue_label,
  match_time_utc
)
where m.match_number = v.match_number
   or m.external_key = 'WC26-M' || v.match_number::text;

commit;

-- Verify
select
  match_number,
  external_key,
  home_team,
  away_team,
  external_team_home_id,
  external_team_away_id,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist,
  venue_label,
  tournament_stage,
  stage_key,
  status
from public.matches
where match_number between 89 and 96
   or external_key ~ '^WC26-M(8[9]|9[0-6])$'
order by match_number;
