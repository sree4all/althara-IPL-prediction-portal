-- Operator: upsert a user's match-winner prediction (bypasses prediction lock).
-- Paste into Supabase SQL editor. Adjust the variables in the first CTE as needed.
--
-- Example: Sumesh Raj → Australia for match 8 (Australia vs Türkiye)

begin;

select set_config('ipl.bypass_prediction_lock', 'on', true);

with params as (
  select
    'Sumesh Raj'::text as display_name,
    'sumesh1912@gmail.com'::text as email,
    8::int as match_number,
    'Australia'::text as predicted_winner
),
target_user as (
  select p.id, p.display_name, p.email
  from public.profiles p, params x
  where lower(trim(p.email)) = lower(trim(x.email))
     or lower(trim(p.display_name)) = lower(trim(x.display_name))
  limit 1
),
target_match as (
  select m.id, m.external_key, m.match_number, m.home_team, m.away_team
  from public.matches m, params x
  where m.match_number = x.match_number
     or m.external_key in (
       'WC26-M' || x.match_number::text,
       'wc2026:m' || x.match_number::text,
       'M' || x.match_number::text
     )
  order by case m.external_key when 'WC26-M' || x.match_number::text then 0 else 1 end
  limit 1
)
insert into public.predictions (user_id, match_id, predicted_winner, bonus_pick, updated_at)
select tu.id, tm.id, x.predicted_winner, null, now()
from params x
cross join target_user tu
cross join target_match tm
on conflict (user_id, match_id) do update
  set predicted_winner = excluded.predicted_winner,
      bonus_pick = excluded.bonus_pick,
      updated_at = excluded.updated_at;

select set_config('ipl.bypass_prediction_lock', '', true);

-- Verify
select
  pr.display_name,
  pr.email,
  m.match_number,
  m.external_key,
  m.home_team,
  m.away_team,
  p.predicted_winner,
  p.updated_at
from public.predictions p
join public.profiles pr on pr.id = p.user_id
join public.matches m on m.id = p.match_id
where (
    lower(trim(pr.email)) = 'sumesh1912@gmail.com'
    or lower(trim(pr.display_name)) = 'sumesh raj'
  )
  and m.match_number = 8;

commit;
