# Phase 0: Research & Decisions — IPL Prediction Portal

**Feature**: `001-ipl-prediction-portal`  
**Date**: 2026-04-12

## 1. Application stack

| Decision | Next.js (App Router) + React + TypeScript |
| Rationale | Spec targets a serverless web app on Vercel; App Router supports server components, route handlers, and edge-friendly deployment. |
| Alternatives considered | Remix (fewer ecosystem examples for Supabase starter patterns); SPA-only (worse SEO and auth callback handling for MVP). |

## 2. Hosting

| Decision | Vercel (Hobby / free tier for MVP) |
| Rationale | Matches “zero maintenance cost” and aligns with Next.js; serverless functions for API routes and cron if needed later. |
| Alternatives considered | Cloudflare Workers (extra glue for Supabase auth flows); self-hosted Node (violates low-ops goal). |

## 3. Data & auth

| Decision | Supabase (PostgreSQL + Auth + Row Level Security) |
| Rationale | Managed Postgres within free tier, built-in Google/email auth, RLS for per-user data, upsert-friendly SQL. |
| Alternatives considered | Planetscale + Clerk (extra vendors); Firebase (weaker relational model for leaderboard + match FKs). |

## 4. UI

| Decision | Tailwind CSS + shadcn/ui |
| Rationale | Spec requires mobile-first, accessible components; shadcn pairs with Next.js and supports toast/dialog patterns for copy in FR-011–FR-014. |
| Alternatives considered | MUI (heavier bundle); raw CSS (slower MVP). |

## 5. Time & lock semantics

| Decision | Store all instants as `timestamptz` in UTC; enforce lock in the database (RPC or trigger) using `now() AT TIME ZONE 'UTC'` / `now()` interpreted as UTC server-side, and compare to `match.match_time_utc - interval '30 minutes'`. Client displays UTC or labeled local for readability but never authorizes submission alone. |
| Rationale | FR-001/FR-004 require authoritative UTC; client clocks are untrusted. |
| Alternatives considered | Lock only in browser (insecure); store local wall times (error-prone). |

## 6. Prediction upsert

| Decision | `UNIQUE (user_id, match_id)` on `predictions`; `INSERT ... ON CONFLICT DO UPDATE` (or Supabase upsert) with server-side lock check before write. |
| Rationale | FR-005; prevents duplicate rows; single round-trip. |

## 7. Profiles vs auth users

| Decision | `profiles.id` = `auth.users.id` (UUID), one row per user; `display_name` from migration; `legacy_points` / `current_points` / `rank` maintained by SQL or periodic recompute job. |
| Rationale | FR-007–FR-009; simple join for leaderboard. |
| Alternatives considered | Separate email table (unnecessary if Supabase auth email is source of truth). |

## 8. Legacy import & name-only rows

| Decision | **Default for planning**: Automated seeding applies only to CSV rows with a **valid, joinable email** matching `auth.users` after sign-up or pre-seeded profile row; **name-only or bad-email rows are skipped** with operator-visible errors (aligns with recommended Option A from `/speckit-clarify`). Stakeholder may override in a future spec amendment. |
| Rationale | Bounded MVP, avoids incorrect merges; matches assumption in spec about operational handling. |

## 9. Duplicate public display names

| Decision | Store `display_name` as imported; for leaderboard, secondary sort by `user_id` or show subtle disambiguator (e.g., last 4 of id) only if UX testing shows confusion—implement minimal disambiguation in UI if two visible rows share the same string. |
| Rationale | Edge case in spec; no merge of scores. |

## 10. Testing

| Decision | Vitest + React Testing Library for units/components; Playwright for critical flows (login mock, lock boundary); DB tests optional via Supabase local or SQL tests in CI. |
| Rationale | Pragmatic for small team; aligns with Next.js ecosystem. |

## 11. Observability (MVP)

| Decision | Vercel function logs; Supabase logs; minimal structured `console`/`logger` in API routes; no paid APM on day one. |
| Rationale | FR-017 free-tier constraint. |

All items above resolve prior “NEEDS CLARIFICATION” placeholders in the implementation plan technical context.
