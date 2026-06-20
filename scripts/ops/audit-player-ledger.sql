-- Run in Supabase SQL Editor to audit a player's points.
-- Replace 'Arya' with the display_name you want.

-- 1) Profile total vs ledger sum
select
  p.id,
  p.display_name,
  p.email,
  p.current_points as profile_points,
  coalesce(sum(pl.points_delta), 0) as ledger_sum,
  p.current_points - coalesce(sum(pl.points_delta), 0) as drift
from public.profiles p
left join public.points_ledger pl on pl.user_id = p.id
where p.display_name ilike 'Arya'
group by p.id, p.display_name, p.email, p.current_points;

-- 2) Every ledger line (this is where 62 must add up)
select
  pl.awarded_at,
  pl.source_type,
  pl.reason,
  pl.points_delta,
  m.external_key,
  m.home_team,
  m.away_team,
  pl.source_id
from public.points_ledger pl
join public.profiles p on p.id = pl.user_id
left join public.matches m
  on m.id = pl.source_id
  and pl.source_type in ('match', 'bonus')
where p.display_name ilike 'Arya'
order by pl.awarded_at;

-- 3) Subtotal by match (winner + bonus combined)
select
  coalesce(m.external_key, pl.source_id::text) as match_ref,
  sum(case when pl.source_type = 'match' then pl.points_delta else 0 end) as winner_pts,
  sum(case when pl.source_type = 'bonus' then pl.points_delta else 0 end) as bonus_pts,
  sum(pl.points_delta) as match_total
from public.points_ledger pl
join public.profiles p on p.id = pl.user_id
left join public.matches m
  on m.id = pl.source_id
  and pl.source_type in ('match', 'bonus')
where p.display_name ilike 'Arya'
  and pl.source_type in ('match', 'bonus')
group by coalesce(m.external_key, pl.source_id::text)
order by match_ref;

-- 4) Old season / Mega Bonus lines (should be empty after migration 0032)
select
  pl.source_type,
  pl.reason,
  pl.points_delta,
  pl.awarded_at
from public.points_ledger pl
join public.profiles p on p.id = pl.user_id
where p.display_name ilike 'Arya'
  and pl.source_type = 'tournament_question'
order by pl.awarded_at;

-- 5) Arya's predictions (what she picked)
select
  m.external_key,
  m.home_team,
  m.away_team,
  m.winner as actual_winner,
  m.status,
  pred.predicted_winner,
  pred.bonus_pick
from public.predictions pred
join public.profiles p on p.id = pred.user_id
join public.matches m on m.id = pred.match_id
where p.display_name ilike 'Arya'
order by m.match_number nulls last, m.external_key;
