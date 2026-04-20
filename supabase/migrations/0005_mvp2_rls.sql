alter table public.tournament_config enable row level security;
alter table public.tournament_questions enable row level security;
alter table public.tournament_answers enable row level security;
alter table public.bonus_prompts enable row level security;
alter table public.prediction_bonus_answers enable row level security;
alter table public.legacy_aliases enable row level security;
alter table public.points_ledger enable row level security;

create policy "tournament_config_read_authenticated"
  on public.tournament_config for select to authenticated using (true);

create policy "tournament_questions_read_authenticated"
  on public.tournament_questions for select to authenticated using (is_active = true or true);

create policy "tournament_answers_select_own"
  on public.tournament_answers for select to authenticated using (auth.uid() = user_id);
create policy "tournament_answers_insert_own"
  on public.tournament_answers for insert to authenticated with check (auth.uid() = user_id);
create policy "tournament_answers_update_own"
  on public.tournament_answers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bonus_prompts_read_authenticated"
  on public.bonus_prompts for select to authenticated using (is_active = true or true);

create policy "prediction_bonus_answers_select_own"
  on public.prediction_bonus_answers for select to authenticated using (auth.uid() = user_id);
create policy "prediction_bonus_answers_insert_own"
  on public.prediction_bonus_answers for insert to authenticated with check (auth.uid() = user_id);
create policy "prediction_bonus_answers_update_own"
  on public.prediction_bonus_answers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "points_ledger_select_own"
  on public.points_ledger for select to authenticated using (auth.uid() = user_id);

