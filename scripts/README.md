# Operator scripts

## Environment

Seeding needs the **service role** (server only; never ship to browsers):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Put them in `.env.local` (see `.env.local.example`), then run commands from the **repository root**. The seed script loads `.env` then `.env.local` automatically (same idea as Next.js).

---

## Quick local testing (`seed:demo`)

Loads **sample matches**, **MVP2 tournament config + 5 questions + one demo bonus prompt**, and **sample legacy aliases** (no real emails required).

```bash
npm run seed:demo
```

Then:

1. `npm run dev` → sign in with **Google** (or email) once so `profiles` + `auth.users` exist.
2. Open **Matches** — you should see `2026-DEMO1` … `2026-DEMO4` with start times in May 2026 (adjust CSV if your “today” is past those dates).
3. Open **History** / save a prediction to confirm API + RLS.
4. **Admin** (`/admin`): set a real `answer_lock_utc` when you are done testing (demo uses year 2099 so tournament answers stay open).

To refresh demo fixtures, run `npm run seed:demo` again (upserts are idempotent where unique keys exist).

---

## Google Sheet → database onboarding

### 1) Fixtures (schedule)

From your sheet, export a tab as **CSV or TSV** (tab is auto-detected) with columns that map to our loader (first row = headers):

| Your sheet (examples) | App / seed column |
|----------------------|-------------------|
| Match id / Match no | `external_key` (or `match_number`) |
| Home | `home_team` (or `team_home`) |
| Away | `away_team` (or `team_away`) |
| Match date + time (preferred) | `match_date` (`DD/MM/YYYY`) + `match_time` (`HH:mm:ss`) parsed as **IST** and converted to UTC |
| GMT / UTC start (fallback) | `match_time_utc` (**ISO 8601 UTC**, e.g. `2026-05-10T14:00:00Z`) **or** `GMT Match Time` as `DD/MM/YYYY HH:mm:ss` interpreted as UTC |
| Status (optional) | `match_status` or `status` — `COMPLETED`, `ABANDONED…`, empty → scheduled |
| Winner (optional) | `result_winner` or `winner` — team code when completed; abandon text → `abandoned`, no winner |
| Bonus letter (optional) | `result_bonus` or `bonus_result` — stored as `bonus_result` on completed rows only |

**Repo schedule + completed results:** `docs/matches.csv` is the canonical IPL 2026 sheet export (tab-separated, includes finished matches for UI/scoring demos).

```bash
npm run seed:ipl2026
```

Same file explicitly:

```bash
npm run seed -- matches ./docs/matches.csv
```

For a minimal comma CSV without the GMT column, use **ISO 8601 UTC** only. Rows must be **strictly more than 30 minutes before start** to allow predictions on scheduled games.

**Results & scoring:** `matches.winner` and `matches.bonus_result` are what the app compares to saved picks (see **History** / leaderboard reads). They are set by **fixture import** (`npm run seed -- matches …` from your sheet) or manual SQL/Table Editor in Supabase. There is **no** automatic job in this repo that inserts `points_ledger` rows when you update a winner; add ledger entries or recompute `profiles.current_points` yourself if you use the ledger for scoring.

### 2) Legacy display names + points (needs email)

`profiles` rows are created when users **sign in** (Supabase Auth). The seed script **cannot** create auth users from a sheet; it only **updates** existing profiles by **email**.

Export a CSV with:

| Column | Alternates |
|--------|------------|
| `email` | `Email` |
| `display_name` | `name`, `participant` (tally display name) |
| `legacy_points` | `legacy`, `points` |

```bash
npm run seed -- profiles ./path/to/tally-export.csv
```

**Rule:** every row must use the **same email** the person uses in Google (or magic link). Rows without a matching signed-up profile are skipped (check console for errors).

### 3) Legacy names without a stable email (aliases)

For tally names that need a **claim** flow in the app:

| Column | Notes |
|--------|--------|
| `season_label` | e.g. `2025` |
| `legacy_name` | exact name from the old tally |
| `legacy_email` | optional if you have it |

```bash
npm run seed -- aliases ./path/to/aliases.csv
```

Participants with **no** pre-matched row can pick an unclaimed alias in the UI (if you enabled MVP2 migrations).

### 4) Legacy predictions (Google Form export)

Tab-separated export like `docs/predictions_so_far.csv`: uses **Name**, **Select the match** (parses `M1`, …), **Winner Prediction**, **Bonus Question Answer**. Each `(person, match)` keeps the **latest** row by **Submitted at**.

Exports often include hundreds of **empty tab rows** at the bottom; those are counted as `blank_padding`, not `no_name`.

**Seamless path (load before anyone signs in):** apply migration `0010_legacy_prediction_staging.sql`, then import into **staging** (no `user_id` required). When a user claims their alias in the app, staged rows for that name + `season_label` are copied into **`predictions`**.

```bash
npm run seed -- legacy-predictions-staging ./docs/predictions_so_far.csv 2026
```

**After users exist (claimed alias or display name):** direct import into **`predictions`**:

```bash
npm run seed -- legacy-predictions ./docs/predictions_so_far.csv 2026
```

Optional **`--display-name`** (anywhere in the args): also match **Name** to `profiles.display_name` (normalized) when no claimed alias exists—useful for a dev import after people have signed in but before everyone has claimed. Claimed-alias matches still win if both exist.

```bash
npm run seed -- legacy-predictions ./docs/predictions_so_far.csv 2026 --display-name
```

The `season_label` argument is `legacy_aliases.season_label` (default **`2026`** if you omit it or pass only `--display-name`). Rows with no user mapping are reported as `no_user_mapping`.

### 5) Suggested order

1. Apply all SQL migrations in `supabase/migrations/` (MVP1 then MVP2).
2. `npm run seed -- matches ./your-schedule.csv` (or `npm run seed:demo`).
3. Have each player **sign in once**.
4. `npm run seed -- profiles ./your-tally.csv`.
5. `npm run seed -- aliases ./optional-aliases.csv` (same `season_label` you will use below).
6. After players **claim** aliases in the app: `npm run seed -- legacy-predictions ./docs/predictions_so_far.csv <season_label>`.
7. (Optional) In Supabase SQL: `update public.profiles set role = 'admin' where id = '<uuid>';` then use `/admin` for locks and prompts.

---

## Commands reference

```bash
npm run seed -- matches ./matches.csv
npm run seed -- matches ./docs/matches.csv
npm run seed -- profiles ./profiles.csv
npm run seed -- aliases ./legacy-aliases.csv
npm run seed -- legacy-predictions ./docs/predictions_so_far.csv 2026
npm run seed -- legacy-predictions-staging ./docs/predictions_so_far.csv 2026
npm run seed:demo
npm run seed:ipl2026
```

See also: `specs/002-ipl-prediction-mvp2/quickstart.md`.
