# Implementation Plan: FIFA Tournament Reset & Reconfiguration

**Branch**: `004-fifa-tournament-reset` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-fifa-tournament-reset/spec.md`  
**Status**: Future MVP — plan defines implementation; build when explicitly prioritized (FR-014).

## Summary

Replatform the prediction portal from IPL 2026 to **World Cup 2026** on the existing Next.js + Supabase stack: **operator-only** competition data reset (profiles preserved), **FIFA CSV import** into `matches`, **full legacy removal** (tables, columns, routes, UX), **Draw** as a third match outcome, **per-stage scoring matrix** (configurable in admin), **tabbed admin UI**, and **non-trademark branding**. Technical center of gravity: migration `0027_*`, `scripts/ops/reset-competition-data.sql`, `seed-csv fifa` command, refactor `lib/scoring/match-scoring.ts` to use `stage_scoring_config`, replace IPL `knockout_stage` with `tournament_stage` slugs.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`  
**Storage**: Supabase PostgreSQL — new `stage_scoring_config`; alter `matches`; drop legacy tables/columns  
**Testing**: `npm run lint`; manual staging runbook per [quickstart.md](./quickstart.md)  
**Target Platform**: Web (Vercel + Supabase)  
**Project Type**: Web application monolith (`app/`, `components/`, `lib/`, `supabase/migrations/`, `scripts/`)  
**Performance Goals**: Standard portal; single-season ~104 fixtures  
**Constraints**: Operator-only production reset; no FIFA trademarks in UI; RLS + admin guards unchanged; prediction lock `match_time_utc - 30m`  
**Scale/Scope**: ~15–25 implementation tasks across SQL, scripts, scoring engine, admin UI, branding, legacy deletion

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is a **placeholder** (not ratified). Gates follow `.cursor/rules/specify-rules.md` and MVP2–MVP3 practice:

| Gate | Status |
|------|--------|
| Stack alignment (Next + Supabase) | Pass |
| Versioned migrations under `supabase/migrations/` | Pass |
| `npm run lint` before merge | Pass |
| Admin mutations guarded | Pass — `requireAdminOrResponse` |
| No operator reset in admin UI | Pass — spec + [operator-reset-and-import.md](./contracts/operator-reset-and-import.md) |

**Post-design re-check**: Replacing IPL knockout model and adding `stage_scoring_config` is justified by FIFA schedule + matrix spec; legacy drop is required by FR-003a. **Pass.**

## Project Structure

### Documentation (this feature)

```text
specs/004-fifa-tournament-reset/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── README.md
│   ├── operator-reset-and-import.md
│   ├── stage-scoring-config.md
│   ├── predictions-draw.md
│   └── admin-tabs.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0027_fifa_reset_legacy_and_stage_scoring.sql   # stage table, tournament_stage, drop legacy

scripts/
├── ops/
│   ├── reset-competition-data.sql                 # operator reset (FR-005)
│   └── README.md
└── seed-csv.ts                                    # + fifa import command

lib/
├── brand.ts                                       # WORLD_CUP_DISPLAY_NAME
├── scoring/match-scoring.ts                       # stage_scoring_config + Draw
└── fifa/                                          # stage map, import helpers (new)

app/
├── (app)/admin/page.tsx                           # Tabs layout
├── api/admin/scoring/stages/                      # stage matrix API (new)
├── api/predictions/route.ts                       # Draw validation
└── [DELETE] api/migration/**, login/legacy-alias/**

components/
├── admin/                                         # tab panels split
├── matches/match-card.tsx                         # Draw button
└── [DELETE] admin/knockout-panel.tsx, auth/welcome-banner (legacy)

docs/fifa/                                         # source CSVs (existing)
```

**Structure Decision**: Single Next.js app; operator tooling in `scripts/ops/`; no new runtime services.

## Complexity Tracking

No unjustified constitution violations. IPL knockout subsystem removal reduces long-term complexity versus maintaining dual bracket models.

---

## Phase 0 — Research

**Output**: [research.md](./research.md)

**Resolved decisions**:

- `stage_scoring_config` table for FIFA matrix
- `tournament_stage` slugs replace `knockout_stage`
- Literal `Draw` for picks/results
- Operator SQL + `seed fifa` import
- Full legacy DDL/code removal in one migration wave
- shadcn Tabs for admin

**No unresolved NEEDS CLARIFICATION.**

## Phase 1 — Design & contracts

**Output**:

- [data-model.md](./data-model.md)
- [contracts/](./contracts/)
- [quickstart.md](./quickstart.md)

**Agent context**: `.specify/scripts/powershell/update-agent-context.ps1 -AgentType cursor-agent`

## Phase 2 — Tasks

Deferred to **`/speckit.tasks`** → `tasks.md`.

### Suggested task themes (for `/speckit.tasks`)

1. Migration `0027` — stage table, `tournament_stage`, drop legacy artifacts  
2. Operator reset SQL + runbook  
3. FIFA `seed-csv` import + external_key convention  
4. Scoring engine + admin stage API  
5. Draw in predictions API + match card + admin result  
6. Admin tabs refactor  
7. Legacy route/page deletion + branding pass  
8. Staging quickstart validation
