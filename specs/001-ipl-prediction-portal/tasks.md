# Tasks: IPL Prediction Web App (Althara 2026)

**Input**: Design documents from `/specs/001-ipl-prediction-portal/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Omitted — not requested in feature spec (add Vitest/Playwright tasks later if adopting TDD).

**Organization**: Phases follow user stories from [spec.md](./spec.md) (US1–US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no ordering dependency within phase)
- **[USn]**: User story label (required for user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Next.js project initialization and tooling per [plan.md](./plan.md).

- [x] T001 Create Next.js App Router + TypeScript scaffold at repository root: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`
- [x] T002 [P] Configure Tailwind CSS: `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`
- [x] T003 [P] Initialize shadcn/ui via `components.json` and add base primitives under `components/ui/` (e.g. `button.tsx`, `card.tsx`)
- [x] T004 [P] Add environment template `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `SUPABASE_SERVICE_ROLE_KEY` per [quickstart.md](./quickstart.md)
- [x] T005 [P] Add ESLint flat config `eslint.config.mjs` and `.prettierrc` at repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase clients, auth session handling, UTC lock helper — **required before any user story UI**.

**⚠️ CRITICAL**: No user story work until this phase completes.

- [x] T006 Create SQL migration `supabase/migrations/0001_schema.sql` defining `profiles`, `matches`, `predictions` (and optional `import_batches`) per [data-model.md](./data-model.md) with `UNIQUE(user_id, match_id)` on `predictions`
- [x] T007 Create SQL migration `supabase/migrations/0002_rls.sql` enabling RLS and policies for `profiles`, `matches`, `predictions` summarized in [data-model.md](./data-model.md)
- [x] T008 Create browser Supabase client in `lib/supabase/client.ts`
- [x] T009 Create server Supabase client + cookie helpers in `lib/supabase/server.ts`
- [x] T010 Add `middleware.ts` at repository root calling Supabase session refresh pattern from `@supabase/ssr`
- [x] T011 Implement OAuth/magic-link callback in `app/auth/callback/route.ts`
- [x] T012 Create SQL migration `supabase/migrations/0003_profile_on_auth.sql` — trigger or function to insert `profiles` row on new `auth.users` (align `id` with `auth.users.id`)
- [x] T013 [P] Implement UTC lock helper `isPredictionWindowOpen(matchTimeUtc: Date, nowUtc?: Date): boolean` in `lib/utils/match-lock.ts` per spec strict inequality (`now > match - 30min` → locked)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Sign in and continuity (Priority: P1) 🎯 MVP core

**Goal**: Post-login **Syncing History**, **welcome-back** copy when migrated email matches, **default display name** from tally (`display_name` on `profiles`) — [spec.md](./spec.md) User Story 1.

**Independent Test**: Sign in with seeded email → see syncing → welcome sentence → `display_name` matches CSV tally name, not raw OAuth name.

- [x] T014 [US1] Add login UI `app/login/page.tsx` and `components/auth/login-form.tsx` (email magic link + Google) wired to Supabase Auth
- [x] T015 [US1] Add `lib/auth/require-user.ts` exporting server helper to redirect unauthenticated users to `/login`
- [x] T016 [US1] Create protected shell `app/(app)/layout.tsx` applying `require-user`, rendering children after session available
- [x] T017 [US1] Add `components/auth/syncing-history.tsx` full-screen state shown immediately after auth before main content (FR-010)
- [x] T018 [US1] Add `lib/data/profile.ts` loading `profiles` for `auth.uid()` including `display_name`, `legacy_points`
- [x] T019 [US1] Add `components/auth/welcome-banner.tsx` showing exact copy “Welcome back! We've successfully imported your scores from the 2025 season.” when migrated legacy data is present (e.g. `legacy_points` seeded from CSV for that email) per FR-011
- [x] T020 [US1] Ensure new OAuth users get `profiles.display_name` from imported CSV when email matches seed data; otherwise fallback documented in `lib/auth/sync-profile.ts` (prefer tally over `raw_user_meta_data` full name)

**Checkpoint**: US1 flows testable in isolation (login + profile continuity).

---

## Phase 4: User Story 2 — Match grid and lock state (Priority: P1)

**Goal**: Match grid with **LOCKED** badge and disabled inputs when within lock window — [spec.md](./spec.md) User Story 2; contract [contracts/matches-list.md](./contracts/matches-list.md).

**Independent Test**: Compare grid state to `lib/utils/match-lock.ts` for sample `match_time_utc` values.

- [x] T021 [US2] Implement `GET` handler `app/api/matches/route.ts` returning JSON per [contracts/matches-list.md](./contracts/matches-list.md) including `client_lock_hint` and `server_time_utc`
- [x] T022 [US2] Add `app/(app)/matches/page.tsx` and `components/matches/match-grid.tsx` (mobile-first layout per FR-015)
- [x] T023 [US2] Add `components/matches/match-card.tsx` showing teams, UTC time label, **LOCKED** badge, and `disabled` inputs when `client_lock_hint` is true

**Checkpoint**: US2 independently verifiable without saving predictions (read-only grid).

---

## Phase 5: User Story 3 — Save or revise prediction until lock (Priority: P1)

**Goal**: Upsert predictions with server-enforced lock and spec toasts FR-012–FR-014 — [spec.md](./spec.md) User Story 3; [contracts/predictions-upsert.md](./contracts/predictions-upsert.md).

**Independent Test**: Save before lock → toasts; change pick → update toast; after lock → 403 + FR-014 message.

- [x] T024 [US3] Add toast provider (`components/ui/sonner.tsx` or shadcn Sonner) and mount in `app/layout.tsx`
- [x] T025 [US3] Implement `POST` `app/api/predictions/route.ts` with upsert (`ON CONFLICT`), server-side lock check using `lib/utils/match-lock.ts`, response body `{ was_update }` per [contracts/predictions-upsert.md](./contracts/predictions-upsert.md)
- [x] T026 [US3] Add `components/matches/prediction-form.tsx` with team/bonus controls and **Save Prediction** button calling `/api/predictions`
- [x] T027 [US3] Map API success/error in `lib/toasts/prediction-feedback.ts` or inline: FR-012 first save, FR-013 update, FR-014 locked (exact strings from spec)

**Checkpoint**: US3 completes core prediction loop.

---

## Phase 6: User Story 4 — Leaderboard visibility (Priority: P2)

**Goal**: Leaderboard listing `display_name`, `legacy_points`, `current_points`, `rank` — [spec.md](./spec.md) User Story 4.

**Independent Test**: After seeding, order matches expected totals; duplicate `display_name` rows remain distinct users.

- [x] T028 [US4] Add `lib/data/leaderboard.ts` querying `profiles` ordered by `current_points` / tie-break rules
- [x] T029 [US4] Add `app/(app)/leaderboard/page.tsx` and `components/leaderboard/leaderboard-table.tsx` (responsive, mobile-first)
- [x] T030 [US4] Optional SQL view or window function for `rank` column — `supabase/migrations/0004_leaderboard_view.sql` if using DB-side rank; else compute in `lib/data/leaderboard.ts`

**Checkpoint**: US4 testable with seeded profiles.

---

## Phase 7: User Story 5 — Operator CSV seeding (Priority: P2)

**Goal**: Operator-run CSV ingest for matches + profile legacy points/names by email — [spec.md](./spec.md) User Story 5; [research.md](./research.md) §8 (email required for auto-import).

**Independent Test**: Run script against sample CSVs; verify `matches` + `profiles` updated; skipped rows logged.

- [x] T031 [US5] Implement `scripts/seed-csv.ts` (Node + `csv-parse` or similar) upserting `matches` by `external_key` and merging `profiles` by **email** with `display_name` + `legacy_points` (service role only)
- [x] T032 [US5] Add `scripts/README.md` documenting CSV column expectations and `pnpm tsx scripts/seed-csv.ts` usage aligned with [quickstart.md](./quickstart.md)

**Checkpoint**: Operators can load sheet exports without manual SQL.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docs, navigation, responsiveness.

- [x] T033 [P] Add root `README.md` linking to `specs/001-ipl-prediction-portal/quickstart.md` and env setup
- [x] T034 [P] Add shared navigation `components/layout/app-nav.tsx` (linked from `app/(app)/layout.tsx`)
- [x] T035 Add `lib/types/database.ts` with TypeScript types mirroring tables for safer queries
- [x] T036 [P] Pass manual smoke checklist from [quickstart.md](./quickstart.md) (sign-in, sync, save, lock message)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phases 3–7 (US1–US5)**: Depend on Phase 2 completion. Recommended sequence: **US1 → US2 → US3** (P1 chain), then **US4**, then **US5** (or run US5 earlier if seeding needed to test US1 welcome).
- **Phase 8**: After desired stories complete.

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|--------|
| US1 | Foundational | No other story required |
| US2 | Foundational (+ US1 optional for nav shell) | API/data-only testable without US3 |
| US3 | US2 recommended | Needs match list + cards to host form |
| US4 | Foundational | Independent read path; benefits from seeded `profiles` |
| US5 | Foundational | Should run before UAT of US1 welcome if legacy data required |

### Within Each Story

Implement server/data helpers before UI when listed first; API routes before forms that call them.

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 in parallel after T001.
- **Phase 2**: T013 in parallel with T008–T012 once schema exists (T006–T007 must land first).
- **Phase 8**: T033, T034, T036 in parallel.

---

## Parallel Example: Phase 1 (after T001)

```text
T002 Configure Tailwind — tailwind.config.ts, app/globals.css
T003 shadcn init — components.json, components/ui/*
T004 .env.local.example
T005 eslint + prettier
```

---

## Parallel Example: User Story 2

```text
T021 GET /api/matches — app/api/matches/route.ts
(in parallel after API contract stable)
T022 matches page + grid — app/(app)/matches/page.tsx, components/matches/match-grid.tsx
T023 match card — components/matches/match-card.tsx (depends on T022 for integration)
```

---

## Implementation Strategy

### MVP First (P1 stories only)

1. Complete Phase 1 + Phase 2.
2. Complete Phase 3–5 (US1, US2, US3).
3. **STOP**: Smoke-test login, grid, locks, upsert, toasts.
4. Add US4 + US5 + Phase 8 for full MVP scope in spec.

### Suggested MVP scope (minimum shippable)

- **Included**: Phase 1, 2, 3, 4, 5 (Setup + Foundation + US1–US3).
- **Add next**: Phase 6 (US4), Phase 7 (US5), Phase 8.

---

## Task Summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 36 |
| **Phase 1** | 5 |
| **Phase 2** | 8 |
| **US1** | 7 (T014–T020) |
| **US2** | 3 (T021–T023) |
| **US3** | 4 (T024–T027) |
| **US4** | 3 (T028–T030) |
| **US5** | 2 (T031–T032) |
| **Polish** | 4 (T033–T036) |

---

## Notes

- Every task uses checkbox + numeric ID + file path in description per speckit-tasks rules.
- **[USn]** labels only on Phases 3–7.
- Lock and upsert **must** remain enforced server-side (T013, T025), not only in UI (T023).
