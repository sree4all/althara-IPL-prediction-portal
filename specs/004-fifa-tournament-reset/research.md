# Research — FIFA Tournament Reset & Reconfiguration

**Feature**: `004-fifa-tournament-reset`  
**Date**: 2026-05-21

## 1. FIFA stage → scoring matrix storage

**Decision**: Add `stage_scoring_config` table keyed by `(season_year, stage_slug)` with `correct_points` and `incorrect_points` numeric columns; seed seven FIFA rows per FR-010 defaults on import/reset.

**Rationale**: Current `scoring_config` only stores flat `match_winner_points` and IPL-style knockout overrides in code (`lib/knockout/scoring.ts`). A normalized per-stage table is admin-editable, auditable, and matches the clarified matrix without overloading JSON blobs.

**Alternatives considered**:
- JSONB matrix on `scoring_config` — fewer joins but weaker admin validation and harder partial updates.
- Reuse `knockout_stage` enum — IPL-specific (`q1`, `eliminator`, `q2`, `final`); cannot represent Group Stage, R32, Third Place, etc.

## 2. Match stage classification (replace IPL knockout model)

**Decision**: Replace `matches.knockout_stage` check constraint with `tournament_stage` text slug: `group`, `r32`, `r16`, `qf`, `sf`, `third_place`, `final`. Map `docs/fifa/tournament_stages.csv` `id` → slug at import time. Deprecate `lib/knockout/*` IPL bracket UI (KnockoutPanel) in favor of FIFA fixtures already in CSV.

**Rationale**: Spec requires full World Cup schedule including group play; existing knockout column and M71–M74 seeds are IPL-only.

**Alternatives considered**:
- Keep `knockout_stage` nullable for knockouts only, infer group as null — ambiguous for scoring (group vs unknown).
- Add parallel column — redundant; full replacement is cleaner after data reset.

## 3. Draw pick and result encoding

**Decision**: Use canonical literal `Draw` for both `predictions.predicted_winner` and `matches.winner` when applicable; API validates pick ∈ `{home_team, away_team, Draw}`; admin result entry offers three radio options.

**Rationale**: No schema column addition required; team names are dynamic strings so Draw must be a reserved token distinct from team names.

**Alternatives considered**:
- Nullable winner + `is_draw` flag — schema change beyond minimal validation.
- Store draw as empty winner — breaks existing `status = completed` scoring guards.

## 4. Operator data reset delivery

**Decision**: Add `scripts/ops/reset-competition-data.sql` (documented runbook in `scripts/ops/README.md`) executed manually with service role / psql; enable maintenance via existing `tournament_config.maintenance_mode` before run; no admin UI trigger.

**Rationale**: Clarified operator-only reset (Q5); matches existing `seed-csv.ts` operator tooling pattern.

**Alternatives considered**:
- Supabase RPC — still needs SQL definition; adds deploy surface without benefit.
- In-app reset — explicitly rejected in spec.

## 5. FIFA CSV import transform

**Decision**: Extend `scripts/seed-csv.ts` with `npm run seed -- fifa ./docs/fifa` that reads `teams.csv`, `tournament_stages.csv`, `host_cities.csv`, `matches.csv`; upserts `matches` with `external_key = WC26-M{n}`, resolves team names by id, sets `tournament_stage` from `stage_id`, `match_time_utc` from `kickoff_at` (normalize to UTC).

**Rationale**: Spec FR-006/007; repo already has authoritative files under `docs/fifa/`; reuses upsert-by-`external_key` pattern from IPL seed.

**Alternatives considered**:
- One-off SQL insert — harder to maintain when CSV updates.
- New standalone script — duplicates CSV parsing already in `seed-csv.ts`.

## 6. Legacy full removal scope

**Decision**: Single migration `0027_fifa_reset_legacy_and_stage_scoring.sql` drops: `legacy_aliases`, `legacy_prediction_staging`, `legacy_prediction_exclusions`, `profiles.legacy_points`; removes IPL knockout check; adds `tournament_stage`, `stage_scoring_config`. Application deletes `app/api/migration/**`, `app/login/legacy-alias/**`, welcome banner, `lib/scoring/legacy-late-exclusions.ts`, legacy seed subcommands.

**Rationale**: Clarified full removal (Q2); consolidate DDL after operator reset script truncates data.

**Alternatives considered**:
- Multi-release deprecation — contradicts spec FR-003a.

## 7. Admin tab layout

**Decision**: Use shadcn `Tabs` on `app/(app)/admin/page.tsx`: **Match Predictions** (MatchResultPanel + apply scoring), **Tournament Settings** (AdminConfigForm lock/maintenance/visibility), **Bonus Points Settings** (bonus prompts + tournament questions/options), **Scoring Configuration** (stage matrix + tournament slot points + random bonus defaults). Remove standalone KnockoutPanel and `/admin/mega-bonus-answers` link moves under Bonus tab.

**Rationale**: FR-008; reduces single-page scroll; aligns with clarified per-slot tournament scoring (Q4).

## 8. Tournament bonus flat scoring (unchanged model)

**Decision**: Retain `scoring_config.tournament_slot_points` JSONB array (5 slots) for season-long questions; admin UI edits in Scoring Configuration tab with labeled slots; independent from `stage_scoring_config`.

**Rationale**: Clarification Q4 — flat +2/0 per slot, not stage matrix.

## 9. Branding

**Decision**: Centralize `WORLD_CUP_DISPLAY_NAME = "World Cup 2026 Predictions"` in `lib/brand.ts`; replace IPL strings in `app-nav`, layouts, `app/page.tsx`, metadata titles.

**Rationale**: FR-015 non-trademark copy; single constant eases copy audit (SC-007).

## 10. Constitution / gates

**Decision**: Treat constitution placeholder as in MVP3 — gates follow `.cursor/rules/specify-rules.md` (Next.js + Supabase, versioned migrations, lint, admin guards).

**Rationale**: `.specify/memory/constitution.md` is not ratified.

**Unresolved NEEDS CLARIFICATION**: None — all technical choices derivable from spec + clarifications.
