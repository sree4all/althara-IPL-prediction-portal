# Implementation Plan: FIFA Knockout Enhancements

**Branch**: `005-fifa-knockout-enhancements` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-fifa-knockout-enhancements/spec.md`

## Summary

Extend the live World Cup 2026 portal with four capabilities on the existing Next.js + Supabase stack: **(1)** a new **Tournament Forecast** tab (4 semi-finalists → 2 finalists → 1 winner) with static FIFA bracket constraints, dynamic R16 elimination, and quarter-final lock; **(2)** **hide regular match community picks until kickoff** (admin bypass); **(3)** **automatic knockout winner propagation** plus **admin-triggered FIFA CSV schedule sync** for match numbers/times; **(4)** **AI-generated match bonuses** on odd-numbered fixtures with flat **+3 / 0** scoring. Technical center of gravity: migration `0036_*`, new `lib/fifa/bracket-map.ts` + `bracket-progression.ts`, forecast tables/APIs, community-picks gate, bonus prompt overrides, optional AI generation route.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`  
**Storage**: Supabase PostgreSQL — new `tournament_forecast_answers`; extend `tournament_config`, `bonus_prompts`; optional `bracket_slot_map` seed table or static TS map  
**Testing**: `npm run lint`; unit tests for bracket logic, propagation, kickoff gate; manual quickstart scenarios  
**Target Platform**: Web (Vercel + Supabase)  
**Project Type**: Web application monolith (`app/`, `components/`, `lib/`, `supabase/migrations/`)  
**Performance Goals**: Bracket eligibility computed client-side from cached map; aggregate forecast stats via SQL `GROUP BY`  
**Constraints**: UTC kickoff for lock/gates; RLS + admin guards; no FIFA trademarks; depends on 004 FIFA import (`external_key`, `match_number`, `tournament_stage`)  
**Scale/Scope**: ~104 fixtures; ~20–30 implementation tasks across SQL, lib/fifa, APIs, UI tabs, AI bonus job

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is a **placeholder** (not ratified). Gates follow `.cursor/rules/specify-rules.md` and 004 practice:

| Gate | Status |
|------|--------|
| Stack alignment (Next + Supabase) | Pass |
| Versioned migrations under `supabase/migrations/` | Pass |
| `npm run lint` before merge | Pass |
| Admin mutations guarded | Pass — `requireAdminOrResponse` |
| No secrets in repo | Pass — AI API key via env only |

**Post-design re-check**: Static bracket map + dedicated forecast table avoids overloading legacy `tournament_questions`; per-prompt bonus points override is minimal vs new scoring subsystem. **Pass.**

## Project Structure

### Documentation (this feature)

```text
specs/005-fifa-knockout-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── README.md
│   ├── tournament-forecast.md
│   ├── community-picks-kickoff-gate.md
│   ├── bracket-progression-and-sync.md
│   └── ai-match-bonus.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0036_fifa_knockout_enhancements.sql

lib/fifa/
├── bracket-map.ts              # R32→R16→QF→SF→Final slot graph from docs/fifa/matches.csv
├── bracket-progression.ts      # apply winner → next match home/away
├── bracket-eligibility.ts      # SF exclusion groups, finalist halves, alive teams
├── forecast-lock.ts            # earliest qf match_time_utc
└── import-matches.ts           # extend: metadata-only sync mode

lib/scoring/match-scoring.ts    # per-prompt correct_points override (+3 flat)

app/
├── (app)/forecast/page.tsx                    # Tournament Forecast tab
├── (app)/forecast/stats/page.tsx              # aggregate stats (gated)
├── api/forecast/answers/route.ts
├── api/forecast/stats/route.ts
├── api/forecast/eligibility/route.ts
├── api/admin/fifa/sync-schedule/route.ts
├── api/admin/forecast/visibility/route.ts
├── api/admin/bonus/generate/route.ts
├── api/community-picks/route.ts               # kickoff gate
└── api/prediction-stat/by-match/route.ts      # kickoff gate

components/
├── forecast/forecast-form.tsx
├── forecast/forecast-stats.tsx
└── admin/                                     # sync button, forecast toggle, AI bonus review

scripts/
└── generate-odd-match-bonuses.ts              # optional batch for cron/ops
```

**Structure Decision**: Single Next.js app; bracket map as versioned code derived from `docs/fifa/matches.csv`; no new runtime services.

## Complexity Tracking

No unjustified constitution violations.

---

## Phase 0 — Research

**Output**: [research.md](./research.md)

**Resolved decisions**: dedicated forecast table; static bracket map; kickoff gate in API layer; per-prompt bonus points; admin sync reuses `importFifaMatches`; AI via server route + env-gated provider.

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

1. Migration `0036` — forecast answers, config flags, bonus prompt point overrides  
2. `lib/fifa/bracket-*` — map, progression, eligibility unit tests  
3. Tournament Forecast UI + APIs (answers, eligibility, lock)  
4. Forecast stats API + visibility toggle in admin  
5. Community picks + prediction-stat kickoff gate  
6. Winner propagation hook in `apply-result`  
7. Admin FIFA schedule sync (metadata-only)  
8. AI bonus generation for odd matches + admin edit flow  
9. Scoring engine per-prompt +3 override  
10. Quickstart validation
