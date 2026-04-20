-- Tab-level Season Bonuses visibility (all questions together) + transparent prediction reads

alter table public.tournament_config
  add column if not exists season_bonuses_visible_after_utc timestamptz;

alter table public.tournament_config
  add column if not exists season_bonuses_revealed_by_admin boolean not null default false;

-- Keep current behaviour: tab stays open for existing seasons after deploy
update public.tournament_config
set season_bonuses_revealed_by_admin = true
where season_bonuses_revealed_by_admin is not distinct from false;

-- Transparent prediction stats: any signed-in user may read others' picks (Prediction Stat page)
create policy "predictions_select_all_authenticated"
  on public.predictions for select
  to authenticated
  using (true);

create policy "prediction_bonus_answers_select_all_authenticated"
  on public.prediction_bonus_answers for select
  to authenticated
  using (true);
