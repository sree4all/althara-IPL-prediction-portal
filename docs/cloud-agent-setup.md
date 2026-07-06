# Cloud Agent setup — Git, Supabase, Vercel

Use this once so **Cursor Cloud Agents** can deploy from `main` and run SQL without your local terminal.

## 1. Git (already wired)

| Item | Value |
|------|--------|
| GitHub repo | `sree4all/althara-ipl-prediction-portal` |
| Production branch | `main` |
| Agent branch prefix | `cursor/<name>-7de6` |

Cloud Agents clone via Cursor’s GitHub integration. No extra repo secret is required for git push/pull.

## 2. Cursor Cloud Agent secrets

Open **[Cursor → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents)** and add the variables below.

Use **Runtime Secret** for passwords and API tokens so they are redacted from chat and commits.

Copy names from [`.cursor/secrets.example.env`](../.cursor/secrets.example.env).

### Required for app + operator scripts

| Secret | Where to find it |
|--------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → publishable / anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → secret / service_role |

### Required for SQL migrations (`db push`)

| Secret | Where to find it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → Database password |

### Optional — Vercel CLI checks / manual deploy

| Secret | Where to find it |
|--------|------------------|
| `VERCEL_TOKEN` | [Vercel → Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel project → Settings → General |
| `VERCEL_PROJECT_ID` | Same page |

### Optional — AI odd-match bonuses

| Secret | Where to find it |
|--------|------------------|
| `OPENAI_API_KEY` | OpenAI dashboard |

## 3. Vercel ↔ GitHub

1. [Import the repo in Vercel](https://vercel.com/new) (if not already linked).
2. Set **Production Branch** to `main`.
3. Add the same Supabase env vars in **Vercel → Project → Settings → Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; needed for admin API routes)
4. Add your production auth callback in **Supabase → Authentication → URL Configuration** (e.g. `https://your-app.vercel.app/auth/callback`).

After this, every push/merge to `main` triggers a production deployment automatically.

## 4. Verify from a Cloud Agent

Start an agent and run:

```bash
npm run ops:verify-cloud
```

Expected: Git remote OK, Supabase REST reachable, CLI auth OK (when tokens set), Vercel token OK (when set).

## 5. Typical agent workflows

### Ship a feature with a migration

```bash
npm run lint && npm run build
npm run db:link:ci && npm run db:push
# merge PR to main → Vercel deploys
npm run ops:vercel:status
```

### Run one SQL file

```bash
npm run db:link:ci
npm run db:execute -- path/to/file.sql
```

### Production data ops

See [`scripts/README.md`](../scripts/README.md) and [`docs/end-of-tournament-runbook.md`](end-of-tournament-runbook.md).

## 6. Network allowlist (restricted egress)

If your Cloud Agent environment restricts outbound domains, allow at least:

- `github.com`, `api.github.com`
- `supabase.com`, `*.supabase.co`
- `vercel.com`, `api.vercel.com`

## 7. Security notes

- Do not commit `.env.local` or real tokens.
- `.cursorignore` keeps local env files out of agent context.
- Prefer PR → `main` over direct pushes when humans are reviewing changes.
