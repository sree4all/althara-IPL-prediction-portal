-- Predictions lock at kickoff (match_time_utc), not 30 minutes before.

create or replace function public.enforce_prediction_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('ipl.bypass_prediction_lock', true), '') = 'on' then
    new.updated_at := coalesce(new.updated_at, now());
    return new;
  end if;
  if not exists (select 1 from public.matches where id = new.match_id) then
    raise exception 'match not found';
  end if;
  if now() > (
    select match_time_utc
    from public.matches
    where id = new.match_id
  ) then
    raise exception 'MATCH_LOCKED' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
