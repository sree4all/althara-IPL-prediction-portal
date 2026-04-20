# Data Model — MVP2 Extensions

**Feature**: `002-ipl-prediction-mvp2`  
**Base**: Extends MVP1 model in `specs/001-ipl-prediction-portal/data-model.md`

## Core entities added/extended

## 1) `tournament_config`

Single-row season config.

- `id` (uuid, PK)
- `season_year` (int, unique)
- `answer_lock_utc` (timestamptz, nullable but defaulted by migration/business rule)
- `created_at`, `updated_at`

## 2) `tournament_questions`

Exactly up to 5 active questions at a time.

- `id` (uuid, PK)
- `season_year` (int)
- `slot_no` (int, 1..5)
- `question_text` (text)
- `is_active` (bool)
- `display_order` (int)
- `created_by` (uuid, FK -> profiles.id, nullable for seeded)
- `created_at`, `updated_at`

**Constraints**

- unique `(season_year, slot_no)`
- check `slot_no between 1 and 5`

## 3) `tournament_answers`

User answers to tournament questions (editable only before lock).

- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles.id)
- `question_id` (uuid, FK -> tournament_questions.id)
- `answer_text` (text)
- `answered_at` (timestamptz)
- `updated_at` (timestamptz)

**Constraints**

- unique `(user_id, question_id)`

## 4) `bonus_prompts`

Bonus question configuration controlled by admin.

- `id` (uuid, PK)
- `season_year` (int)
- `scope` (text: `match` | `tournament`)
- `match_id` (uuid, FK -> matches.id, nullable if tournament scope)
- `prompt_key` (text)  # stable identifier
- `prompt_text` (text)
- `is_active` (bool)
- `display_order` (int)
- `created_at`, `updated_at`

**Constraints**

- check scope values
- if `scope='match'`, `match_id` required; if `scope='tournament'`, `match_id` null

## 5) `prediction_bonus_answers`

Participant answers to bonus prompts.

- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles.id)
- `match_id` (uuid, FK -> matches.id, nullable for tournament-scope prompts)
- `prompt_id` (uuid, FK -> bonus_prompts.id)
- `answer_text` (text)
- `updated_at` (timestamptz)

**Constraints**

- unique `(user_id, prompt_id, coalesce(match_id, '00000000-0000-0000-0000-000000000000'::uuid))`

## 6) `legacy_aliases`

One-time legacy mapping support.

- `id` (uuid, PK)
- `season_label` (text)
- `legacy_name` (text)
- `legacy_email` (text, nullable)
- `claimed_by_user_id` (uuid, FK -> profiles.id, nullable)
- `claimed_at` (timestamptz, nullable)
- `migration_payload` (jsonb, nullable)

**Constraints**

- unique `(season_label, legacy_name)`
- claimed alias cannot be claimed by another user

## 7) `points_ledger`

Audit trail for history points.

- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles.id)
- `source_type` (text: `match` | `bonus` | `tournament_question`)
- `source_id` (uuid)
- `points_delta` (numeric)
- `reason` (text)
- `awarded_at` (timestamptz)

## 8) Existing table extensions

- `profiles`
  - add `role` (text, default `user`; admin stored as `admin`)
- `predictions`
  - keep unique `(user_id, match_id)` and existing UTC lock trigger
  - optional: add `points_awarded` nullable summary field for quick UI display

## Relationships

- `profiles` 1-* `predictions`
- `profiles` 1-* `tournament_answers`
- `profiles` 1-* `prediction_bonus_answers`
- `profiles` 1-* `points_ledger`
- `matches` 1-* `predictions`
- `matches` 1-* `bonus_prompts` (when scope=match)
- `tournament_questions` 1-* `tournament_answers`
- `bonus_prompts` 1-* `prediction_bonus_answers`

## State / lock transitions

- Match predictions: editable until match lock (existing MVP1 rule).
- Tournament answers: editable until `tournament_config.answer_lock_utc`, immutable after.
- Bonus answers:
  - match-scoped follow match lock for linked match,
  - tournament-scoped follow tournament answers lock.

## RLS / access model summary

- Participant:
  - can read schedule, active prompts/questions, community picks for a match.
  - can upsert own predictions/answers before lock.
  - can read own history/ledger entries.
- Admin:
  - full CRUD for `bonus_prompts`, `tournament_questions`, `tournament_config`, migration/alias tools.
- Public sensitive fields (email, raw migration payload) not exposed in participant views.
