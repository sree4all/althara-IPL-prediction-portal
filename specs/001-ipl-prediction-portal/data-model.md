# Data Model — IPL Prediction Portal

**Branch**: `001-ipl-prediction-portal`  
**Storage**: Supabase PostgreSQL

## Entity relationship (conceptual)

```text
auth.users (Supabase) 1 — 1 profiles
profiles 1 — * predictions
matches 1 — * predictions
```

## Tables

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK, FK → `auth.users(id)` | Same as auth user. |
| `email` | `text` | Denormalized from auth for admin queries / seed matching (optional if always joined from auth). |
| `display_name` | `text` | Public name; default from CSV **tally name** when migrated (FR-007, FR-008). |
| `legacy_points` | `numeric` or `integer` | From migration. |
| `current_points` | `numeric` or `integer` | Updated as season progresses. |
| `rank` | `integer` nullable | Cached rank for leaderboard; recompute via job or view. |
| `created_at` | `timestamptz` | UTC. |
| `updated_at` | `timestamptz` | UTC. |

**Rules**: One profile per user; create on first sign-in (trigger) or upsert after migration match.

### `matches`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `external_key` | `text` unique nullable | e.g. sheet `M1`, `M2` for idempotent imports. |
| `home_team` | `text` | |
| `away_team` | `text` | |
| `match_time_utc` | `timestamptz` | Canonical instant; **GMT/UTC** (FR-001, FR-002). |
| `winner` | `text` nullable | Team code or name when finalized. |
| `bonus_result` | `text` nullable | If sheet uses bonus column (e.g., date/code). |
| `status` | `text` | e.g. `scheduled`, `live`, `completed`, `abandoned`, `cancelled`. |

### `predictions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `profiles(id)` | Same as `auth.users`. |
| `match_id` | `uuid` FK → `matches(id)` | |
| `predicted_winner` | `text` | |
| `bonus_pick` | `text` nullable | |
| `updated_at` | `timestamptz` | UTC; bump on each upsert. |

**Constraints**: `UNIQUE (user_id, match_id)`.

**Lock rule (application + DB)**: Allow insert/update only if `now_utc <= match.match_time_utc - interval '30 minutes'`. Implement in RPC or server action after reading `match_time_utc`.

### `import_batches` (optional, operator audit)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `source` | `text` | e.g. `predictions_csv`, `settings_csv`. |
| `created_at` | `timestamptz` | |
| `row_count` | `integer` | |
| `error_log` | `jsonb` nullable | Skipped rows, validation errors. |

## Row Level Security (summary)

- **`profiles`**: Users `SELECT` all (for leaderboard) or restrict PII per product decision; users `UPDATE` only own row for `display_name` if allowed later.
- **`matches`**: `SELECT` for authenticated users; `INSERT/UPDATE` service role or admin only.
- **`predictions`**: `SELECT/INSERT/UPDATE/DELETE` only `auth.uid() = user_id`; server-side lock enforced in RPC/trusted path.

## Views / materialized (optional)

- `leaderboard_v`: `profiles` ordered by `current_points` desc, `legacy_points` desc tie-break, with `rank()` window.

## State transitions

- **Match**: `scheduled` → `live` → `completed` | `abandoned` | `cancelled` (per operations).
- **Prediction**: mutable until lock instant; after lock, no updates (enforce in DB policy + trigger or only via service role).
