-- Source fixtures were imported with start times 30 minutes early (likely lock-time values).
-- Shift only remaining scheduled fixtures so lock boundary is correctly start_time - 30 minutes.
update public.matches
set
  match_time_utc = match_time_utc + interval '30 minutes',
  updated_at = now()
where status = 'scheduled';
