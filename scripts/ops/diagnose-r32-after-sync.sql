-- After accidental / cross-environment R32 team sync — run in Supabase SQL editor.
-- Checks predictions, kickoff times, and name variants for matches 73–88.

-- 1) Current R32 rows
select
  match_number,
  external_key,
  home_team,
  away_team,
  venue_label,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist,
  tournament_stage,
  status,
  winner
from public.matches
where season_year = 2026
  and (
    match_number between 73 and 88
    or external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
    or external_key ~ '^wc2026:m(7[3-9]|8[0-8])$'
  )
order by coalesce(match_number, 999), external_key;

-- 2) Predictions whose pick is not a current home/away team (likely broken after rename)
select
  m.match_number,
  m.external_key,
  m.home_team,
  m.away_team,
  p.predicted_winner,
  pr.display_name,
  pr.email
from public.predictions p
join public.matches m on m.id = p.match_id
join public.profiles pr on pr.id = p.user_id
where (
    coalesce(m.match_number, 0) between 73 and 88
    or m.external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
    or m.external_key ~ '^wc2026:m(7[3-9]|8[0-8])$'
  )
  and trim(p.predicted_winner) not in (m.home_team, m.away_team, 'Draw')
order by m.match_time_utc, pr.display_name;

-- 3) Placeholder / bracket-code picks still on R32 rows
select
  m.match_number,
  m.home_team || ' vs ' || m.away_team as fixture,
  p.predicted_winner,
  count(*) as picks
from public.predictions p
join public.matches m on m.id = p.match_id
where coalesce(m.match_number, 0) between 73 and 88
group by 1, 2, 3
having p.predicted_winner ~ '^[12W][A-L0-9]'
    or p.predicted_winner ~ '^3[A-Z]+$'
    or p.predicted_winner in ('2A', '2B', '1C', '2F', 'TBD')
order by 1, 3 desc;

-- 4) Kickoff mismatches — run fix-r32-kickoff-times.sql if any rows return
select
  m.match_number,
  m.home_team || ' vs ' || m.away_team as fixture,
  m.match_time_utc,
  m.match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist
from public.matches m
where coalesce(m.match_number, 0) between 73 and 88
order by m.match_time_utc;

-- 5) Duplicate fixture rows (same match_number, different teams or times)
select
  match_number,
  count(*) as rows,
  array_agg(distinct home_team || ' vs ' || away_team) as fixtures,
  array_agg(distinct match_time_utc::text) as kickoffs
from public.matches
where match_number between 73 and 88
group by match_number
having count(*) > 1;
