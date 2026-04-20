# Quickstart — IPL Prediction Portal (MVP)

## Prerequisites

- Node.js 20+ (LTS)
- `pnpm` or `npm` or `yarn`
- Supabase project (free tier)
- Vercel account (free tier)
- Google OAuth client (for Google sign-in) configured in Supabase Auth

## Environment variables

Create `.env.local` (Next.js) — **never commit secrets**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# Server-only if using service role for seeding (run locally or CI only):
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Database

1. In Supabase SQL editor, run migrations that create `profiles`, `matches`, `predictions` (see `data-model.md`).
2. Enable RLS policies as summarized in `data-model.md`.
3. Add auth trigger: on `auth.users` insert, create `profiles` row with `display_name` fallback from metadata or empty until migration merge.

## Local dev

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Seeding (operator)

1. Export Google Sheet tabs **Predictions** and **Settings** as CSV.
2. Run the repo’s seed script (to be added under `scripts/` or `pnpm seed`):
   - Parses CSV
   - Upserts `matches` by `external_key`
   - Upserts `profiles` legacy points and `display_name` where **email** matches
   - Logs skipped rows (missing email, duplicate email conflicts) to `import_batches` / stdout

## Deploy (Vercel)

1. Connect Git repo to Vercel.
2. Set environment variables to Supabase **public** URL + anon key (and any server secrets for admin routes).
3. Deploy; set auth redirect URLs in Supabase to production URL.

## Smoke checks

- Sign in with Google + magic link.
- See “Syncing History” then matches grid.
- Open match before lock: save prediction → success toast (FR-012).
- Change prediction before lock → FR-013 toast.
- After lock boundary (test with fixture match): FR-014 message.
