-- Extended FIFA match metadata (teams, venues, stages) for wc2026 imports.

alter table public.matches
  add column if not exists match_number int,
  add column if not exists season_year int,
  add column if not exists stage_key text,
  add column if not exists venue_label text,
  add column if not exists home_team_display text,
  add column if not exists away_team_display text,
  add column if not exists external_team_home_id int,
  add column if not exists external_team_away_id int,
  add column if not exists dataset_version timestamptz,
  add column if not exists kickoff_tz_offset text;

create index if not exists matches_match_number_idx on public.matches (match_number);
create index if not exists matches_season_year_idx on public.matches (season_year);
