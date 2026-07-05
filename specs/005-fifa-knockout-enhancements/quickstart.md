# Quickstart — 005 FIFA Knockout Enhancements (staging)

**Purpose**: Verify Tournament Forecast, kickoff-gated picks, bracket propagation, schedule sync, and AI odd-match bonuses on staging.

## Prerequisites

- Node 20 LTS, `npm install`
- `.env.local` with Supabase keys; optional `OPENAI_API_KEY` for AI bonus generation
- Migration `0036_*` applied
- FIFA fixtures imported (`npm run seed -- fifa ./docs/fifa`)
- Admin profile: `profiles.role = admin`
- At least two regular test users

## 1. Tournament Forecast tab

| Step | Action | Expected |
|------|--------|----------|
| Open | Navigate to `/forecast` | Three linked sections: semi-finalists (4), finalists (2), winner (1) |
| Bracket | Select Canada as semi-finalist | Morocco not selectable (same M89 feeder group) |
| Save | Save complete forecast | 200 OK; reload shows saved picks |
| Lock | Set QF match time to past (staging SQL) or wait | Edits rejected with lock message |

## 2. Forecast statistics toggle

| Step | Action | Expected |
|------|--------|----------|
| Default | Sign in as regular user → `/forecast/stats` | Hidden or 403 |
| Admin | Same URL as admin | Aggregate counts visible |
| Toggle | Admin enables forecast stats in Tournament Settings | Regular user can open stats on refresh |
| Privacy | With 1–2 forecasts total | Percentages suppressed |

## 3. Hide picks until kickoff

| Step | Action | Expected |
|------|--------|----------|
| Setup | User A and B predict same upcoming match before kickoff | — |
| Regular | User A opens community picks / prediction-stat for match | Sees only own pick |
| Admin | Admin opens same views | Sees A and B |
| Post-kickoff | After `match_time_utc` | Both users see all pre-lock submitters |

## 4. Winner propagation

| Step | Action | Expected |
|------|--------|----------|
| Record | Admin records winner for R32 M73 | M89 home or away slot shows winner team name |
| View | Open M89 in matches list | Advancing team visible; opponent TBD until M75 completes |

## 5. Schedule sync

| Step | Action | Expected |
|------|--------|----------|
| Edit CSV | Change kickoff on a future match in `docs/fifa/matches.csv` | — |
| Sync | Admin → Tournament Settings → Sync schedule | `match_time_utc` updated; propagated team names unchanged |

## 6. AI odd-match bonus

| Step | Action | Expected |
|------|--------|----------|
| Generate | Admin runs generate missing odd bonuses | Prompt created for next odd `match_number` without bonus |
| Edit | Admin adjusts wording/options | Saved |
| Score | Complete match with correct/incorrect bonus | Ledger +3 or 0 only (never negative) |

## 7. Lint and unit tests

```bash
npm run lint
npm test -- tests/unit/bracket-eligibility.test.ts tests/unit/bracket-progression.test.ts
```

## Rollback notes

- Forecast answers: truncate `tournament_forecast_answers` if resetting test data
- Disable AI bonuses: deactivate prompts in admin; ledger rows remain historical
