---
description: "Task list for MVP3 IPL portal improvements"
---

# Tasks: MVP3 IPL Portal Improvements

**Input**: Design documents from `/specs/003-mvp3-improvements/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Omitted unless added later (not requested in spec).

**Organization**: Phases follow user story priorities from [spec.md](./spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no blocking dependency on incomplete tasks in the same checkpoint)
- **[USn]**: User story label from spec (US1…US5)

---

## Phase 1: Setup (shared)

**Purpose**: Align repo with MVP3 file naming and types before schema work.

- [x] T001 [P] Confirm next Supabase migration filename `supabase/migrations/0013_mvp3_options_and_visibility.sql` (increment if `0013` already exists in your branch) per `specs/003-mvp3-improvements/plan.md`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Database and types for structured options + tournament visibility. **No US4/US5 UI work** until migration applies.

**⚠️** User stories US1–US3 can proceed in parallel with migration **only** if work does not depend on new tables; US4/US5 **require** this phase complete.

- [x] T002 Create SQL migration `supabase/migrations/0013_mvp3_options_and_visibility.sql`: add `bonus_prompt_options` and `tournament_question_options`; alter `bonus_prompts` (`input_type`), `tournament_questions` (`visible_after_utc`, `revealed_by_admin` per `specs/003-mvp3-improvements/data-model.md`); RLS for new tables; backfill existing `tournament_questions` so current questions stay visible post-deploy
- [x] T003 [P] Extend manual types in `lib/types/database.ts` (and `lib/data/profile.ts` only if new profile fields) for new tables/columns

**Checkpoint**: Apply migration to dev Supabase; `npm run lint` still passes (types may need T003 first).

---

## Phase 3: User Story 1 — History in fixture order (Priority: P1) 🎯 MVP

**Goal**: History lists match predictions in natural M-number order (M2 before M10).

**Independent Test**: Seed matches M1, M2, M10; open `/history` and confirm order matches numeric sequence.

- [x] T004 [US1] Add `lib/matches/match-order.ts` with helpers to parse integer from `external_key` (e.g. `M12`) and compare two matches for sort order per `specs/003-mvp3-improvements/research.md`
- [x] T005 [US1] Sort match-type rows in `lib/data/history.ts` using `lib/matches/match-order.ts` (fallback: `match_time_utc` when keys tie or missing)

**Checkpoint**: US1 done when History order matches acceptance scenarios in spec.

---

## Phase 4: User Story 2 — Single leaderboard points column (Priority: P2)

**Goal**: Leaderboard shows one primary points column; remove confusing Legacy/Current split.

**Independent Test**: Open `/leaderboard`; table has one points column with clear header (e.g. “Points”).

- [x] T006 [US2] Update `components/leaderboard/leaderboard-table.tsx` to a single points column using `current_points` (label per product copy)
- [x] T007 [US2] Adjust `lib/data/leaderboard.ts` if query should stop surfacing `legacy_points` for the main table (keep data in DB; only display changes unless spec requires summing—per research, default is `current_points` only)

**Checkpoint**: US2 independently verifiable without US3–US5.

---

## Phase 5: User Story 3 — Upcoming prediction status tab (Priority: P3)

**Goal**: New primary nav destination listing upcoming (editable) matches and whether the user has submitted predictions.

**Independent Test**: With mix of predicted and unpredicted scheduled matches, `/upcoming` (or chosen path) reflects truth.

- [ ] T008 [US3] Implement `GET` `app/api/upcoming-predictions/route.ts` per `specs/003-mvp3-improvements/contracts/upcoming-status.md` (filter scheduled/before lock; join `predictions` for `auth.uid()`)
- [x] T009 [US3] Add page `app/(app)/upcoming/page.tsx` consuming the API (table/cards: label, lock time, has prediction, winner pick summary)
- [ ] T010 [US3] Register link + label in `components/layout/app-nav.tsx` (order nav items sensibly)

**Checkpoint**: US3 testable without bonus dropdown work.

---

## Phase 6: User Story 4 — Match bonus dropdown options (Priority: P4)

**Goal**: Admins maintain allowed options; participants pick via dropdown for structured prompts.

**Independent Test**: Admin sets options for a match prompt; participant submits only allowed value; invalid rejected in API.

- [x] T011 [US4] Extend admin bonus prompt flows in `app/api/admin/bonus-prompts/route.ts` and `components/admin/bonus-prompts-panel.tsx` to create/update `input_type` and option rows in `bonus_prompt_options`
- [x] T012 [US4] Load prompts **with** options in `app/(app)/match/[id]/page.tsx` (or dedicated loader) and pass into `components/matches/prediction-form.tsx`
- [ ] T013 [US4] Render `<select>` (or radio) for `single_choice` prompts in `components/matches/prediction-form.tsx`; keep text path for `text` type if present
- [x] T014 [US4] Validate `bonus_answers` against allowed option values in `app/api/predictions/route.ts` before upserting `prediction_bonus_answers`

**Checkpoint**: US4 independently testable after Phase 2.

---

## Phase 7: User Story 5 — Tournament naming, options, visibility (Priority: P5)

**Goal**: Clear naming for season-long bonuses; dropdown answers; questions hidden until date or admin reveal.

**Independent Test**: Rename visible in nav; hidden question absent until reveal; visible question accepts only option list.

- [x] T015 [US5] Rename user-facing strings in `components/layout/app-nav.tsx` and `app/(app)/tournament/page.tsx` (e.g. “Season bonuses” / clarify tournament-level copy per spec)
- [x] T016 [US5] Implement participant visibility filter using `visible_after_utc` and `revealed_by_admin` when loading questions in `app/(app)/tournament/page.tsx` (and `app/api/tournament/questions/route.ts` if used client-side)
- [x] T017 [US5] Add admin controls for visibility fields on `tournament_questions` in `components/admin/tournament-scoring-panel.tsx` and/or `components/admin/admin-config-form.tsx` with save via existing or new admin API
- [x] T018 [P] [US5] Add CRUD or batch save for `tournament_question_options` (admin API route under `app/api/admin/` or extend `app/api/tournament/questions/route.ts` with admin guard)
- [x] T019 [US5] Render tournament answers as dropdowns from options in tournament UI inside `app/(app)/tournament/page.tsx` (or extracted component under `components/tournament/`)
- [x] T020 [US5] Validate tournament answers against options in `app/api/tournament/answers/route.ts`

**Checkpoint**: US5 complete when visibility + options + validation match `specs/003-mvp3-improvements/contracts/bonus-and-tournament-options.md`.

---

## Phase 8: Polish & cross-cutting

**Purpose**: Lint, docs touchpoints, scoring alignment.

- [x] T021 [P] Update `lib/scoring/match-scoring.ts` if bonus comparison must use option `value` normalization consistently with new storage
- [x] T022 [P] Update `lib/scoring/tournament-scoring.ts` if tournament answers move to constrained values
- [x] T023 Run `npm run lint` from repository root and fix MVP3 regressions
- [ ] T024 Walk through `specs/003-mvp3-improvements/quickstart.md` verification steps after deploy

---

## Dependencies & execution order

### Phase dependencies

| Phase | Depends on | Blocks |
|-------|------------|--------|
| Phase 1 Setup | — | — |
| Phase 2 Foundational | Phase 1 | US4, US5 implementation |
| US1 (Phase 3) | — | — (can start after Phase 1; no DB change) |
| US2 (Phase 4) | — | — |
| US3 (Phase 5) | — | — |
| US4 (Phase 6) | **Phase 2** | — |
| US5 (Phase 7) | **Phase 2** | — |
| Polish (Phase 8) | All planned stories for that release | — |

### User story dependencies

- **US1**: Independent (code-only sort).
- **US2**: Independent (display + query tweak).
- **US3**: Independent (new route + API).
- **US4**: Requires Phase 2 migration applied.
- **US5**: Requires Phase 2 migration applied.

### Parallel opportunities

- **After Phase 1**: T004–T005 (US1), T006–T007 (US2), T008–T010 (US3) can proceed in parallel **before** migration lands; US4/US5 wait on T002–T003.
- **After Phase 2**: T011–T014 and T015–T020 can be split across developers (US4 vs US5).
- **Polish**: T021 and T022 in parallel.

### Parallel example: after Phase 2

```text
Developer A: T011–T014 (US4 match bonuses)
Developer B: T015–T020 (US5 tournament)
Developer C (if migration done earlier): T004–T010 (US1–US3)
```

---

## Implementation strategy

### MVP first (US1 only)

1. Complete T004–T005 (Phase 3).
2. Demo History ordering.

### Incremental delivery

1. Phase 2 migration → unlock US4/US5.
2. Ship US1 + US2 + US3 for UX wins without waiting on admin option UI.
3. Ship US4 then US5 (or parallel after Phase 2).

### Suggested scope order

P1 History → P2 Leaderboard → P3 Upcoming tab → P4 Match options → P5 Tournament.

---

## Notes

- Task IDs are sequential T001–T024.
- File paths are repo-relative from project root.
- If `0013` is taken, rename migration in T001/T002 consistently.
