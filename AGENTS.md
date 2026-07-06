# Agent instructions — althara-ipl-prediction-portal

## Cursor Cloud specific instructions

This repo is configured for **Cursor Cloud Agents** to push to GitHub, apply Supabase migrations, and trigger Vercel production deploys without local terminal access.

### Prerequisites (human setup once)

1. **Git** — repo is `sree4all/althara-ipl-prediction-portal` (Cloud Agents inherit GitHub access from Cursor).
2. **Secrets** — add variables from [`.cursor/secrets.example.env`](.cursor/secrets.example.env) in [Cursor Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents). Use **Runtime Secret** for tokens and passwords.
3. **Vercel** — connect the GitHub repo in Vercel; production deploys track **`main`**.

Full checklist: [`docs/cloud-agent-setup.md`](docs/cloud-agent-setup.md).

### Verify connectivity

```bash
npm run ops:verify-cloud
```

Fix any missing secret before migrations or deploys.

### Apply database migrations (Supabase)

Preferred path when `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_PASSWORD` are set:

```bash
npm run db:link:ci
npm run db:push
npm run db:migration-list
```

Run a single SQL file (ad-hoc fix or manual migration):

```bash
npm run db:execute -- supabase/migrations/0039_forecast_scoring_ledger.sql
```

Migration rules: [`supabase/migrations/README.md`](supabase/migrations/README.md) (GRANT + RLS on new tables).

### Deploy to production (Vercel)

**Default (recommended):** merge or push to **`main`**. Vercel auto-builds when GitHub receives the push.

Before merging migration + app changes:

1. `npm run lint`
2. `npm run build`
3. Apply pending SQL (`npm run db:push`)
4. Merge to `main`
5. Confirm deploy: `npm run ops:vercel:status` (needs `VERCEL_TOKEN`)

Manual prod deploy (if auto-deploy is unavailable):

```bash
npm run ops:vercel:deploy
```

### Operator scripts (service role required)

Scripts load `.env` / `.env.local` but **Cursor Secrets env vars take precedence**. Common commands:

| Task | Command |
|------|---------|
| Health check | `npm run diagnose:supabase` |
| Seed schedule | `npm run seed:ipl2026` |
| Recompute match points | `npm run recompute:matches` |
| End-of-tournament | [`docs/end-of-tournament-runbook.md`](docs/end-of-tournament-runbook.md) |

See [`scripts/README.md`](scripts/README.md).

### Safety

- Never commit secrets or write them into tracked files.
- Use feature branches + PRs for code; merge to `main` for production deploy.
- Treat `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_PASSWORD` as full database access.
