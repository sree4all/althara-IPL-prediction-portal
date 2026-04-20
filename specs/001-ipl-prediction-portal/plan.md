# Implementation Plan: IPL Prediction Web App (Althara 2026)

**Branch**: `001-ipl-prediction-portal` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-ipl-prediction-portal/spec.md`

## Summary

Deliver a **mobile-first** web application where IPL participants authenticate (email + Google), view a **UTC-based** match schedule with a strict **30-minute pre-start lock**, **upsert** predictions until lock, and see a **leaderboard** backed by **profiles** with **legacy** and **current** points. **Operators** import CSVs exported from the [Althara IPL Predictions 2026](https://docs.google.com/spreadsheets/d/1P58RxCVKwderQf30vy-KXtuzWsEtggwUaeDY58885_M/edit?usp=sharing) sheet to seed matches and merge **tally display names** + **legacy points** by **email**. Technical approach: **Next.js (App Router)** on **Vercel**, **Supabase** (Postgres + Auth + RLS), **Tailwind** + **shadcn/ui**, with lock and upsert rules enforced **server-side**. See [research.md](./research.md) for decisions and alternatives.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`  
**Storage**: Supabase (PostgreSQL) — `profiles`, `matches`, `predictions`; auth via Supabase Auth  
**Testing**: Vitest, React Testing Library, Playwright (critical paths)  
**Target Platform**: Modern browsers; mobile-first responsive UI  
**Project Type**: Web application (single Next.js repo; API via Route Handlers and/or Supabase RPC)  
**Performance Goals**: Spec SC-003 — post-login “ready” state &lt; 10s p95 under normal conditions; match list and leaderboard pages interactive under typical free-tier DB latency  
**Constraints**: All business times in **UTC** (FR-001); lock `current_time > match_time_utc - 30 minutes`; Vercel + Supabase **free tier** (FR-017)  
**Scale/Scope**: Club-sized participant count (hundreds to low thousands); ~70 league matches per season per sheet shape  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project [constitution](../../.specify/memory/constitution.md) is still a **placeholder template** (not ratified). Until amended:

| Gate | Status |
|------|--------|
| Spec alignment | **Pass** — plan implements FR-001–FR-017 from [spec.md](./spec.md) |
| Testability | **Pass** — contracts + data model support automated tests |
| Simplicity | **Pass** — single app + single BaaS; no extra microservices for MVP |

**Post-design**: No new violations; [data-model.md](./data-model.md) and [contracts/](./contracts/) stay within single-project scope.

## Project Structure

### Documentation (this feature)

```text
specs/001-ipl-prediction-portal/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── README.md
│   ├── predictions-upsert.md
│   └── matches-list.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root) — target layout

Greenfield: create the app at repo root (or `apps/web` if monorepo later).

```text
app/                      # Next.js App Router: pages, layouts, server actions
components/               # UI (shadcn + domain)
lib/                      # supabase client, utils, date/utc helpers
scripts/                  # CSV seed utilities (operator-run)
public/
```

**Structure Decision**: Single **Next.js** project only for MVP1; no separate backend repo. Admin/seed scripts live under `scripts/` with service role key **local/CI only**.

## Complexity Tracking

No constitution violations requiring justification. *(Table intentionally empty.)*

## Phase 0 & Phase 1 outputs

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Contracts | [contracts/](./contracts/) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Agent context

Updated via `.specify/scripts/powershell/update-agent-context.ps1 -AgentType cursor-agent` after this plan was written.
