# Contract: Stage scoring configuration

## Endpoints (new or extended)

- `GET /api/admin/scoring/stages?season_year=2026`
- `PATCH /api/admin/scoring/stages` — body: array of `{ stage_slug, correct_points, incorrect_points }`

Existing `GET/PATCH /api/admin/config` may embed stage rows for single-load admin UI (implementation choice).

## Access

- Admin only → `403` otherwise

## Response shape (example)

```json
{
  "season_year": 2026,
  "stages": [
    { "stage_slug": "group", "label": "Group Stage", "correct_points": 2, "incorrect_points": 0 },
    { "stage_slug": "r32", "label": "Round of 32", "correct_points": 3, "incorrect_points": -1 },
    { "stage_slug": "final", "label": "Final", "correct_points": 20, "incorrect_points": -10 }
  ],
  "tournament_slot_points": [2, 2, 2, 2, 2],
  "match_bonus_points": 2
}
```

## Scoring engine rules (`applyMatchScoring`)

1. Load `stage_scoring_config` row for `match.tournament_stage` and `season_year`.
2. If `match.winner` is null → error (unchanged).
3. Compare `prediction.predicted_winner` to `match.winner` (string equality; `Draw` literal matches).
4. If equal → ledger `+correct_points`; else → ledger `+incorrect_points` (negative allowed).
5. Random match bonuses: use `bonus_prompts` per-prompt overrides or `match_bonus_points` default (+2/0).
6. **Do not** use deprecated `lib/knockout/scoring.ts` IPL constants.

## Config change scope

- PATCH affects **future** scoring runs only (no retroactive ledger rewrite).

## Draw

- When `match.winner === "Draw"`, only predictions with `predicted_winner === "Draw"` receive `correct_points`.
