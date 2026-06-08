---
description: "Task list for FIFA Tournament Reset & Reconfiguration (future MVP)"
---

# Tasks: FIFA Tournament Reset & Reconfiguration

**Input**: Design documents from `/specs/004-fifa-tournament-reset/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Omitted (not requested in spec). Validate via [quickstart.md](./quickstart.md) and `npm run lint`.

**Organization**: Phases follow user story priorities from [spec.md](./spec.md). Feature is a **future MVP** (FR-014)—execute when explicitly prioritized.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no blocking dependency on incomplete tasks in the same checkpoint)
- **[USn]**: User story label from spec (US1…US5)

---

## Phase 1: Setup (shared)

**Purpose**: Confirm migration numbering and scaffold operator/FIFA module folders.

- [x] T001 Confirm next Supabase migration filename `supabase/migrations/0027_fifa_reset_legacy_and_stage_scoring.sql` (increment if `0027` already exists on branch) per `specs/004-fifa-tournament-reset/plan.md`
- [x] T002 [P] Create `scripts/ops/` directory and placeholder `lib/fifa/` module folder per plan structure

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Schema for FIFA stages, stage scoring matrix, and legacy DDL removal. **Blocks all user stories.**

**⚠️** No user story work until migration applies to dev/staging Supabase.

- [x] T003 Create SQL migration `supabase/migrations/0027_fifa_reset_legacy_and_stage_scoring.sql`: add `stage_scoring_config` (PK `season_year, stage_slug`, `correct_points`, `incorrect_points`); replace `matches.knockout_stage` with `tournament_stage` check (`group|r32|r16|qf|sf|third_place|final`); seed seven default rows for 2026 per `specs/004-fifa-tournament-reset/data-model.md`; drop `legacy_aliases`, `legacy_prediction_staging`, `legacy_prediction_exclusions`; drop `profiles.legacy_points`; add RLS policies for `stage_scoring_config` (authenticated read, admin write); update `supabase/migrations/0025_explicit_data_api_grants.sql` references if grants file is regenerated or add revoke/drop grants in `0027`
- [x] T004 [P] Add `lib/fifa/stages.ts` with `stage_id` → `tournament_stage` slug map and display labels from `docs/fifa/tournament_stages.csv` per `specs/004-fifa-tournament-reset/research.md`
- [x] T005 [P] Add `lib/brand.ts` with `WORLD_CUP_DISPLAY_NAME = "World Cup 2026 Predictions"` per FR-015
- [x] T006 [P] Extend `lib/types/database.ts` (and related row types) for `tournament_stage`, `stage_scoring_config`, and removed legacy columns/tables

**Checkpoint**: Apply migration to dev Supabase; `npm run lint` passes after T006.

---

## Phase 3: User Story 1 — Fresh tournament without losing accounts (Priority: P1) 🎯 MVP

**Goal**: Operators can wipe all competition data while preserving user profiles and zeroing points.

**Independent Test**: Run reset SQL on staging clone with seeded users + match data; profiles remain, competition tables empty, `current_points = 0`.

- [x] T007 [US1] Implement `scripts/ops/reset-competition-data.sql` with ordered truncates/deletes per `specs/004-fifa-tournament-reset/contracts/operator-reset-and-import.md` (child tables first, then `UPDATE profiles SET current_points = 0, rank = NULL`)
- [x] T008 [US1] Write operator runbook `scripts/ops/README.md` documenting preconditions (maintenance mode, backup), execution steps, post-conditions, and explicit **no in-app reset** rule (FR-005)

**Checkpoint**: US1 done when runbook + SQL pass staging dry-run without profile loss.

---

## Phase 4: User Story 2 — Load FIFA schedule into existing match model (Priority: P1)

**Goal**: Full World Cup fixture list imported from `docs/fifa` CSVs into `matches`.

**Independent Test**: `npm run seed -- fifa ./docs/fifa` on empty matches table; ~104 rows, sample `WC26-M1` has teams, kickoff, `tournament_stage = group`.

- [x] T009 [US2] Implement `lib/fifa/import-matches.ts` helpers: resolve team names from `teams.csv`, map `stage_id` via `lib/fifa/stages.ts`, set `external_key = WC26-M{match_number}`, normalize `kickoff_at` → `match_time_utc`, fail on unknown ids per contract
- [x] T010 [US2] Extend `scripts/seed-csv.ts` with `fifa` subcommand (`npm run seed -- fifa ./docs/fifa`) calling import helpers; upsert by `external_key`; idempotent re-run
- [x] T011 [US2] Seed `stage_scoring_config` defaults in fifa import path (or post-import hook) when season 2026 rows missing per FR-010

**Checkpoint**: US2 done when import matches quickstart §3 acceptance.

---

## Phase 5: User Story 4 — Stage-based points with penalties (Priority: P2)

**Goal**: Match-winner scoring uses per-stage matrix; **Draw** supported for picks and results.

**Independent Test**: Score one match per stage with correct/incorrect/Draw predictions; ledger deltas match configured matrix.

- [x] T012 [US4] Implement `GET` and `PATCH` `app/api/admin/scoring/stages/route.ts` per `specs/004-fifa-tournament-reset/contracts/stage-scoring-config.md` with admin guard
- [x] T013 [US4] Refactor `lib/scoring/match-scoring.ts` to load `stage_scoring_config` by `match.tournament_stage`, remove `lib/knockout/scoring.ts` usage, score Draw per FR-012c
- [x] T014 [US4] Update `app/api/predictions/route.ts` to accept `predicted_winner` ∈ `{home_team, away_team, Draw}` per `specs/004-fifa-tournament-reset/contracts/predictions-draw.md`
- [x] T015 [P] [US4] Add Draw option to `components/matches/match-card.tsx` and stage scoring hint from `tournament_stage`
- [x] T016 [US4] Update `components/admin/match-result-panel.tsx` and `app/api/admin/matches/[id]/apply-result/route.ts` to record result as home name, away name, or `Draw`; remove IPL knockout-only assumptions
- [x] T017 [US4] Extend `components/admin/scoring-config-section.tsx` (or new `components/admin/stage-scoring-panel.tsx`) to edit stage matrix and retain `tournament_slot_points` / `match_bonus_points` per FR-011a

**Checkpoint**: US4 independently testable on staging with imported fixtures + manual admin scoring.

---

## Phase 6: User Story 3 — Admin works in clear, task-focused areas (Priority: P2)

**Goal**: Admin reorganized into Match Predictions, Tournament Settings, Bonus Points Settings, Scoring Configuration tabs.

**Independent Test**: Admin completes one task per tab without using controls from another tab (per spec US3).

- [x] T018 [US3] Refactor `app/(app)/admin/page.tsx` to shadcn `Tabs` with four sections per `specs/004-fifa-tournament-reset/contracts/admin-tabs.md`
- [x] T019 [P] [US3] Extract tab panel components under `components/admin/`: `match-predictions-tab.tsx`, `tournament-settings-tab.tsx`, `bonus-points-tab.tsx`, `scoring-configuration-tab.tsx` (wire existing forms/panels)
- [x] T020 [US3] Remove `components/admin/knockout-panel.tsx` usage from admin; relocate mega-bonus answers link into Bonus Points tab (`app/(app)/admin/mega-bonus-answers/page.tsx` remains linked from tab)

**Checkpoint**: US3 done when tab layout matches contract and IPL knockout UI is gone.

---

## Phase 7: User Story 5 — No legacy or migration UX (Priority: P3)

**Goal**: Remove migration flows, legacy copy, IPL branding; codebase matches “brand new game.”

**Independent Test**: Route/code audit—no `/api/migration/*`, `/login/legacy-alias`, welcome import banner, or IPL strings in primary nav.

- [x] T021 [P] [US5] Delete `app/api/migration/**`, `app/login/legacy-alias/page.tsx`, and `components/auth/legacy-alias-claim.tsx`
- [x] T022 [P] [US5] Remove legacy onboarding/migration flows from `app/login/page.tsx`, `app/auth/callback/route.ts`, `app/(app)/layout.tsx`, and `app/page.tsx` (welcome banner / alias redirects)
- [x] T023 [US5] Delete IPL knockout subsystem: `lib/knockout/**`, `components/admin/knockout-panel.tsx`, `lib/scoring/legacy-late-exclusions.ts`; clean imports in `lib/scoring/match-scoring.ts`, `lib/scoring/profile-bootstrap.ts`, `lib/data/profile.ts`, `lib/auth/sync-profile.ts`
- [x] T024 [P] [US5] Apply branding pass: use `lib/brand.ts` in `components/layout/app-nav.tsx`, `app/(app)/layout.tsx`, metadata titles, and remaining IPL user-visible strings per SC-007
- [x] T025 [US5] Update `scripts/seed-csv.ts` and `scripts/README.md` (if present): remove `aliases`, `legacy-predictions`, `legacy-predictions-staging` subcommands and IPL-specific seed docs; document `fifa` and reset runbook only (FR-004)

**Checkpoint**: US5 done when quickstart §5 legacy checks pass (404/removed routes, no IPL copy).

---

## Phase 8: Polish & cross-cutting

**Purpose**: Lint, docs touchpoints, end-to-end staging validation.

- [x] T026 [P] Update `lib/data/history.ts` and any match-order hints if `external_key` prefix changes from `M` to `WC26-M` (ensure natural sort still works)
- [x] T027 Run full staging validation per `specs/004-fifa-tournament-reset/quickstart.md` (reset → import → Draw pick → stage score → admin tabs → branding audit)
- [x] T028 Run `npm run lint` and fix any regressions from legacy removal

---

## Dependencies & execution order

### Phase dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (BLOCKS all stories)
    ↓
Phase 3 US1 (reset) ──┐
Phase 4 US2 (import) ─┼── P1 stories; US2 needs Foundational; US1 can parallel US2 after T003
    ↓
Phase 5 US4 (scoring) ── needs matches optional for unit logic; full test needs US2
    ↓
Phase 6 US3 (admin tabs) ── Scoring Configuration tab content from US4 (T017) should land before or with T018
    ↓
Phase 7 US5 (legacy + branding) ── can overlap US3/US4 but must complete before release
    ↓
Phase 8 Polish
```

### User story dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Phase 2 | Reset SQL on staging clone |
| US2 | P1 | Phase 2 | FIFA seed command output |
| US4 | P2 | Phase 2; US2 for E2E | Per-stage ledger harness |
| US3 | P2 | US4 T017 recommended | Admin tab task completion |
| US5 | P3 | Phase 2 migration drops | Route/copy audit |

### Parallel opportunities

**After Phase 2 completes:**

- T007 (US1) and T009–T010 (US2) in parallel (different files)
- T015 and T024 (UI/branding) in parallel with API work if owners differ
- T021 and T022 (US5 deletions) in parallel

**Within US4:**

- T015 (`match-card.tsx`) parallel with T012 (`scoring/stages` API) after T006 types exist

---

## Parallel example: P1 stories after Foundational

```bash
# Developer A — operator reset
T007: scripts/ops/reset-competition-data.sql
T008: scripts/ops/README.md

# Developer B — FIFA import
T009: lib/fifa/import-matches.ts
T010: scripts/seed-csv.ts fifa subcommand
T011: stage_scoring_config seed hook
```

---

## Implementation strategy

### MVP first (P1 only)

1. Complete Phase 1–2 (Setup + Foundational)
2. Complete Phase 3 US1 (reset runbook)
3. Complete Phase 4 US2 (FIFA import)
4. **STOP and VALIDATE** on staging: reset → import → profiles intact
5. Defer US3–US5 until next increment unless product needs scoring/UI immediately

### Recommended full delivery order

1. Setup + Foundational → migration applied
2. US1 + US2 → data plane ready
3. US4 → scoring + Draw (core gameplay)
4. US3 → admin usability
5. US5 → legacy/code cleanup + branding
6. Polish → quickstart + lint

### Task summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| 1 Setup | — | T001–T002 | 2 |
| 2 Foundational | — | T003–T006 | 4 |
| 3 US1 | P1 | T007–T008 | 2 |
| 4 US2 | P1 | T009–T011 | 3 |
| 5 US4 | P2 | T012–T017 | 6 |
| 6 US3 | P2 | T018–T020 | 3 |
| 7 US5 | P3 | T021–T025 | 5 |
| 8 Polish | — | T026–T028 | 3 |
| **Total** | | **T001–T028** | **28** |

**Parallelizable tasks [P]**: T002, T004, T005, T006, T015, T019, T021, T022, T024, T026 (10 tasks)

**Suggested MVP scope**: Phase 1 + 2 + US1 + US2 (11 tasks) — staging can reset and load FIFA schedule; gameplay/scoring deferred to US4.

---

## Notes

- Production reset is **operator-only**—never add an admin UI button (FR-005).
- Do not use FIFA trademarks in UI copy (`lib/brand.ts`).
- `match_winner_points` on `scoring_config` may remain but scoring engine must use `stage_scoring_config` (research §1).
- Third Place Playoff default incorrect points: −3 (already in data-model seed).
