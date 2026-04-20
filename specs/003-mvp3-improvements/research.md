# Research & decisions — MVP3

**Feature**: `specs/003-mvp3-improvements/spec.md`  
**Date**: 2026-04-20

## 1. History ordering (FR-001)

**Decision**: Sort match history rows by **numeric match index** parsed from `matches.external_key` (pattern `M` + digits, case-insensitive), ascending. Secondary sort: `match_time_utc` ascending when keys tie or are unparsable.

**Rationale**: Matches spec assumption (“natural order” from M#). Avoids string sort where `M10` precedes `M2`.

**Alternatives considered**: Sort only by `match_time_utc` (rejected: user explicitly asked for M1, M2 ordering alignment with labels); store explicit `sort_index` column (deferred—can add if schedule numbering diverges from time).

---

## 2. Structured options for match bonuses (FR-002–003)

**Decision**: Persist allowed choices in Postgres, keyed to `bonus_prompts.id`, with a **normalized child table** (e.g. `bonus_prompt_options`: `id`, `prompt_id`, `label`, `value`, `sort_order`, timestamps) or equivalent. Mark prompts that use structured choices (e.g. `input_type` enum: `text` | `single_choice` on `bonus_prompts`, default `single_choice` for new prompts). Participant UI renders `<select>` (or radio) sourced from active options; free-text path retained only when `input_type = text`.

**Rationale**: Validates at DB/API layer; admin can reorder via `sort_order`; avoids opaque JSON without schema.

**Alternatives considered**: JSONB array on `bonus_prompts` (simpler migration, weaker constraints); hard-coded options in app (rejected).

---

## 3. Tournament naming, options, visibility (FR-004–007)

**Decision**:

- **Nav / page title**: Rename primary nav label from “Tournament” to a clearer string such as **“Season bonuses”** or **“Tournament picks”** (final copy in UI task); page H1/subcopy explains season-long bonus questions vs match picks.
- **Options**: Same pattern as match bonuses—options rows linked to `tournament_questions.id` (e.g. `tournament_question_options` table) or shared generic `question_options` with discriminator; **reuse single-choice UI** on tournament answer form.
- **Visibility**: Add columns on `tournament_questions`: e.g. `visible_after_utc timestamptz null` (show to participants when `now() >= visible_after` **or** null treated as “no date gate”), and `revealed_by_admin boolean not null default false` **or** `manually_hidden boolean`—simplest rule: row is **visible** iff `(revealed_by_admin = true OR (visible_after_utc IS NOT NULL AND now() >= visible_after_utc)) AND is_active` with clarification: **manual reveal** sets `revealed_by_admin = true` to unlock before date; if not revealed and date in future, hide. **Precedence** (per spec edge case): manual reveal overrides waiting for date; date still applies if admin never toggled reveal (only time unlocks).

**Rationale**: Meets “hidden until date or admin decides” with auditable fields.

**Alternatives considered**: Single `publish_at` only (insufficient for “admin decides” without reschedule); feature flags outside DB (rejected for transparency).

---

## 4. Leaderboard columns (FR-008)

**Decision**: **Single primary column** labeled **“Points”** (or “Total points”) showing `profiles.current_points` as the canonical in-app score. **Remove** separate “Legacy” and “Current” headers from the default table. If product still needs imported tally for parity, show **once** as optional footnote, profile drill-down, or omit in MVP3 per spec assumption (legacy not as competing column).

**Rationale**: Aligns UI with unified ledger-driven scoring; reduces confusion.

**Alternatives considered**: Sum `legacy_points + current_points` in one column (only if stakeholders want one number—documented as optional follow-up; default is `current_points` only).

---

## 5. Upcoming prediction status tab (FR-009–010)

**Decision**: New route (e.g. `/upcoming` or `/my-schedule`) in main nav. **Scope**: matches in **scheduled** (not completed) state and **before prediction lock** per existing lock policy (`match_time_utc - 30m` or project rule). For each row: show match label, lock time, **status**: not submitted / submitted; if submitted, show **predicted winner** (and bonus summary if trivial). Data from server: query `matches` filtered by status/time + left join `predictions` for `auth.uid()`.

**Rationale**: Meets “upcoming” focus; reuses existing prediction rows.

**Alternatives considered**: Include live matches (rejected for v1—send user to History/Match detail instead).

---

## 6. RLS / API surface

**Decision**: Follow existing MVP2 patterns—server components + Route Handlers with Supabase SSR client; admin mutations behind `profiles.role = admin`. New option tables: read for authenticated participants where parent prompt/question is visible; write for admin only.

---

## Resolved items (no remaining NEEDS CLARIFICATION)

All Technical Context unknowns from planning are resolved above for Phase 1 design.
