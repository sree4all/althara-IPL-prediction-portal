-- Leaderboard: any signed-in user may read all ledger rows to compute public standings.
-- (Previously only own rows + admin were visible, so non-admins saw everyone else at 0 pts.)

drop policy if exists "points_ledger_select_authenticated" on public.points_ledger;
create policy "points_ledger_select_authenticated"
  on public.points_ledger for select
  to authenticated
  using (true);
