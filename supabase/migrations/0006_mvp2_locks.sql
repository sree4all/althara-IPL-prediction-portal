-- Tournament lock helpers.
-- Supabase SQL runner / PL parsing was treating several locals (p_season_year → "season_year", yr, etc.)
-- as relation names (42P01). This trigger uses one IF EXISTS(...) query: only NEW + real tables/columns.

create or replace function public.get_tournament_lock_utc(target_season int)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select t.answer_lock_utc
      from public.tournament_config t
      where t.season_year = target_season
      limit 1
    ),
    (select min(m.match_time_utc) from public.matches m)
  );
$$;

create or replace function public.enforce_tournament_answer_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.tournament_questions tq
    cross join lateral (
      select public.get_tournament_lock_utc(tq.season_year) as lock_utc
    ) x
    where tq.id = NEW.question_id
      and x.lock_utc is not null
      and now() > x.lock_utc
  ) then
    raise exception 'TOURNAMENT_ANSWERS_LOCKED' using errcode = 'P0001';
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists tournament_answers_lock_biu on public.tournament_answers;
create trigger tournament_answers_lock_biu
  before insert or update on public.tournament_answers
  for each row execute function public.enforce_tournament_answer_lock();
