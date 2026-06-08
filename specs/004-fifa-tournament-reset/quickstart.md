# Quickstart — 004 FIFA Tournament Reset (staging)

**Purpose**: Verify reset, import, Draw scoring, and admin tabs on a **staging** clone. Not for production until runbook signed off.

## Prerequisites

- Node 20 LTS, `npm install`
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Staging Supabase project (never first-run on production)
- Admin profile: `profiles.role = admin`

## 1. Apply migrations (when implemented)

```bash
# After 0027_* migration exists
npx supabase db push
# or apply SQL via Supabase dashboard
```

## 2. Maintenance + reset (operator)

1. Set maintenance mode in admin (or SQL).
2. Run `scripts/ops/reset-competition-data.sql` against staging DB.
3. Confirm: profiles exist, `matches` / `predictions` / `points_ledger` empty, `current_points = 0`.

## 3. Import FIFA schedule

```bash
npm run seed -- fifa ./docs/fifa
```

Verify ~104 matches, sample row `WC26-M1` has teams and `tournament_stage = group`.

## 4. Seed scoring matrix

Confirm `stage_scoring_config` has 7 rows for 2026 (or re-run seed post-hook).

## 5. App smoke test

```bash
npm run dev
```

| Step | Action | Expected |
|------|--------|----------|
| Branding | Open `/matches` | Title/nav show “World Cup 2026 Predictions”; no IPL copy |
| Draw pick | Save prediction with Draw on a group match | 200 OK |
| Admin tabs | Open `/admin` | Four tabs; knockout bracket panel absent |
| Stage config | Scoring tab → edit Final incorrect to −10 | Saves |
| Result | Admin records winner or Draw, apply scoring | Ledger deltas match matrix |
| Legacy | Visit `/login/legacy-alias`, `/api/migration/*` | 404 or removed routes |

## 6. Negative knockout test

1. Pick wrong team on an `r32` match; complete with winner.
2. Confirm user `current_points` decreases by 1 (per default matrix).

## 7. Lint

```bash
npm run lint
```

## Rollback

Restore staging DB snapshot taken in prerequisites; redeploy previous app version if code was deployed.
