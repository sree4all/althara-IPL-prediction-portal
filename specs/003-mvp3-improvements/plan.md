# Implementation Plan: MVP3 IPL Portal Improvements

**Branch**: `002-ipl-prediction-mvp2` (workspace) | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-mvp3-improvements/spec.md`

## Summary

Deliver MVP3 UX and data improvements: **natural-order History** (M2 before M10), **structured dropdown answers** for match bonuses and tournament questions with **admin-managed option lists**, **tournament section rename + visibility rules** (time-based and/or admin reveal), **single-column leaderboard** aligned with unified scoring, and a **new nav destination** listing **upcoming matches with per-user prediction status**. Implementation extends the existing **Next.js App Router + Supabase Postgres** stack with additive migrations (`bonus_prompt_options`, `tournament_question_options`, visibility columns), API/route updates, and admin UI for options + reveals.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`  
**Storage**: Supabase PostgreSQL (extend `bonus_prompts`, `tournament_questions`; new option tables)  
**Testing**: `npm run lint`; contract/integration tests under `tests/` as patterns allow  
**Target Platform**: Web (desktop/mobile browsers)  
**Project Type**: Web application (monolith: `app/`, `components/`, `lib/`, `supabase/migrations/`)  
**Performance Goals**: Standard portal UX; list endpoints paginate if schedules grow large (optional follow-up)  
**Constraints**: Respect existing prediction lock (`match_time_utc - 30m`), RLS, admin-only mutations  
**Scale/Scope**: Single league season, hundreds of matches max; MVP3 touches ~5 surfaces + migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository `.specify/memory/constitution.md` is still a **placeholder template** (not ratified). Gates below follow **project conventions** from `.cursor/rules/specify-rules.md` and existing MVP2 practice:

| Gate | Status |
|------|--------|
| Stack alignment (Next + Supabase) | Pass — no new runtime introduced |
| Migrations versioned under `supabase/migrations/` | Pass |
| Lint before merge | Pass — `npm run lint` |
| Security: admin routes guarded | Pass — reuse `requireAdminOrResponse` patterns |

**Post-design re-check**: Data model adds normalized option tables and visibility flags; no unjustified complexity. **Pass.**

## Project Structure

### Documentation (this feature)

```text
specs/003-mvp3-improvements/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── README.md
│   ├── upcoming-status.md
│   └── bonus-and-tournament-options.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── (app)/                    # Authenticated shell: new page e.g. upcoming route
├── api/                      # New route handlers: upcoming-predictions, admin option CRUD
components/
├── layout/app-nav.tsx        # Nav label: Tournament → Season bonuses (copy TBD)
├── leaderboard/              # Single Points column
├── match/ …                  # Bonus dropdowns from options
├── tournament/               # Dropdowns + hidden questions
lib/
├── data/history.ts           # Sort by parsed M-number
└── …
supabase/migrations/
└── 0013_mvp3_*.sql           # New migration file(s) — numbering follows repo next
```

**Structure Decision**: Single Next.js app with Supabase backend; feature work lands in `app/`, `components/`, `lib/`, and numbered SQL migrations—consistent with MVP2.

## Complexity Tracking

No constitution violations requiring justification. Option tables add schema surface but are the simplest auditable model vs. opaque JSON.

---

## Phase 0 — Research

**Output**: [research.md](./research.md) — decisions on history sort, dropdown storage, tournament visibility precedence, leaderboard column, upcoming tab scope, RLS posture. **No unresolved NEEDS CLARIFICATION** for implementation planning.

## Phase 1 — Design & contracts

**Output**:

- [data-model.md](./data-model.md) — entities and ALTERs
- [contracts/](./contracts/) — upcoming status API shape; bonus/tournament options
- [quickstart.md](./quickstart.md) — verify MVP3 flows locally

**Agent context**: Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType cursor-agent` after this plan.

## Phase 2 — Tasks

Deferred to **`/speckit.tasks`** → `tasks.md` (not produced by this command).
