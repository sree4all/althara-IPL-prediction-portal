-- Ensure only one match ledger row per user per match.
-- Also cleans existing duplicates and re-syncs profile current_points for affected users.

with ranked as (
  select
    id,
    user_id,
    source_type,
    source_id,
    row_number() over (
      partition by user_id, source_type, source_id
      order by awarded_at desc nulls last, id desc
    ) as rn
  from public.points_ledger
  where source_type = 'match'
),
to_delete as (
  select id, user_id
  from ranked
  where rn > 1
),
deleted as (
  delete from public.points_ledger pl
  using to_delete d
  where pl.id = d.id
  returning d.user_id
),
affected_users as (
  select distinct user_id from deleted
),
totals as (
  select
    au.user_id,
    coalesce(sum(pl.points_delta), 0) as total_points
  from affected_users au
  left join public.points_ledger pl
    on pl.user_id = au.user_id
  group by au.user_id
)
update public.profiles p
set current_points = t.total_points,
    updated_at = now()
from totals t
where p.id = t.user_id;

create unique index if not exists points_ledger_match_unique_idx
  on public.points_ledger (user_id, source_type, source_id)
  where source_type = 'match';
