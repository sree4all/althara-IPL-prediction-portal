# AGENTS.md

## Cursor Cloud specific instructions

### What this is
A single Next.js 15 (App Router) web app — the Althara sports-tournament **prediction portal** (frontend + API routes + middleware in one process). The only backend is **Supabase** (Postgres + Auth + Data API). There is no separate backend service and no local database to run.

### Supabase / credentials
- The app connects to a **hosted Supabase project** via env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server/scripts only). In Cloud these are injected as secrets, so you normally do **not** need a `.env.local`.
- To run scripts locally against Supabase, `env.local.example` (note: no leading dot) can be copied to `.env.local`.
- The DB is a **live/shared project with real data** — do not run seed/fix/ops scripts (`npm run seed*`, `fix:*`, `recompute:*`, `sync:*`) against it, and clean up any throwaway auth users you create for testing.

### Commands (see `package.json` scripts)
- Dev server: `npm run dev` → http://localhost:3000
- Lint: `npm run lint` · Tests: `npm test` (node:test via tsx) · Build: `npm run build`
- Read-only health check: `npm run diagnose:supabase`

### Gotchas
- **Never run `npm run build` while `npm run dev` is running.** The production build overwrites `.next`, after which the dev server throws `Cannot find module './chunks/vendor-chunks/next.js'` 500s on every route. Recover by stopping dev, `rm -rf .next`, then `npm run dev` again.
- The entire app is **auth-gated** (Supabase Auth: Google OAuth + email magic-link only). Every page and API route requires a signed-in user (see `middleware.ts` / `lib/auth/require-user.ts`); there are no public pages. To exercise anything end-to-end you must authenticate. For automated checks you can mint a throwaway user with the service-role Admin API, capture `@supabase/ssr` cookies via a `createServerClient` sign-in, and call the app with that `Cookie` header — then delete the user afterward.
- Node 20 LTS is the documented target; Node 22 also works for lint/test/build/dev.
