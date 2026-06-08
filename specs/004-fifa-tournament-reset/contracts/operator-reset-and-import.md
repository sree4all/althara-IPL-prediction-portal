# Contract: Operator reset & FIFA import

## Access

- **Operators only** — service role key or database superuser; never exposed via participant or admin HTTP UI.
- Staging execution required before production (FR-005).

## Preconditions

1. Enable maintenance: `tournament_config.maintenance_mode = true` (optional banner text).
2. Communicate maintenance window to participants.
3. Backup database snapshot.

## Reset script contract

**Artifact**: `scripts/ops/reset-competition-data.sql`

**Order of operations** (child tables first):

1. `prediction_bonus_answers`
2. `predictions`
3. `points_ledger`
4. `tournament_answers`
5. `bonus_prompt_options` (via cascade or explicit)
6. `bonus_prompts`
7. `tournament_question_options`
8. `tournament_questions`
9. `matches`
10. `import_batches`
11. `UPDATE profiles SET current_points = 0, rank = NULL`

**Post-conditions**:

- `profiles` row count unchanged
- Competition tables empty (or zero rows except config seeds)
- No in-app endpoint performs this operation

## FIFA import command

**Command**: `npm run seed -- fifa ./docs/fifa`

**Inputs**:

- `teams.csv` — `id`, `team_name`
- `tournament_stages.csv` — `id`, `stage_name`
- `matches.csv` — `match_number`, `home_team_id`, `away_team_id`, `kickoff_at`, `stage_id`
- `host_cities.csv` — optional metadata (venue label in match label only if needed)

**Upsert key**: `external_key = WC26-M{match_number}`

**Row rules**:

- Resolve team ids to `team_name`; empty home/away allowed for placeholder knockouts
- Map `stage_id` → `tournament_stage` slug per data-model.md
- `status = scheduled`, `winner = null` on insert
- Idempotent re-run updates teams/times/stage without duplicate keys

**Errors**:

- Unknown `team_id` or `stage_id` → exit non-zero, print row id
- Invalid `kickoff_at` → skip row with error (no silent partial import)

## Post-import seeds

- Insert/update `stage_scoring_config` defaults for `season_year = 2026`
- Reset `scoring_config.tournament_slot_points` to `[2,2,2,2,2]` if row exists

## Removed operator paths

- `npm run seed -- aliases`, `legacy-predictions`, `legacy-predictions-staging` — deleted with legacy code
- Migration API routes — deleted
