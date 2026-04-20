-- Speeds up delete/select by match id when rescoring (common filter: source_id + source_type).
create index if not exists points_ledger_source_id_source_type_idx
  on public.points_ledger (source_id, source_type);
