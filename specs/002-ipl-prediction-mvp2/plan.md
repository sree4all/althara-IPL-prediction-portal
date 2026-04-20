# Implementation Plan: IPL Prediction Portal — MVP2

**Branch**: `002-ipl-prediction-mvp2` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-ipl-prediction-mvp2/spec.md`

## Summary

MVP2 extends the working MVP1 app to support full IPL 2026 schedule onboarding, richer prediction structures (per-match bonuses + five tournament questions), admin-managed configuration, personal prediction history with points, per-match community pick visibility, and one-time migration/alias linking for legacy name-based data. Approach remains a single Next.js App Router project on Vercel with Supabase (Postgres + Auth + RLS), adding new relational tables and role-based admin capabilities. Detailed decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`  
**Storage**: Supabase PostgreSQL (extend existing `matches`, `profiles`, `predictions`) with new tables for bonus prompts, tournament questions/answers, points ledger, alias claims  
**Testing**: Existing `npm run lint` + `npm run build`; add integration and route-level tests in MVP2 tasks  
**Target Platform**: Modern mobile and desktop browsers (mobile-first)  
**Project Type**: Web application (single Next.js repo with route handlers + Supabase SQL migrations)  
**Performance Goals**: Maintain MVP1 responsiveness; admin setting changes reflected for users on reload; history and community list queries return in acceptable interactive time under free-tier DB limits  
**Constraints**: UTC/GMT logic for all locks; strict match lock remains from MVP1; tournament answers lock is single admin-configurable UTC instant with default = first league match start; free-tier friendly architecture  
**Scale/Scope**: Community-scale usage (hundreds to low-thousands participants), full IPL 2026 fixture set, 5 active tournament questions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file is still template-only and not ratified. For this feature, enforce practical gates:

| Gate | Status | Notes |
|------|--------|-------|
| Spec conformance | PASS | Plan directly maps to FR-001..FR-012 and clarified defaults |
| Simplicity | PASS | Single app + Supabase; no extra services introduced |
| Data safety | PASS | Role checks + RLS + immutable lock behavior in DB/API design |
| Deployability | PASS | Compatible with current Vercel + Supabase setup |

Post-design re-check: still PASS (no unjustified complexity increase).

## Project Structure

### Documentation (this feature)

```text
specs/002-ipl-prediction-mvp2/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-config.md
│   ├── community-picks.md
│   ├── history.md
│   ├── schedule-onboarding.md
│   └── tournament-answers.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── (app)/
│   ├── matches/
│   ├── leaderboard/
│   ├── history/            # new
│   ├── admin/              # new
│   └── match/[id]/         # new match detail + community picks
├── api/
│   ├── matches/
│   ├── predictions/
│   ├── history/            # new
│   ├── community-picks/    # new
│   ├── admin/              # new
│   └── migration/          # new one-time alias/email mapping endpoints (admin)
components/
├── admin/
├── history/
├── matches/
└── onboarding/
lib/
├── auth/
├── data/
├── supabase/
├── toasts/
├── types/
└── utils/
scripts/
└── seed-csv.ts            # extend for MVP2 migration and config seeding
supabase/
└── migrations/            # add MVP2 schema and RLS migrations
```

**Structure Decision**: Continue with single-repo Next.js architecture introduced in MVP1; extend existing modules rather than splitting backend/frontend.

## Complexity Tracking

No constitution violations requiring justification.

## Phase 0 & Phase 1 Outputs

| Artifact | Path |
|----------|------|
| Research decisions | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Interface contracts | [contracts/](./contracts/) |
| Quickstart validation | [quickstart.md](./quickstart.md) |

## Agent Context Update

Run after plan + design docs:

`.\.specify\scripts\powershell\update-agent-context.ps1 -AgentType cursor-agent`
