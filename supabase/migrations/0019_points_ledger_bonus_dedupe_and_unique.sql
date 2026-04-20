-- Prevent duplicate bonus rows for the same user/match/reason combination.
-- Safe for legacy (single bonus per match) and per-prompt bonus rows (`match_bonus:<prompt_id>`).

with ranked as (
  select
    id,
    user_id,
    source_type,
    source_id,
    coalesce(reason, '') as reason_key,
    row_number() over (
      partition by user_id, source_type, source_id, coalesce(reason, '')
      order by awarded_at desc nulls last, id desc
    ) as rn
  from public.points_ledger
  where source_type = 'bonus'
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

create unique index if not exists points_ledger_bonus_unique_idx
  on public.points_ledger (user_id, source_type, source_id, reason)
  where source_type = 'bonus';
