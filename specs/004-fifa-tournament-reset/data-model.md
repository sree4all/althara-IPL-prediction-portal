# Data Model — FIFA Tournament Reset & Reconfiguration

**Feature**: `004-fifa-tournament-reset`  
**Base**: Extends MVP1–MVP3 models in `specs/001-ipl-prediction-portal/data-model.md`, `specs/002-ipl-prediction-mvp2/data-model.md`, `specs/003-mvp3-improvements/data-model.md`

## Summary of changes

| Area | Change |
|------|--------|
| Profiles | Drop `legacy_points`; keep `current_points` (reset to 0 on operator script) |
| Matches | Replace `knockout_stage` (IPL enum) with `tournament_stage` (FIFA slug); `winner` may be `Draw` |
| Predictions | `predicted_winner` ∈ `{home_team, away_team, Draw}` |
| Scoring | New `stage_scoring_config`; match scoring reads stage row, not flat `match_winner_points` alone |
| Legacy | Drop `legacy_aliases`, `legacy_prediction_staging`, `legacy_prediction_exclusions` |
| Removed code | Migration API routes, alias onboarding pages |

## 1) `profiles` (altered)

- **Remove**: `legacy_points`
- **Unchanged**: `id`, `email`, `display_name`, `current_points`, `role`, timestamps
- **Reset procedure**: `UPDATE profiles SET current_points = 0, rank = NULL`

## 2) `matches` (altered)

| Field | Type | Notes |
|-------|------|-------|
| `external_key` | text unique | e.g. `WC26-M1` from FIFA `match_number` |
| `home_team` | text | Resolved from `teams.csv` |
| `away_team` | text | Resolved from `teams.csv`; empty for TBD knockout placeholders |
| `match_time_utc` | timestamptz | From `kickoff_at` |
| `status` | text | `scheduled` \| `completed` |
| `winner` | text nullable | `home_team` name, `away_team` name, or literal `Draw` |
| `tournament_stage` | text not null default `group` | Slug: see enum below |
| `bonus_result` | text nullable | Unchanged |
| `scored_at` | timestamptz nullable | Unchanged |

**`tournament_stage` check constraint** (replaces `knockout_stage`):

```text
group | r32 | r16 | qf | sf | third_place | final
```

**FIFA CSV `stage_id` mapping** (from `docs/fifa/tournament_stages.csv`):

| stage_id | stage_name | tournament_stage |
|----------|------------|------------------|
| 1 | Group Stage | `group` |
| 2 | Round of 32 | `r32` |
| 3 | Round of 16 | `r16` |
| 4 | Quarterfinals | `qf` |
| 5 | Semifinals | `sf` |
| 6 | Third Place Playoff | `third_place` |
| 7 | Final | `final` |

## 3) `predictions` (validation)

- `predicted_winner`: must equal `matches.home_team`, `matches.away_team`, or `Draw`
- `bonus_pick`: deprecated for new picks; use `prediction_bonus_answers` only

## 4) `stage_scoring_config` (new)

Per-season matrix for match-winner scoring (FR-009, FR-010).

| Column | Type | Notes |
|--------|------|-------|
| `season_year` | int | FK logical to season |
| `stage_slug` | text | Same values as `matches.tournament_stage` |
| `correct_points` | numeric not null | Points for correct pick (Draw counts as correct when result is Draw) |
| `incorrect_points` | numeric not null | ≤ 0 for penalties; 0 for group |
| `updated_at` | timestamptz | |

**Primary key**: `(season_year, stage_slug)`

**Default seed (2026)**:

| stage_slug | correct | incorrect |
|------------|---------|-----------|
| group | 2 | 0 |
| r32 | 3 | -1 |
| r16 | 5 | -2 |
| qf | 8 | -3 |
| sf | 12 | -4 |
| third_place | 8 | -3 |
| final | 20 | -10 |

## 5) `scoring_config` (altered usage)

- **Retain**: `tournament_slot_points` jsonb (5 slots, default `[2,2,2,2,2]`) for season-long tournament questions (FR-011a)
- **Retain**: `match_bonus_points` for random per-match bonus prompts (FR-011)
- **Deprecate for match-winner**: `match_winner_points` — superseded by `stage_scoring_config` (column may remain for backward compat but ignored by scoring engine)

## 6) Unchanged MVP2/MVP3 entities (content wiped on reset)

- `tournament_config`, `tournament_questions`, `tournament_question_options`
- `tournament_answers`
- `bonus_prompts`, `bonus_prompt_options`, `prediction_bonus_answers`
- `points_ledger`
- `import_batches` (truncated on reset)

## 7) Dropped entities

- `legacy_aliases`
- `legacy_prediction_staging`
- `legacy_prediction_exclusions`
- `profiles.legacy_points` column

## Relationships (post-reset)

```text
profiles 1─* predictions
matches 1─* predictions
matches.tournament_stage ──> stage_scoring_config.stage_slug (same season_year)
stage_scoring_config.season_year ──> scoring_config.season_year
bonus_prompts ──> matches (optional)
points_ledger ──> profiles (source match/bonus ids)
```

## RLS posture

- `stage_scoring_config`: authenticated read; admin write (mirror `scoring_config` policies)
- Dropped tables: policies removed with table drops
- No new participant write paths on operator-only reset scripts (service role / direct SQL outside RLS)

## State transitions

**Match**: `scheduled` → `completed` when admin sets `winner` (incl. `Draw`) and triggers scoring → `scored_at` set, ledger rows inserted.

**Prediction lock**: unchanged — `match_time_utc - 30 minutes`.
