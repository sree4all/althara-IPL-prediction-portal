-- Prediction Stat: any signed-in user may read all picks (transparent view).

drop policy if exists "predictions_select_all_authenticated" on public.predictions;
create policy "predictions_select_all_authenticated"
  on public.predictions for select
  to authenticated
  using (true);

drop policy if exists "prediction_bonus_answers_select_all_authenticated" on public.prediction_bonus_answers;
create policy "prediction_bonus_answers_select_all_authenticated"
  on public.prediction_bonus_answers for select
  to authenticated
  using (true);
