# Supabase migrations

## Data API grants (required for new tables)

Supabase is requiring explicit `GRANT`s on new `public` tables for PostgREST / supabase-js access. This repo runs **`npm run check:migrations`** before every production build.

### Rules (enforced after baseline)

Migrations numbered **above** `supabase/.migration-grant-check-baseline` that contain `CREATE TABLE public.*` must, in the **same file**:

1. `GRANT` at least one privilege on that table `TO anon`, `authenticated`, or `service_role`
2. `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY`

Use [`_TEMPLATE_new_public_table.sql`](./_TEMPLATE_new_public_table.sql) as a starting point.

### Backfill

Migration `0025_explicit_data_api_grants.sql` grants access on all existing tables. When you add a new table in `0026+`, include grants in that migration (do not rely on 0025 alone).

### Bump baseline

After adding a migration that only backfills grants (no new tables), you may raise the number in `supabase/.migration-grant-check-baseline` so older files stay exempt. Do **not** bump the baseline to skip grants on new tables.
