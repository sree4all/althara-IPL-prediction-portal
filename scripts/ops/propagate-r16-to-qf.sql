-- BACKFILL ONLY — for R16 results recorded before bracket propagation was deployed.
-- Going forward, use Admin → Complete match & score; apply-result calls propagateKnockoutWinner.
--
-- Propagate Round of 16 winners into Quarter-final slots (M97–M100).
-- Uses canonical external_key WC26-M{n} for lookups (reliable even when match_number was null).
-- Only fills placeholder slots (W89, TBD, etc.); skips if a real team is already set.
--
-- Bracket map (lib/fifa/bracket-map.ts):
--   M97: home ← M89, away ← M90
--   M98: home ← M93, away ← M94
--   M99: home ← M91, away ← M92
--  M100: home ← M95, away ← M96
--
-- Preview first:
select
  qf.match_number as qf,
  qf.external_key,
  qf.home_team,
  qf.away_team,
  w_home.external_key as home_src,
  w_home.winner as home_winner,
  w_away.external_key as away_src,
  w_away.winner as away_winner
from public.matches qf
left join public.matches w_home
  on w_home.external_key = case qf.match_number
    when 97 then 'WC26-M89'
    when 98 then 'WC26-M93'
    when 99 then 'WC26-M91'
    when 100 then 'WC26-M95'
  end
left join public.matches w_away
  on w_away.external_key = case qf.match_number
    when 97 then 'WC26-M90'
    when 98 then 'WC26-M94'
    when 99 then 'WC26-M92'
    when 100 then 'WC26-M96'
  end
where qf.external_key in ('WC26-M97', 'WC26-M98', 'WC26-M99', 'WC26-M100')
order by qf.match_number;

begin;

-- Helper: placeholder team label (W89, TBD, empty, etc.)
create or replace function pg_temp.is_bracket_placeholder(team text)
returns boolean
language sql
immutable
as $$
  select coalesce(trim(team), '') = ''
      or trim(team) ~ '^(TBD|W[0-9]+|RU[0-9]+)$'
      or trim(team) ilike 'Winner %'
      or trim(team) ilike 'Loser %';
$$;

-- M97
update public.matches qf
set
  home_team = w.winner,
  home_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M97'
  and w.external_key = 'WC26-M89'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.home_team);

update public.matches qf
set
  away_team = w.winner,
  away_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M97'
  and w.external_key = 'WC26-M90'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.away_team);

-- M98
update public.matches qf
set
  home_team = w.winner,
  home_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M98'
  and w.external_key = 'WC26-M93'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.home_team);

update public.matches qf
set
  away_team = w.winner,
  away_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M98'
  and w.external_key = 'WC26-M94'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.away_team);

-- M99
update public.matches qf
set
  home_team = w.winner,
  home_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M99'
  and w.external_key = 'WC26-M91'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.home_team);

update public.matches qf
set
  away_team = w.winner,
  away_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M99'
  and w.external_key = 'WC26-M92'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.away_team);

-- M100
update public.matches qf
set
  home_team = w.winner,
  home_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M100'
  and w.external_key = 'WC26-M95'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.home_team);

update public.matches qf
set
  away_team = w.winner,
  away_team_display = w.winner,
  updated_at = now()
from public.matches w
where qf.external_key = 'WC26-M100'
  and w.external_key = 'WC26-M96'
  and w.status = 'completed'
  and nullif(trim(w.winner), '') is not null
  and pg_temp.is_bracket_placeholder(qf.away_team);

commit;

-- Verify
select match_number, external_key, home_team, away_team, status
from public.matches
where external_key in ('WC26-M97', 'WC26-M98', 'WC26-M99', 'WC26-M100')
order by match_number;
