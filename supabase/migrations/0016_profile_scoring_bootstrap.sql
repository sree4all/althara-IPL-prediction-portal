-- One-time score bootstrap marker for newly created profiles

alter table public.profiles
  add column if not exists scoring_bootstrapped_at timestamptz;
