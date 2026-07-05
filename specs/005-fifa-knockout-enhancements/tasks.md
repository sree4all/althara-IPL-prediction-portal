# Tasks: FIFA Knockout Enhancements

**Input**: Design documents from `/specs/005-fifa-knockout-enhancements/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Unit tests for bracket logic and propagation per `plan.md` / `quickstart.md` (not full TDD).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm migration slot, route constants, and type stubs before schema work.

- [x] T001 Confirm next Supabase migration filename `supabase/migrations/0036_fifa_knockout_enhancements.sql` (increment if `0036` already exists on branch) per `specs/005-fifa-knockout-enhancements/plan.md`
- [x] T002 [P] Add forecast and admin route constants in `lib/types/mvp2-routes.ts` per `specs/005-fifa-knockout-enhancements/contracts/tournament-forecast.md` and `bracket-progression-and-sync.md`
- [x] T003 [P] Add Zod/payload helpers for forecast answers and admin sync in `lib/types/forecast-contracts.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration, bracket map, eligibility helpers, and forecast lock — required before user story phases.

**⚠️ CRITICAL**: No user story work until this phase completes.

- [x] T004 Create SQL migration `supabase/migrations/0036_fifa_knockout_enhancements.sql`: `tournament_forecast_answers` table, `tournament_config.forecast_stats_visible`, `bonus_prompts.source` / `correct_points` / `incorrect_points`, RLS policies, grants per `specs/005-fifa-knockout-enhancements/data-model.md`
- [x] T005 [P] Implement static FIFA bracket graph (R32→R16→QF→SF→Final feeds and SF exclusion groups) in `lib/fifa/bracket-map.ts` derived from `docs/fifa/matches.csv`
- [x] T006 [P] Implement earliest quarter-final lock helper in `lib/fifa/forecast-lock.ts`
- [x] T007 Implement alive-team and validation helpers (SF groups, final halves, eliminated teams) in `lib/fifa/bracket-eligibility.ts` using `lib/fifa/bracket-map.ts`
- [x] T008 [P] Extend TypeScript DB types for new columns/tables in `lib/types/database.ts`
- [x] T009 [P] Add unit tests for bracket map coverage (M73/M75→M89 group) in `tests/unit/bracket-map.test.ts`
- [x] T010 [P] Add unit tests for semi-finalist/finalist/winner validation in `tests/unit/bracket-eligibility.test.ts`

**Checkpoint**: Migration applied; bracket helpers tested; forecast storage ready.

---

## Phase 3: User Story 1 — Tournament Forecast predictions (Priority: P1) 🎯 MVP

**Goal**: Dedicated `/forecast` tab with three linked picks, bracket constraints, R16 elimination pruning, QF lock.

**Independent Test**: Before QF kickoff, participant saves 4 semi-finalists (Canada hides Morocco), 2 finalists, 1 winner; edits blocked after lock per `specs/005-fifa-knockout-enhancements/quickstart.md` §1.

### Implementation for User Story 1

- [x] T011 [P] [US1] Implement `GET /api/forecast/eligibility` in `app/api/forecast/eligibility/route.ts` per `contracts/tournament-forecast.md`
- [x] T012 [P] [US1] Implement `GET`/`PUT /api/forecast/answers` in `app/api/forecast/answers/route.ts` with lock and validation via `lib/fifa/bracket-eligibility.ts`
- [x] T013 [P] [US1] Create forecast form UI (semi-finalists → finalists → winner) in `components/forecast/forecast-form.tsx`
- [x] T014 [US1] Create participant page in `app/(app)/forecast/page.tsx` wiring eligibility + answers APIs
- [x] T015 [US1] Add **Tournament Forecast** nav link in `components/layout/app-nav.tsx` (or equivalent app shell nav component)

**Checkpoint**: US1 demoable — forecast save/edit/lock without stats tab.

---

## Phase 4: User Story 2 — Hide regular match predictions until kickoff (Priority: P1)

**Goal**: Regular members cannot see others’ match picks before kickoff; admins always can.

**Independent Test**: Two users predict same open match; pre-kickoff regular user sees only self on community list and prediction-stat; post-kickoff sees all per `quickstart.md` §3.

### Implementation for User Story 2

- [x] T016 [US2] Add kickoff gate helper (admin bypass, `picks_revealed` flag) in `lib/matches/picks-reveal-gate.ts`
- [x] T017 [US2] Apply gate to `GET /api/community-picks` in `app/api/community-picks/route.ts` per `contracts/community-picks-kickoff-gate.md`
- [x] T018 [US2] Apply gate to `GET /api/prediction-stat/by-match` in `app/api/prediction-stat/by-match/route.ts` per `contracts/community-picks-kickoff-gate.md`
- [x] T019 [P] [US2] Show “unlocks at kickoff” messaging in `components/matches/community-picks-list.tsx` when `picks_revealed` is false
- [x] T020 [P] [US2] Filter/hide other users’ entries in `app/(app)/prediction-stat/page.tsx` client handling when API returns gated entries
- [x] T021 [P] [US2] Add unit tests for kickoff gate logic in `tests/unit/picks-reveal-gate.test.ts`

**Checkpoint**: US2 independently verifiable on any upcoming match.

---

## Phase 5: User Story 3 — Automatic knockout team propagation (Priority: P2)

**Goal**: Recording a knockout winner auto-fills the next fixture slot; admin can sync FIFA schedule metadata without clobbering teams.

**Independent Test**: Record R32 M73 winner → M89 slot updates; run metadata sync → kickoff changes, propagated names preserved per `quickstart.md` §4–5.

### Implementation for User Story 3

- [x] T022 [P] [US3] Implement `propagateKnockoutWinner` in `lib/fifa/bracket-progression.ts` per `contracts/bracket-progression-and-sync.md`
- [x] T023 [P] [US3] Add unit tests for propagation paths in `tests/unit/bracket-progression.test.ts`
- [x] T024 [US3] Invoke propagation after winner save in `app/api/admin/matches/[id]/apply-result/route.ts` and return `propagation` payload
- [x] T025 [US3] Extend `importFifaMatches` with `mode: 'metadata'` in `lib/fifa/import-matches.ts` (preserve team names/winner/status)
- [x] T026 [US3] Implement `POST /api/admin/fifa/sync-schedule` in `app/api/admin/fifa/sync-schedule/route.ts`
- [x] T027 [US3] Add **Sync FIFA schedule** control and last sync hint in `components/admin/admin-config-form.tsx` (Tournament Settings tab)

**Checkpoint**: US3 verifiable via admin result entry + sync button.

---

## Phase 6: User Story 4 — AI bonus questions on odd-numbered matches (Priority: P2)

**Goal**: AI-generated bonuses on odd fixtures from deployment cutoff; flat +3 / 0 scoring; admin edit/disable.

**Independent Test**: Generate bonus for next odd match; score correct/incorrect → ledger +3 or 0 only per `quickstart.md` §6.

### Implementation for User Story 4

- [x] T028 [P] [US4] Implement LLM bonus draft generator (match context → prompt + options) in `lib/ai/generate-match-bonus.ts` using env `OPENAI_API_KEY`
- [x] T029 [US4] Implement `POST /api/admin/bonus/generate-odd-matches` in `app/api/admin/bonus/generate-odd-matches/route.ts` per `contracts/ai-match-bonus.md`
- [x] T030 [P] [US4] Add ops script `scripts/generate-odd-match-bonuses.ts` wrapping the same generator logic
- [x] T031 [US4] Use per-prompt `correct_points`/`incorrect_points` in `lib/scoring/match-scoring.ts` when set (never negative for incorrect)
- [x] T032 [US4] Add **Generate odd-match bonuses** admin action in `components/admin/bonus-prompts-panel.tsx` (or Bonus Points Settings tab panel)
- [x] T033 [P] [US4] Document `OPENAI_API_KEY` and odd-match cutoff in `scripts/README.md`

**Checkpoint**: US4 verifiable on one odd-numbered fixture end-to-end.

---

## Phase 7: User Story 5 — Tournament Forecast community statistics (Priority: P3)

**Goal**: Aggregate forecast distributions with admin toggle (default off).

**Independent Test**: Toggle off → regular user blocked from stats; toggle on → all see aggregates; &lt;3 forecasts suppresses percentages per `quickstart.md` §2.

### Implementation for User Story 5

- [x] T034 [P] [US5] Implement `GET /api/forecast/stats` with role/toggle gate and min-threshold percentages in `app/api/forecast/stats/route.ts`
- [x] T035 [US5] Implement `PATCH /api/admin/forecast/visibility` in `app/api/admin/forecast/visibility/route.ts`
- [x] T036 [P] [US5] Create aggregate stats UI in `components/forecast/forecast-stats.tsx`
- [x] T037 [US5] Create gated stats page in `app/(app)/forecast/stats/page.tsx` and conditional nav link in app shell
- [x] T038 [US5] Add **Forecast stats visible to all** toggle in `components/admin/admin-config-form.tsx` bound to `forecast_stats_visible`

**Checkpoint**: US5 verifiable after US1 forecasts exist.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Lint, docs, and quickstart validation across stories.

- [x] T039 [P] Add contract smoke tests for forecast routes in `tests/contract/forecast/tournament-forecast.contract.test.ts`
- [x] T040 [P] Run `npm run lint` and fix any issues in touched files
- [x] T041 Execute manual scenarios in `specs/005-fifa-knockout-enhancements/quickstart.md` and note results in PR description
- [x] T042 [P] Update `scripts/ops/README.md` if migration `0036` requires operator notes for staging deploy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 only — **parallel with US1**
- **US3 (Phase 5)**: Depends on Phase 2 (`bracket-map.ts`) — parallel with US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 migration (`bonus_prompts` columns) — parallel with US1–US3
- **US5 (Phase 7)**: Depends on Phase 2 + **US1** (needs forecast answers for meaningful stats)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Foundational | Forecast form save/lock |
| US2 (P1) | Foundational | Community picks kickoff gate |
| US3 (P2) | Foundational + bracket-map | Propagation + sync |
| US4 (P2) | Foundational migration | Odd-match bonus + scoring |
| US5 (P3) | Foundational + US1 | Stats toggle + aggregates |

### Parallel Opportunities

- **Phase 1**: T002, T003 in parallel
- **Phase 2**: T005, T006, T008, T009, T010 in parallel after T004 starts (T007 after T005)
- **After Phase 2**: US1, US2, US3, US4 can proceed in parallel across developers
- **US1**: T011, T012, T013 in parallel → then T014, T015
- **US2**: T019, T020, T021 in parallel after T016–T018
- **US5**: T034, T036 in parallel → then T037, T038

---

## Parallel Example: User Story 1

```bash
# Parallel API + UI skeleton:
T011: app/api/forecast/eligibility/route.ts
T012: app/api/forecast/answers/route.ts
T013: components/forecast/forecast-form.tsx

# Then integrate:
T014: app/(app)/forecast/page.tsx
T015: app nav link
```

---

## Parallel Example: Post-Foundational (P1 stories)

```bash
# Developer A — US1 forecast tab
T011–T015

# Developer B — US2 kickoff gate
T016–T021

# Both complete without merging conflicts on same files
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 + Phase 2
2. Complete Phase 3 (US1)
3. **STOP and VALIDATE** forecast tab per quickstart §1
4. Demo bracket logic (Canada/Morocco exclusion)

### Incremental Delivery (recommended)

1. Foundation → **US1 + US2** (both P1) → deploy
2. Add **US3** (propagation + sync) → deploy
3. Add **US4** (AI bonuses) → deploy
4. Add **US5** (public stats toggle) → deploy

### Suggested MVP scope

**Phases 1–4** (Setup + Foundational + US1 + US2): Tournament Forecast plus spoiler-safe community picks.

---

## Notes

- Forecast **scoring** is out of scope unless explicitly added later (`spec.md` Assumptions)
- US5 requires at least one saved forecast to test aggregates; seed test data if needed
- AI generation requires `OPENAI_API_KEY` in staging; use dry-run admin flag when key absent
- Metadata sync must never overwrite propagated `home_team`/`away_team` (`research.md` §7)
