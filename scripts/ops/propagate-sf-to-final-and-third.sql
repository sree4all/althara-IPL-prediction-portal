-- BACKFILL ONLY — for SF results recorded before SF loser → Third Place propagation was deployed.
-- Going forward, use Admin → Complete match & score; apply-result calls propagateKnockoutWinner
-- with home/away participants so winners fill M104 and losers fill M103.
--
-- Propagate Semi-final results:
--   M104 Final:       home ← M101 winner, away ← M102 winner
--   M103 Third Place: home ← M101 loser,  away ← M102 loser
--
-- Loser = the SF participant who is not `winner` (home_team/away_team on the SF row).
-- Only fills placeholder slots (W101, RU101, TBD, etc.); skips if a real team is already set.
--
-- Preview first:
select
  tgt.match_number,
  tgt.external_key,
  tgt.home_team,
  tgt.away_team,
  sf101.winner as m101_winner,
  sf101.home_team as m101_home,
  sf101.away_team as m101_away,
  sf102.winner as m102_winner,
  sf102.home_team as m102_home,
  sf102.away_team as m102_away
from public.matches tgt
left join public.matches sf101 on sf101.external_key = 'WC26-M101'
left join public.matches sf102 on sf102.external_key = 'WC26-M102'
where tgt.external_key in ('WC26-M103', 'WC26-M104')
order by tgt.match_number;

begin;

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

create or replace function pg_temp.sf_loser(home text, away text, winner text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(winner), '') is null then null
    when trim(winner) = trim(home) then trim(away)
    when trim(winner) = trim(away) then trim(home)
    else null
  end;
$$;

-- Final M104 home ← M101 winner
update public.matches tgt
set
  home_team = sf.winner,
  home_team_display = sf.winner,
  updated_at = now()
from public.matches sf
where tgt.external_key = 'WC26-M104'
  and sf.external_key = 'WC26-M101'
  and sf.status = 'completed'
  and nullif(trim(sf.winner), '') is not null
  and pg_temp.is_bracket_placeholder(tgt.home_team);

-- Final M104 away ← M102 winner
update public.matches tgt
set
  away_team = sf.winner,
  away_team_display = sf.winner,
  updated_at = now()
from public.matches sf
where tgt.external_key = 'WC26-M104'
  and sf.external_key = 'WC26-M102'
  and sf.status = 'completed'
  and nullif(trim(sf.winner), '') is not null
  and pg_temp.is_bracket_placeholder(tgt.away_team);

-- Third Place M103 home ← M101 loser
update public.matches tgt
set
  home_team = pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner),
  home_team_display = pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner),
  updated_at = now()
from public.matches sf
where tgt.external_key = 'WC26-M103'
  and sf.external_key = 'WC26-M101'
  and sf.status = 'completed'
  and pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner) is not null
  and pg_temp.is_bracket_placeholder(tgt.home_team);

-- Third Place M103 away ← M102 loser
update public.matches tgt
set
  away_team = pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner),
  away_team_display = pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner),
  updated_at = now()
from public.matches sf
where tgt.external_key = 'WC26-M103'
  and sf.external_key = 'WC26-M102'
  and sf.status = 'completed'
  and pg_temp.sf_loser(sf.home_team, sf.away_team, sf.winner) is not null
  and pg_temp.is_bracket_placeholder(tgt.away_team);

-- Verify
select
  match_number,
  external_key,
  home_team,
  away_team,
  status
from public.matches
where external_key in ('WC26-M101', 'WC26-M102', 'WC26-M103', 'WC26-M104')
order by match_number;

-- commit;  -- uncomment after verifying the SELECT above
-- rollback;
