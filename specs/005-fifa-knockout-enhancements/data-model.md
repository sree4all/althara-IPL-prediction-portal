# Data Model — FIFA Knockout Enhancements

**Feature**: `005-fifa-knockout-enhancements`  
**Base**: Extends 004 FIFA model (`matches`, `stage_scoring_config`, `tournament_config`) and MVP2/MVP3 bonus tables

## Summary of changes

| Area | Change |
|------|--------|
| `tournament_config` | Add `forecast_stats_visible` (default false) |
| `tournament_forecast_answers` | **New** — per-user forecast picks |
| `bonus_prompts` | Add `source`, `correct_points`, `incorrect_points` nullable overrides |
| `matches` | No schema change; propagation updates team name columns in place |
| Application | Bracket map in `lib/fifa/bracket-map.ts` (not DB) |

## 1) `tournament_config` (altered)

| Column | Type | Notes |
|--------|------|-------|
| `forecast_stats_visible` | boolean not null default `false` | When true, any signed-in user may open forecast aggregate stats |

Existing columns unchanged (`answer_lock_utc`, `maintenance_mode`, `mega_bonus_all_answers_visible`, etc.).

## 2) `tournament_forecast_answers` (new)

One logical forecast set per participant per season.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `season_year` | int not null | e.g. 2026 |
| `semi_finalist_teams` | text[] not null default `'{}'` | Exactly 4 team names when complete |
| `finalist_teams` | text[] not null default `'{}'` | Exactly 2 when complete |
| `winner_team` | text nullable | One team name |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique**: `(user_id, season_year)`

**Validation (application layer)**:

- Team names must exist in current bracket eligibility set.
- `semi_finalist_teams`: length 4; at most one per SF exclusion group (see research.md).
- `finalist_teams`: length 2; subset of `semi_finalist_teams`; one per final half.
- `winner_team`: ∈ `finalist_teams`.
- Writes rejected when `now() >= forecast_lock_utc` (earliest QF kickoff).

**Lock**: Not stored — derived from `matches` where `tournament_stage = 'qf'`.

## 3) `bonus_prompts` (altered)

| Column | Type | Notes |
|--------|------|-------|
| `source` | text not null default `'manual'` | `'manual'` \| `'ai_generated'` |
| `correct_points` | numeric nullable | When set with `incorrect_points`, overrides global bonus scoring |
| `incorrect_points` | numeric nullable | AI odd-match prompts: `3` and `0` |

Existing columns unchanged (`scope`, `match_id`, `prompt_text`, `correct_answer`, `input_type`, etc.).

## 4) Bracket map (application config, not DB)

Static structure in code:

```typescript
type BracketFeed = {
  sourceMatchNumber: number;      // e.g. 73
  targetMatchNumber: number;      // e.g. 89
  targetSlot: "home" | "away";    // W73 → home of M89
};

type SfExclusionGroup = {
  groupId: string;                // e.g. "sf-slot-89"
  feederR32MatchNumbers: number[]; // [73, 75]
  r16MatchNumber: number;         // 89
};

type FinalHalf = {
  halfId: "left" | "right";
  qfMatchNumbers: number[];
  sfMatchNumber: number;
};
```

**Alive set**: Teams in R32/R16 feeder matches minus losers (`matches.status = completed` and `winner` not equal team name).

## 5) `matches` (behavioral updates only)

Propagation updates on winner record:

| Field updated | When |
|---------------|------|
| `home_team`, `away_team` | Target knockout slot for winner |
| `home_team_display`, `away_team_display` | Mirror display fields if present |

Metadata sync (admin) may update:

| Field | When |
|-------|------|
| `match_number`, `match_time_utc`, `kickoff_tz_offset`, `venue_label`, `dataset_version` | FIFA CSV sync |

Must **not** overwrite `home_team`/`away_team`/`winner`/`status` in metadata-only mode.

## 6) Forecast aggregate stats (read model)

Computed query — no new table:

```sql
-- pseudo: unnest semi_finalist_teams, count per team
-- separate aggregates for finalist_teams and winner_team
-- suppress percentages when total forecast rows < 3
```

## Relationships

```text
profiles 1─* tournament_forecast_answers
tournament_config.season_year ── logical ── tournament_forecast_answers.season_year
bonus_prompts ──> matches (odd-match AI prompts)
matches (completed R32/R16) ──> drives bracket eligibility + propagation targets
```

## RLS posture

| Table | Select | Insert/Update |
|-------|--------|---------------|
| `tournament_forecast_answers` | Own row + admin all | Own row before lock; admin read-only on others’ rows |
| `tournament_config.forecast_stats_visible` | Authenticated read config snippet | Admin only |
| `bonus_prompts` | Existing policies | Admin write; AI insert via service/admin route |

Forecast **stats** endpoint uses service role or aggregated query without per-user rows when `forecast_stats_visible` or admin.

## State transitions

**Forecast answer**: empty → partial (1–3 fields) → complete → **locked** at QF kickoff (read-only).

**Match team slot**: TBD/placeholder → **propagated name** when feeder match completed → unchanged on metadata sync.

**Bonus prompt**: missing → **AI generated** (inactive or active per policy) → admin edited → scored at +3/0.

## Migration file

`supabase/migrations/0036_fifa_knockout_enhancements.sql`:

- `alter table tournament_config add column forecast_stats_visible ...`
- `create table tournament_forecast_answers ...`
- `alter table bonus_prompts add column source, correct_points, incorrect_points`
- RLS policies for forecast answers
- Grants per `0025` pattern
