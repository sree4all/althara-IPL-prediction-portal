# Operator scripts — World Cup 2026 reset & import

**Production reset is operator-only.** There is no in-app control to wipe competition data.

## Preconditions

1. Take a database backup.
2. Enable maintenance mode (`tournament_config.maintenance_mode = true`) and notify participants.
3. Validate on **staging** first.

## Reset competition data

File: `reset-competition-data.sql`

Preserves `profiles` (auth-linked accounts). Removes matches, predictions, ledger, bonuses, tournament Q&A, and zeros `current_points`.

```bash
# Example: psql against staging
psql "$DATABASE_URL" -f scripts/ops/reset-competition-data.sql
```

## Import FIFA schedule

After reset, load fixtures from CSV:

```bash
npm run seed -- fifa ./docs/fifa
```

See `scripts/seed-csv.ts` and `specs/004-fifa-tournament-reset/quickstart.md`.

## Post-import

1. Confirm `stage_scoring_config` has seven rows for season 2026.
2. Re-create tournament bonus questions and match bonuses in Admin.
3. Disable maintenance mode when ready.

## Fix new user signup ("Database error saving new user")

If magic link or Google signup fails after migration `0027`, run:

```bash
# SQL Editor: scripts/ops/fix-handle-new-user.sql
```

Cause: `handle_new_user` still referenced dropped column `legacy_alias_onboarding_completed`.

## Diagnose schema (run first if SQL errors)

```bash
# SQL Editor: scripts/ops/diagnose-matches-schema.sql
```

Paste the column list if `external_key`, `match_time_utc`, or `match_number` errors appear — the app expects migrations `0027` + `0028` applied.

## Fix match metadata

If knockout rows show `group_stage` for m97–m102, or IPL `2026-DEMO*` rows remain:

```bash
# SQL Editor: scripts/ops/fix-fifa-match-data.sql
```

## Update a user's prediction (operator)

To correct or set a match-winner pick on behalf of a participant (bypasses DB lock):

```bash
# Preferred: npm script (requires .env.local with service role key)
npm run ops:update-prediction -- --user "Sumesh Raj" --match 8 --winner Australia
npm run ops:update-prediction -- --email sumesh1912@gmail.com --match 8 --winner Australia
```

Or paste `scripts/ops/update-prediction.sql` into the Supabase SQL editor and adjust the `params` CTE.

## Remove Match 73 "2A" predictions (no negative points)

If participants picked the placeholder **2A** before teams were confirmed on WC26-M73 (South Africa vs Canada), remove those predictions and ledger rows:

```bash
# SQL Editor: scripts/ops/remove-m73-2a-predictions.sql
```

Run the preview `SELECT` first, then the `begin` … `commit` block. Affected users' leaderboard totals are re-synced from the ledger.

Verify CSV expectations locally:

```bash
npx tsx scripts/verify-fifa-matches.ts
```

## Fix Round of 32 fixtures (M73–M88)

Official pairings and kickoffs are maintained in `docs/fifa/matches.csv` (sourced from [FIFA's published schedule](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums)). To push corrections to the live database **without touching matches that already have predictions**:

```bash
# Preview skipped fixtures
npm run ops:fix-r32 -- --dry-run

# Apply updates
npm run ops:fix-r32
```

Matches with any existing prediction are left unchanged (operator rule A).

**Kickoff times only (SQL):** paste `scripts/ops/fix-r32-kickoff-times.sql` into the Supabase SQL editor. Run the preview `SELECT` first, then the `begin` … `commit` block. Same prediction skip rule — only `match_time_utc` is updated.

## Fix Round of 16 fixtures (M89–M96)

Official pairings and kickoffs are maintained in `docs/fifa/matches.csv` (sourced from [FIFA's published schedule](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums)). All R16 fixtures M89–M96 confirmed; kickoffs verified against FIFA/ESPN ET schedule (4 Jul 2026).

**Recommended — single SQL paste (teams + venues + kickoffs):**

```bash
# SQL Editor: scripts/ops/update-r16-fixtures.sql
```

Run the preview `SELECT` first, then the `begin` … `commit` block.

**Alternative — CSV import (skips fixtures with predictions):**

```bash
npm run ops:fix-r16 -- --dry-run
npm run ops:fix-r16
```

**Partial SQL patches:**

- `scripts/ops/update-r16-team-names.sql` — team names only
- `scripts/ops/fix-r16-kickoff-times.sql` — kickoff times only
