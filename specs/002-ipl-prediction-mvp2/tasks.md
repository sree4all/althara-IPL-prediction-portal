# Tasks: IPL Prediction Portal — MVP2

**Input**: Design documents from `/specs/002-ipl-prediction-mvp2/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Include integration/contract tests for critical MVP2 routes and lock behaviors (explicitly called out in plan quickstart and technical context).

**Organization**: Tasks are grouped by user story so each story remains independently implementable and testable.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare app scaffolding for MVP2 modules and shared tooling updates.

- [x] T001 Create MVP2 module folders `app/(app)/history`, `app/(app)/admin`, `app/(app)/match/[id]`, `app/api/history`, `app/api/community-picks`, `app/api/admin`, `app/api/migration`, `components/admin`, `components/history`, `components/onboarding`
- [x] T002 [P] Add route/type constants for MVP2 endpoints in `lib/types/mvp2-routes.ts`
- [x] T003 [P] Add shared schema helper file for MVP2 payload validation in `lib/types/mvp2-contracts.ts`
- [x] T004 [P] Update seed script CLI docs for MVP2 modes in `scripts/README.md`
- [x] T005 [P] Create test directory skeleton `tests/integration/mvp2` and `tests/contract/mvp2`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add DB model, lock mechanics, role checks, and shared data access required by all stories.

**⚠️ CRITICAL**: User story implementation starts only after this phase.

- [x] T006 Create SQL migration `supabase/migrations/0004_mvp2_schema.sql` for `tournament_config`, `tournament_questions`, `tournament_answers`, `bonus_prompts`, `prediction_bonus_answers`, `legacy_aliases`, `points_ledger`, and `profiles.role`
- [x] T007 Create SQL migration `supabase/migrations/0005_mvp2_rls.sql` for participant/admin RLS policies on all new MVP2 tables
- [x] T008 Create SQL migration `supabase/migrations/0006_mvp2_locks.sql` enforcing tournament answer lock and bonus lock behavior at DB layer
- [x] T061 Create SQL migration `supabase/migrations/0007_mvp2_bonus_unique.sql` for partial unique indexes on `prediction_bonus_answers`
- [x] T062 Create SQL migration `supabase/migrations/0008_mvp2_rls_fixes.sql` for participant/admin RLS corrections and legacy alias policies
- [x] T009 Implement admin-role guard helpers in `lib/auth/require-admin.ts`
- [x] T010 [P] Implement tournament lock utility helpers in `lib/utils/tournament-lock.ts`
- [x] T011 [P] Implement MVP2 data repository helpers in `lib/data/mvp2-repositories.ts`
- [x] T012 [P] Add shared points ledger query helper in `lib/data/points-ledger.ts`
- [x] T013 [P] Extend TypeScript DB types for new tables in `lib/types/database.ts`

**Checkpoint**: MVP2 foundational schema and auth/lock guards are ready.

---

## Phase 3: User Story 1 — Full IPL 2026 schedule and onboarding (Priority: P1) 🎯 MVP2 Core

**Goal**: Show full schedule and onboarding guidance in-app.

**Independent Test**: Participant can open schedule page, see full fixtures, and onboarding guidance describing lock and prediction behavior.

### Tests (US1)

- [x] T014 [P] [US1] Add integration test for schedule + onboarding payload in `tests/integration/mvp2/schedule-onboarding.test.ts`
- [x] T015 [P] [US1] Add contract test for `GET /api/matches/full-schedule` in `tests/contract/mvp2/schedule-onboarding.contract.test.ts`

### Implementation (US1)

- [x] T016 [US1] Implement `GET /api/matches/full-schedule` in `app/api/matches/full-schedule/route.ts` per `contracts/schedule-onboarding.md`
- [x] T017 [P] [US1] Implement onboarding panel UI in `components/onboarding/schedule-onboarding-panel.tsx`
- [x] T018 [US1] Integrate onboarding + full schedule fetch in `app/(app)/matches/page.tsx`
- [x] T019 [US1] Add first-visit onboarding state persistence in `lib/data/onboarding-state.ts`

**Checkpoint**: US1 is demoable independently.

---

## Phase 4: User Story 2 — Extended prediction capture (Priority: P1)

**Goal**: Capture match picks + bonus answers + five tournament answers with lock enforcement.

**Independent Test**: User can submit and edit tournament answers before lock; edit is blocked after lock; match/bonus saves persist.

### Tests (US2)

- [x] T020 [P] [US2] Add contract test for tournament questions/answers endpoints in `tests/contract/mvp2/tournament-answers.contract.test.ts`
- [x] T021 [P] [US2] Add integration test for tournament lock behavior in `tests/integration/mvp2/tournament-lock.test.ts`

### Implementation (US2)

- [x] T022 [US2] Implement `GET /api/tournament/questions` in `app/api/tournament/questions/route.ts`
- [x] T023 [US2] Implement `POST /api/tournament/answers` in `app/api/tournament/answers/route.ts`
- [x] T024 [US2] Extend prediction save route for bonus-answer handling in `app/api/predictions/route.ts`
- [x] T025 [P] [US2] Create tournament questions UI component in `components/matches/tournament-questions-form.tsx`
- [x] T026 [P] [US2] Create match bonus prompt UI component in `components/matches/bonus-prompts-form.tsx`
- [x] T027 [US2] Integrate bonus + tournament forms into `components/matches/prediction-form.tsx`
- [x] T028 [US2] Add toast/error mapping for tournament lock and bonus validation in `lib/toasts/prediction-feedback.ts`

**Checkpoint**: US2 end-to-end prediction capture works independently.

---

## Phase 5: User Story 3 — Admin configuration (Priority: P2)

**Goal**: Admin can manage bonus scope, question activation/text, and tournament lock timestamp via UI.

**Independent Test**: Admin changes reflect for participant routes after refresh; non-admin is forbidden.

### Tests (US3)

- [x] T029 [P] [US3] Add contract tests for admin config APIs in `tests/contract/mvp2/admin-config.contract.test.ts`
- [x] T030 [P] [US3] Add integration test for non-admin access rejection in `tests/integration/mvp2/admin-authz.test.ts`

### Implementation (US3)

- [x] T031 [US3] Implement `GET/PATCH /api/admin/config` in `app/api/admin/config/route.ts`
- [x] T032 [US3] Implement question CRUD APIs in `app/api/admin/tournament-questions/route.ts` and `app/api/admin/tournament-questions/[id]/route.ts`
- [x] T033 [US3] Implement bonus prompt CRUD APIs in `app/api/admin/bonus-prompts/route.ts` and `app/api/admin/bonus-prompts/[id]/route.ts`
- [x] T034 [P] [US3] Build admin page shell in `app/(app)/admin/page.tsx`
- [x] T035 [P] [US3] Build tournament config section component in `components/admin/tournament-config-panel.tsx`
- [x] T036 [P] [US3] Build bonus prompt manager component in `components/admin/bonus-prompts-panel.tsx`
- [x] T037 [US3] Wire admin actions and optimistic updates in `components/admin/admin-config-form.tsx`

**Checkpoint**: US3 admin workflow is independently usable.

---

## Phase 6: User Story 4 — Personal history and points (Priority: P2)

**Goal**: Participant can view prior predictions and points (or pending status) in one place.

**Independent Test**: History shows entries from match/tournament/bonus sources and correct pending/final labels.

### Tests (US4)

- [x] T038 [P] [US4] Add contract test for history API in `tests/contract/mvp2/history.contract.test.ts`
- [x] T039 [P] [US4] Add integration test for points ledger rendering in `tests/integration/mvp2/history-points.test.ts`

### Implementation (US4)

- [x] T040 [US4] Implement `GET /api/history` in `app/api/history/route.ts` per `contracts/history.md`
- [x] T041 [P] [US4] Add history data helper in `lib/data/history.ts`
- [x] T042 [P] [US4] Build history table UI in `components/history/prediction-history-table.tsx`
- [x] T043 [US4] Create history page in `app/(app)/history/page.tsx`

**Checkpoint**: US4 is independently testable.

---

## Phase 7: User Story 5 — Per-match community picks list (Priority: P3)

**Goal**: Show submitters-only pick list for each match.

**Independent Test**: Match detail page shows only users who submitted valid picks for that match.

### Tests (US5)

- [x] T044 [P] [US5] Add contract test for community picks API in `tests/contract/mvp2/community-picks.contract.test.ts`
- [x] T045 [P] [US5] Add integration test ensuring non-submitters are omitted in `tests/integration/mvp2/community-picks.test.ts`

### Implementation (US5)

- [x] T046 [US5] Implement `GET /api/community-picks` in `app/api/community-picks/route.ts` per `contracts/community-picks.md`
- [x] T047 [P] [US5] Build community picks list UI in `components/matches/community-picks-list.tsx`
- [x] T048 [US5] Create match detail page in `app/(app)/match/[id]/page.tsx` and include community picks component

**Checkpoint**: US5 works independently.

---

## Phase 8: User Story 6 — One-time migration and alias linking (Priority: P3)

**Goal**: Support one-time email mapping and user alias claim flow for legacy data continuity.

**Independent Test**: Known email auto-links, alias claim works for unclaimed names, duplicate claim blocked.

### Tests (US6)

- [x] T049 [P] [US6] Add integration test for alias claim collision handling in `tests/integration/mvp2/alias-claim-collision.test.ts`
- [x] T050 [P] [US6] Add contract test for migration/alias APIs in `tests/contract/mvp2/migration-alias.contract.test.ts`

### Implementation (US6)

- [x] T051 [US6] Extend seed script for legacy alias import mode in `scripts/seed-csv.ts`
- [x] T052 [US6] Implement admin migration mapping API in `app/api/migration/import-legacy/route.ts`
- [x] T053 [US6] Implement participant alias list/claim APIs in `app/api/migration/aliases/route.ts` and `app/api/migration/aliases/claim/route.ts`
- [x] T054 [P] [US6] Build alias claim UI in `components/auth/legacy-alias-claim.tsx`
- [x] T055 [US6] Integrate alias claim step into sign-in/post-login flow in `app/(app)/layout.tsx`

**Checkpoint**: US6 can be validated independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final integration quality, docs, and verification.

- [x] T056 [P] Add MVP2 navigation links (History/Admin/Match detail entry points) in `components/layout/app-nav.tsx`
- [x] T057 [P] Update root usage docs for MVP2 routes and admin setup in `README.md`
- [x] T058 [P] Update operational script docs for migration/alias modes in `scripts/README.md`
- [x] T059 Add DB migration runbook for MVP2 in `specs/002-ipl-prediction-mvp2/quickstart.md`
- [x] T060 Run validation commands and fix issues: `npm run lint` and `npm run build` from repository root

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 → Phase 2 (required)
- Phase 2 blocks all user stories
- User story phases can proceed after Phase 2; recommended order: US1 → US2 → US3 → US4 → US5 → US6
- Phase 9 runs after selected user stories complete

### User story dependencies

- **US1**: Depends only on foundational phase
- **US2**: Depends on foundational phase and schedule context from US1 for best UX, but API work can begin independently
- **US3**: Depends on foundational phase; affects US2 behavior
- **US4**: Depends on foundational phase and points ledger availability
- **US5**: Depends on foundational phase and existing match predictions
- **US6**: Depends on foundational phase; should be complete before production migration window

### Within-story ordering

- Contract/integration tests first
- Data/API implementation before UI wiring
- Role/lock enforcement before exposing controls

## Parallel opportunities

- Setup tasks marked `[P]` can run together after T001
- Foundational tasks T010–T013 can run in parallel after migrations
- Per-story test tasks marked `[P]` can run concurrently
- UI components marked `[P]` can run in parallel with API handlers once contracts stabilize

## Parallel example: US3 (Admin config)

```text
T034 Build admin page shell in app/(app)/admin/page.tsx
T035 Build tournament config panel in components/admin/tournament-config-panel.tsx
T036 Build bonus prompts panel in components/admin/bonus-prompts-panel.tsx
```

## Implementation strategy

### MVP first (highest value slice)

1. Complete Phase 1 and Phase 2
2. Deliver US1 + US2 (core participant schedule and prediction expansion)
3. Add US3 to unlock admin-managed configuration
4. Validate with `quickstart.md` participant/admin checks

### Incremental delivery

1. US1 (schedule + onboarding)
2. US2 (extended predictions)
3. US3 (admin config)
4. US4 (history/points)
5. US5 (community picks)
6. US6 (migration/alias)

## Task summary

- **Total tasks**: 62  
- **US1**: 6 tasks  
- **US2**: 9 tasks  
- **US3**: 9 tasks  
- **US4**: 6 tasks  
- **US5**: 5 tasks  
- **US6**: 7 tasks  
- **Setup/Foundational/Polish**: 20 tasks

## Notes

- Every task follows required checklist format with task ID and file path.
- Story labels `[USn]` are used only in user story phases.
- Tournament lock and submitter-only community list are explicitly enforced in task mapping.
