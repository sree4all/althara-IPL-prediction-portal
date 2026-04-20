# Phase 0 Research — MVP2

**Feature**: `002-ipl-prediction-mvp2`  
**Date**: 2026-04-12

## Decision 1: Keep MVP1 stack and extend in place

- **Decision**: Continue with existing Next.js + Supabase architecture; no service split.
- **Rationale**: MVP1 is already running with this stack and meets cost/ops constraints.
- **Alternatives considered**:
  - Separate backend service (adds ops and deployment complexity)
  - New event-driven scoring service (premature for current scale)

## Decision 2: Model tournament questions as config + answer tables

- **Decision**: Create explicit tables for `tournament_questions` and `tournament_answers` rather than embedding as JSON on profile.
- **Rationale**: Better auditability, easier admin updates, simpler points attribution.
- **Alternatives considered**:
  - JSON blob on `profiles` (harder to version and query)
  - Fixed 5 columns in `profiles` (rigid, poor change history)

## Decision 3: Model bonuses as prompts with scope

- **Decision**: Introduce `bonus_prompts` table with `scope` (`match` or `tournament`) and optional `match_id` for match-scoped prompts.
- **Rationale**: Maps directly to FR-004 and admin control needs.
- **Alternatives considered**:
  - Hard-coded bonus fields in UI (requires deploy for changes)
  - Separate tables per scope (duplicate logic)

## Decision 4: Tournament answer lock enforcement

- **Decision**: Store single UTC lock timestamp in `tournament_config.answer_lock_utc`; enforce in both API and DB trigger/policy path.
- **Rationale**: Clarification requires one source of truth and immutable answers after lock.
- **Alternatives considered**:
  - Client-only lock (unsafe)
  - Per-question lock fields (overkill for MVP2)

## Decision 5: Community picks visibility rules

- **Decision**: Community list returns only users with submitted picks for that match; never include email.
- **Rationale**: Matches FR-009 and clarify decision; keeps social view simple and privacy-safe.
- **Alternatives considered**:
  - Show all users with “no pick” rows (noise, privacy concerns)

## Decision 6: Migration strategy for legacy name-based data

- **Decision**: Support two one-time reconciliation paths:
  1) admin-imported email mapping file,
  2) user alias claim against unclaimed legacy aliases.
- **Rationale**: Covers both known-email and ambiguous legacy records.
- **Alternatives considered**:
  - Email-only migration (drops users without reliable email)
  - Name-only fuzzy auto-merge (high collision risk)

## Decision 7: Points history as ledger

- **Decision**: Add `points_ledger` entries per scoring event (match, bonus, tournament question), then aggregate for history screen.
- **Rationale**: Transparent audit trail for “past predictions + corresponding points”.
- **Alternatives considered**:
  - Store only totals (insufficient traceability)
  - Recompute everything on read from raw picks (expensive and opaque)

## Decision 8: Admin role representation

- **Decision**: Use role flag/enum on `profiles` and enforce with RLS/API checks.
- **Rationale**: Minimal extension of current auth model.
- **Alternatives considered**:
  - External RBAC provider (unnecessary complexity for MVP2)

## Decision 9: Schedule onboarding UX

- **Decision**: Add lightweight onboarding panel tied to schedule page and first-visit state.
- **Rationale**: Meets FR-002 with minimal UX disruption.
- **Alternatives considered**:
  - Full walkthrough wizard (heavier implementation effort)

All technical clarifications are resolved; no remaining `NEEDS CLARIFICATION` items.
