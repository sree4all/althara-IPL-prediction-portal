# Quickstart — MVP2

## Prerequisites

- MVP1 app and migrations already applied
- Supabase project configured with auth providers
- `.env.local` populated (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for admin scripts)

## 1) Apply MVP2 schema changes

Create and run new SQL migration(s) for:

- tournament config / questions / answers
- bonus prompt configuration + answers
- legacy alias mapping
- points ledger
- profile role extension and related RLS policies

**Option A — SQL Editor**  
Paste and run each file under `supabase/migrations/` in order (see section 7 in this doc for the MVP2 list).

**Option B — Supabase CLI** (repo is initialized with `supabase/config.toml`):

1. Install/use CLI: `npx supabase --version` (or install the [Supabase CLI](https://supabase.com/docs/guides/cli)).
2. Log in: `npx supabase login`
3. Link the project: `npm run db:link` (or `npx supabase link --project-ref <your-ref>` from the repo root).
4. Push migrations to the linked remote: `npm run db:push`  
   Inspect pending/applied: `npm run db:migration-list`

For a **fully local** Postgres (Docker), use `npx supabase start` then `npx supabase db reset` (applies all migrations to the local stack). Match `[db].major_version` in `supabase/config.toml` to your hosted Postgres major version if you rely on local for parity.

## 2) Seed full IPL 2026 schedule and baseline config

- Import full schedule via extended seed script
- Seed 5 tournament question slots (active/inactive as needed)
- Seed initial tournament lock (or rely on default = first league match)
- Seed optional match-scoped bonus prompts

## 3) Verify participant journey

1. Sign in as participant.
2. Open schedule page and onboarding helper.
3. Submit match prediction + any active bonus fields.
4. Submit tournament answers before lock; re-edit once; verify persistence.
5. Confirm post-lock edit is blocked.
6. Open history and confirm points/pending rows.
7. Open match detail and verify community picks list excludes non-submitters.

## 4) Verify admin journey

1. Sign in as admin role.
2. Open admin config.
3. Toggle bonus scope and activate/deactivate prompts.
4. Edit one tournament question text and save.
5. Set tournament answers lock timestamp and verify participant behavior updates.

## 5) Verify migration/alias mapping

1. Import legacy alias dataset.
2. Test email-based auto-link with known user.
3. Test alias claim flow for user without known email.
4. Verify duplicate claim is blocked.

## 6) Build and lint

- `npm run lint`
- `npm run build`

Both must pass before generating tasks/implementation.

## 7) Migration runbook

1. Apply MVP2 SQL migrations in strict order:
   - `supabase/migrations/0004_mvp2_schema.sql`
   - `supabase/migrations/0005_mvp2_rls.sql`
   - `supabase/migrations/0006_mvp2_locks.sql`
   - `supabase/migrations/0007_mvp2_bonus_unique.sql`
   - `supabase/migrations/0008_mvp2_rls_fixes.sql`
   - `supabase/migrations/0009_scoring_config_and_admin_policies.sql`
   - `supabase/migrations/0010_legacy_prediction_staging.sql` (staging table + lock bypass + migrate RPC)
   - `supabase/migrations/0011_profiles_legacy_alias_onboarding.sql` (one-time claim/skip gate for new signups)
   - `supabase/migrations/0012_legacy_aliases_rls_select_own.sql` (RLS: read own claimed legacy alias row)
2. Seed optional alias rows: `pnpm seed aliases ./legacy-aliases.csv`
3. Open `/admin` and set lock/questions/prompts.
4. Validate `/history` and `/match/[id]` behavior with participant users.
