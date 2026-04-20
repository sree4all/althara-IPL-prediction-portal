-- Set tournament answer lock for 2026 to 2026-04-25 15:00:00 IST (09:30:00 UTC)

insert into public.tournament_config (season_year, answer_lock_utc, updated_at)
values (2026, '2026-04-25T09:30:00Z'::timestamptz, now())
on conflict (season_year)
do update set
  answer_lock_utc = excluded.answer_lock_utc,
  updated_at = now();
