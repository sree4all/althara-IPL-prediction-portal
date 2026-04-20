# Quickstart — MVP3

## Prerequisites

- MVP2 migrations applied through latest (`0012` or current repo tip)
- `.env.local` with Supabase URL, anon key, service role for seeds
- Admin user (`profiles.role = 'admin'`) for option management

## 1) Apply MVP3 migrations

Add and run new migration(s) from `specs/003-mvp3-improvements/data-model.md` (option tables, `input_type`, tournament visibility columns). Use SQL Editor or `npm run db:push`.

**Existing data**: Backfill `tournament_questions.revealed_by_admin = true` (or equivalent) for rows that must stay visible post-migration so questions are not accidentally hidden.

## 2) Configure structured options

1. Admin → match bonus prompts: set **single_choice**, add option rows (labels/values).
2. Admin → tournament questions: add option rows; set **visible_after_utc** and/or **reveal** toggle per question.
3. Confirm participant UIs show dropdowns only for prompts with options.

## 3) Verify acceptance scenarios

| Area | Check |
|------|--------|
| History | Order is M1, M2, … M9, M10 (not lexicographic) |
| Leaderboard | Single primary points column; no Legacy/Current split |
| Nav | Tournament label reflects season-long bonuses |
| Upcoming tab | Lists open fixtures; shows submitted vs not |
| Lock | Past-lock matches not editable; tab list matches product rules |

## 4) Lint

```bash
npm run lint
```

## 5) Next command

Generate implementation tasks: **`/speckit.tasks`** (or project equivalent) against `specs/003-mvp3-improvements/spec.md` + this plan.
