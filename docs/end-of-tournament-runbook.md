# End-of-Tournament Runbook (IPL 2026)

Use this checklist when the tournament ends and final scores must be locked in.

## 1) Freeze the app for users (recommended)

1. Open `/admin`.
2. In Tournament settings, enable **Maintenance mode**.
3. Keep or edit banner text (default: `അടിമ പണിയിലാണ്`).
4. Save settings.

Result: Non-admin users see only the maintenance banner while admins continue operating.

## 2) Confirm all match results are final

1. In Admin Match panel, verify each completed match has:
   - final winner
   - bonus result / per-prompt correct answers
2. Save any missing or corrected results.

Note: Saving/applying a match result triggers match scoring.

## 3) Run full match scoring backfill (safety)

From project root, run:

```bash
npm run recompute:matches
```

Purpose:
- Re-runs scoring for all completed matches.
- Repairs any missed or partial scoring outcomes.

## 4) Finalize Mega Bonus (tournament) scoring

1. Go to `/admin` -> Tournament scoring section.
2. Set and save correct answer for each tournament slot.
3. Click **Apply tournament scoring**.

This awards tournament question points to eligible users.

## 5) Validate final leaderboard consistency

Spot-check that:
- `profiles.current_points` matches ledger aggregate for sampled users.
- Top leaderboard rows look correct.

If drift is found, run global `current_points` sync from ledger before announcing final standings.

## 6) Re-open the app

1. In `/admin`, disable **Maintenance mode**.
2. Save settings.

---

## What is automated today

- Match scoring when admin applies a match result.
- Match scoring after completed-match imports through seed flow.
- New user bootstrap on sign-in.

## What is still manual today

- Triggering tournament (Mega Bonus) scoring from Admin.
- Running full backfill (`npm run recompute:matches`) as a final safety step.

---

## Recommended order on final day

1. Enable maintenance mode
2. Verify all match results
3. Run `npm run recompute:matches`
4. Apply tournament scoring
5. Validate leaderboard
6. Disable maintenance mode
