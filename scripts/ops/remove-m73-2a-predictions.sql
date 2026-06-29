-- Match 73 (South Africa vs Canada): remove "2A" predictions so no negative match points apply.
-- Paste into Supabase SQL editor (service role / postgres).
--
-- Effect:
--   1. Deletes predictions where predicted_winner = '2A' on fixture 73
--   2. Removes their match/bonus ledger rows for that fixture
--   3. Removes any per-match bonus answers tied to fixture 73
--   4. Re-syncs profiles.current_points from the ledger for affected users
--
-- Optional: run only the preview block first, then the apply block.

-- ── Preview ───────────────────────────────────────────────────────────────────
with m73 as (
  select id, external_key, match_number, home_team, away_team, winner, status
  from public.matches
  where match_number = 73
     or external_key in ('WC26-M73', 'wc2026:m73', 'M73')
)
select
  pr.display_name,
  pr.email,
  m.external_key,
  m.home_team,
  m.away_team,
  m.winner,
  p.predicted_winner,
  pl.source_type,
  pl.points_delta,
  pl.reason
from public.predictions p
join m73 m on m.id = p.match_id
join public.profiles pr on pr.id = p.user_id
left join public.points_ledger pl
  on pl.user_id = p.user_id
 and pl.source_id = m.id
 and pl.source_type in ('match', 'bonus')
where trim(p.predicted_winner) = '2A'
order by pr.display_name;

-- ── Apply ─────────────────────────────────────────────────────────────────────
begin;

create temp table _m73_2a_users on commit drop as
with m73 as (
  select id
  from public.matches
  where match_number = 73
     or external_key in ('WC26-M73', 'wc2026:m73', 'M73')
)
select distinct p.user_id
from public.predictions p
join m73 m on m.id = p.match_id
where trim(p.predicted_winner) = '2A';

create temp table _m73_match_ids on commit drop as
select id
from public.matches
where match_number = 73
   or external_key in ('WC26-M73', 'wc2026:m73', 'M73');

delete from public.points_ledger pl
using _m73_match_ids m, _m73_2a_users au
where pl.user_id = au.user_id
  and pl.source_id = m.id
  and pl.source_type in ('match', 'bonus');

delete from public.prediction_bonus_answers pba
using _m73_match_ids m, _m73_2a_users au
where pba.user_id = au.user_id
  and pba.match_id = m.id;

delete from public.predictions p
using _m73_match_ids m, _m73_2a_users au
where p.match_id = m.id
  and p.user_id = au.user_id
  and trim(p.predicted_winner) = '2A';

with ledger_totals as (
  select pl.user_id, coalesce(sum(pl.points_delta), 0)::int as total
  from public.points_ledger pl
  group by pl.user_id
)
update public.profiles pr
set
  current_points = coalesce(lt.total, 0),
  updated_at = now()
from _m73_2a_users au
left join ledger_totals lt on lt.user_id = au.user_id
where pr.id = au.user_id
  and pr.current_points is distinct from coalesce(lt.total, 0);

select count(*) as users_updated from _m73_2a_users;

commit;

-- ── Verify ────────────────────────────────────────────────────────────────────
select count(*) as remaining_2a_predictions_on_m73
from public.predictions p
join public.matches m on m.id = p.match_id
where trim(p.predicted_winner) = '2A'
  and (
    m.match_number = 73
    or m.external_key in ('WC26-M73', 'wc2026:m73', 'M73')
  );
