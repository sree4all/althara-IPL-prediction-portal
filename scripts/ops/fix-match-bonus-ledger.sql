-- 1) Confirm config (match_bonus_points should be 2, not 22)
select season_year, match_winner_points, match_bonus_points, tournament_slot_points
from public.scoring_config
where season_year = 2026;

-- 2) Fix config if wrong
update public.scoring_config
set match_bonus_points = 2, updated_at = now()
where season_year = 2026;

-- 3) See bonus rows that are not +2 (run before recompute)
select p.display_name, pl.points_delta, pl.reason, m.external_key
from public.points_ledger pl
join public.profiles p on p.id = pl.user_id
left join public.matches m on m.id = pl.source_id
where pl.source_type = 'bonus'
  and pl.points_delta <> 2
order by p.display_name, pl.awarded_at;

-- After deploying alias-ledger fixes, use Admin → Points maintenance:
-- 1) Recompute all completed matches (cleans duplicate alias ledger rows)
-- 2) Sync leaderboard from ledger
