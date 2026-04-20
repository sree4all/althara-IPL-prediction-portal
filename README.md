# Althara IPL Prediction Portal

Next.js + Supabase web app for IPL match predictions (GMT/UTC lock rules, leaderboard, CSV seeding).

## Architecture

![System architecture](docs/app-architecture.svg)

Editable diagram (diagrams.net / draw.io): [`docs/app-architecture.drawio`](docs/app-architecture.drawio).

## Docs

- Feature spec & setup: [`specs/001-ipl-prediction-portal/quickstart.md`](specs/001-ipl-prediction-portal/quickstart.md)
- MVP2 setup and verification: [`specs/002-ipl-prediction-mvp2/quickstart.md`](specs/002-ipl-prediction-mvp2/quickstart.md)
- Implementation plan: [`specs/001-ipl-prediction-portal/plan.md`](specs/001-ipl-prediction-portal/plan.md)
- Tasks: [`specs/001-ipl-prediction-portal/tasks.md`](specs/001-ipl-prediction-portal/tasks.md)

## Quick start

1. Copy `.env.local.example` to `.env.local` and add Supabase URL + anon key (and service role for `pnpm seed` only).
2. Apply SQL in `supabase/migrations/` via Supabase SQL editor (or Supabase CLI).
3. Enable **Google** and **Email** providers in Supabase Auth; set redirect URL to `http://localhost:3000/auth/callback` (and production URL on deploy).
4. `npm install` / `pnpm install`
5. `pnpm dev` → [http://localhost:3000](http://localhost:3000)

## Scripts

See [`scripts/README.md`](scripts/README.md) (includes **`npm run seed:demo`** for empty DB smoke data and **Google Sheet → CSV** onboarding).

## MVP2 routes

- Participant: `/matches`, `/history`, `/match/[id]`
- Admin: `/admin`

## License

Private / project use.
