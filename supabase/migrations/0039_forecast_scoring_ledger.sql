-- Tournament Forecast scoring: extend points_ledger source_type.

alter table public.points_ledger
  drop constraint if exists points_ledger_source_type_check;

alter table public.points_ledger
  add constraint points_ledger_source_type_check
  check (source_type in ('match', 'bonus', 'tournament_question', 'forecast'));

create unique index if not exists points_ledger_forecast_unique_idx
  on public.points_ledger (user_id, source_type, source_id, reason)
  where source_type = 'forecast';
