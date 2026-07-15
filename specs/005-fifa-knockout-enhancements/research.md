# Research — FIFA Knockout Enhancements

**Feature**: `005-fifa-knockout-enhancements`  
**Date**: 2026-07-05

## 1. Tournament Forecast storage (vs reusing `tournament_questions`)

**Decision**: Add dedicated `tournament_forecast_answers` table (one row per `user_id` + `season_year`) with JSONB or text-array columns for `semi_finalist_teams` (length 4), `finalist_teams` (length 2), `winner_team` (length 1), plus `updated_at`. Do **not** overload MVP2 `tournament_questions` / `tournament_answers` — those serve flat season bonus slots with different UX and scoring history.

**Rationale**: Forecast requires linked multi-select validation, bracket-derived eligibility, and a separate nav tab; cramming into five generic question slots would complicate admin and participant flows.

**Alternatives considered**:
- Three `tournament_questions` rows with custom UI — reuses tables but loses atomic save and bracket coupling.
- Store as three separate normalized answer rows — workable but harder to validate cross-field constraints atomically.

## 2. Bracket map source and exclusion groups

**Decision**: Encode a static **bracket graph** in `lib/fifa/bracket-map.ts` generated from `docs/fifa/matches.csv` placeholders (`W73`, `W89`, etc.):

| Layer | Match numbers | Feeds |
|-------|---------------|-------|
| R32 | 73–88 | R16 89–96 |
| R16 | 89–96 | QF 97–100 |
| QF | 97–100 | SF 101–102 |
| SF | 101–102 | Final 104 (winners); Third Place 103 (losers) |

**Semi-finalist exclusion**: For each R16 fixture (e.g. M89 = W73 vs W75), teams reachable from feeder R32 matches `{73, 75}` form one **SF slot group** — at most one selected semi-finalist from that group. Example: Canada (M73) and Morocco (M75) are mutually exclusive for SF picks because only one advances from M89.

**Finalist halves**: QF pairs `{97,98}` and `{99,100}` feed SF `{101}` and `{102}` respectively; finalists must be one from each SF branch (one from `{101 feeders}`, one from `{102 feeders}` among user’s SF set).

**Alive teams**: Union of winners from completed R32/R16 matches (from `matches.winner`) pruned from eligibility; teams not yet eliminated remain selectable.

**Rationale**: Matches spec examples (Canada/Morocco); deterministic; unit-testable without DB.

**Alternatives considered**:
- Parse placeholders dynamically from DB each request — fragile if labels change.
- DB table `bracket_edges` — overkill for fixed 2026 draw; can migrate later if draw changes.

## 3. Forecast lock instant

**Decision**: Compute lock as `MIN(match_time_utc)` where `tournament_stage = 'qf'` and `season_year = 2026`. Cache in API response; recompute on schedule sync. No separate admin-configured lock column in v1.

**Rationale**: Spec ties lock to first quarter-final kickoff; schedule sync may move it.

**Alternatives considered**:
- Store `forecast_lock_utc` on `tournament_config` — requires manual refresh on CSV update.

## 4. Forecast statistics visibility

**Decision**: Add `tournament_config.forecast_stats_visible boolean NOT NULL DEFAULT false`. Stats API checks flag OR admin role. Nav link to `/forecast/stats` hidden for non-admins when false.

**Rationale**: Mirrors existing `mega_bonus_all_answers_visible` pattern (migration `0023`).

**Alternatives considered**:
- Reuse mega bonus flag — wrong product surface; spec requires independent toggle.

## 5. Hide community picks until kickoff

**Decision**: Enforce in **API routes** (`/api/community-picks`, `/api/prediction-stat/by-match`) — not RLS rollback. Before `match_time_utc`, non-admin responses include only the requesting user’s row (or empty others). Admins (`profiles.role = admin`) receive full list. After kickoff, existing transparent behavior.

**Rationale**: Migration `0034` opened RLS for prediction-stat transparency; reverting RLS would break admin/service reads. Application-layer gate satisfies FR-011/012/013 while keeping admin tooling simple.

**Alternatives considered**:
- Time-based RLS policy — Postgres `now()` in policy is awkward for testing and admin bypass.
- Hide in UI only — insufficient (FR-019 API exposure).

## 6. Knockout winner propagation

**Decision**: After `apply-result` saves winner, call `propagateKnockoutWinner(supabase, matchNumber, winnerTeamName, seasonYear, { homeTeam, awayTeam })` which:

1. Looks up bracket map entries for source match number (`kind`: `winner` default, or `loser` for SF → M103).
2. For each feed, resolves the team to write (winner, or the other participant for loser feeds).
3. Updates `matches.home_team` / `away_team` (and display columns) on target row by `external_key`.
4. Returns `{ updated: [...], conflicts: [...] }` if slot already holds a different non-TBD/RU team.

Skip propagation for group-stage matches. Use team **name** strings to match existing `matches` model. SF losers replace `RU101`/`RU102` on Third Place (M103) while winners fill Final (M104).

**Rationale**: Spec FR-014; FIFA CSV uses `W{n}` / `RU{n}` placeholders resolved at import — propagation replaces TBD/placeholder with actual team names.

**Alternatives considered**:
- Re-import full CSV after each result — would overwrite manual fixes and conflict with partial knowledge.

## 7. Official schedule sync (metadata-only)

**Decision**: Extend `importFifaMatches` with `mode: 'metadata' | 'full'` (default `full`). Metadata mode upserts only: `match_number`, `match_time_utc`, `kickoff_tz_offset`, `venue_label`, `dataset_version` — **does not** overwrite `home_team`/`away_team`/`winner`/`status`. Admin route `POST /api/admin/fifa/sync-schedule` reads `./docs/fifa` (or uploaded CSV path in future) and runs metadata sync.

**Rationale**: FR-015; operators refresh kickoffs when FIFA reschedules without clobbering propagated teams.

**Alternatives considered**:
- Full upsert always — breaks FR-014 propagated names.

## 8. AI-generated odd-match bonuses

**Decision**:

- **Trigger**: On admin page load cron is out of scope; use **admin action** “Generate missing odd bonuses” plus optional `scripts/generate-odd-match-bonuses.ts` for ops. On generation, find `matches` where `match_number % 2 === 1`, `match_number > deployment_cutoff`, no active `bonus_prompts` row.
- **Provider**: Server route calls LLM via env `OPENAI_API_KEY` (or existing project AI integration); prompt includes home/away, stage, match number; response schema: `question`, `options[]` (3–5 sensible choices).
- **Storage**: Insert `bonus_prompts` with `scope = 'match'`, `source = 'ai_generated'`, `correct_points = 3`, `incorrect_points = 0`, `input_type = 'single_choice'`, plus `bonus_prompt_options`.
- **Guardrails**: Reject empty/offensive output; max option length; must reference match teams or stage.

**Rationale**: FR-016–018; admin edit path reuses existing Bonus Points Settings panel.

**Alternatives considered**:
- Hard-coded template questions — does not meet “AI generated” requirement.
- Auto-generate on every deploy — risks duplicate prompts; admin batch is safer.

## 9. Flat +3 bonus scoring

**Decision**: Add nullable `bonus_prompts.correct_points` and `bonus_prompts.incorrect_points`. When both non-null, `applyMatchScoring` uses them instead of global `scoring_config.match_bonus_points`; incorrect branch still inserts 0 delta (not negative).

**Rationale**: FR-018 without changing global default (2) for legacy prompts.

**Alternatives considered**:
- Global config switch — cannot mix M31 (2 pts) with new odd-match (3 pts).

## 10. Navigation and tab placement

**Decision**: New primary nav item **Tournament Forecast** → `/forecast`. Stats sub-route `/forecast/stats` (or tab within forecast page). Admin toggle in **Tournament Settings** tab alongside existing visibility flags. Schedule sync button in **Tournament Settings**.

**Rationale**: FR-001 separate tab; aligns with 004 admin-tabs contract.

## 11. Constitution / gates

**Decision**: Same as 004 — placeholder constitution; gates from specify-rules.

**Unresolved NEEDS CLARIFICATION**: None.
