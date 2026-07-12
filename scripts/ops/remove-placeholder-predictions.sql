-- Remove predictions whose predicted_winner is a bracket placeholder
-- (W{n}, RU{n}, TBD) saved before placeholder picks were blocked.
-- These can never match a real winner and would only earn negative points
-- (e.g. "W99" on M102 scores -4 even though W99 resolved to England).
-- Paste into Supabase SQL editor (service role / postgres).
--
-- Effect:
--   1. Deletes placeholder-pick predictions (no ledger rows exist while the
--      match is unscored; ledger rows are removed defensively if present)
--   2. Re-syncs profiles.current_points from the ledger for affected users
--
-- Run the preview block first, then the apply block.

-- ── Preview ───────────────────────────────────────────────────────────────────
select
  pr.display_name,
  m.match_number,
  m.external_key,
  m.home_team,
  m.away_team,
  m.status,
  p.predicted_winner,
  p.updated_at
from public.predictions p
join public.matches m on m.id = p.match_id
join public.profiles pr on pr.id = p.user_id
where trim(p.predicted_winner) ~* '^(W|RU)\d+$'
   or upper(trim(p.predicted_winner)) = 'TBD'
order by m.match_number, pr.display_name;

-- ── Apply ─────────────────────────────────────────────────────────────────────
begin;

create temp table _placeholder_preds on commit drop as
select p.id as prediction_id, p.user_id, p.match_id
from public.predictions p
where trim(p.predicted_winner) ~* '^(W|RU)\d+$'
   or upper(trim(p.predicted_winner)) = 'TBD';

delete from public.points_ledger pl
using _placeholder_preds pp
where pl.user_id = pp.user_id
  and pl.source_id = pp.match_id
  and pl.source_type = 'match';

delete from public.predictions p
using _placeholder_preds pp
where p.id = pp.prediction_id;

with ledger_totals as (
  select pl.user_id, coalesce(sum(pl.points_delta), 0)::int as total
  from public.points_ledger pl
  group by pl.user_id
)
update public.profiles pr
set
  current_points = coalesce(lt.total, 0),
  updated_at = now()
from (select distinct user_id from _placeholder_preds) au
left join ledger_totals lt on lt.user_id = au.user_id
where pr.id = au.user_id
  and pr.current_points is distinct from coalesce(lt.total, 0);

select count(*) as predictions_removed from _placeholder_preds;

commit;

-- ── Verify ────────────────────────────────────────────────────────────────────
select count(*) as remaining_placeholder_predictions
from public.predictions p
where trim(p.predicted_winner) ~* '^(W|RU)\d+$'
   or upper(trim(p.predicted_winner)) = 'TBD';
