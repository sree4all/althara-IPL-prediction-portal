# Contract: Predictions with Draw

## Endpoint

- `POST /api/predictions` (existing)

## Request body

```json
{
  "match_id": "uuid",
  "predicted_winner": "Mexico | South Africa | Draw",
  "bonus_answers": []
}
```

## Validation

- `predicted_winner` MUST be one of:
  - `matches.home_team` (exact string)
  - `matches.away_team` (exact string)
  - `Draw` (literal, case-sensitive)
- Reject team nicknames or partial names not matching stored team strings
- Lock rules unchanged (`match_time_utc - 30m`)

## UI contract (`MatchCard`)

- Three selectable outcomes: Home team label, Away team label, **Draw**
- Display stage scoring hint from `tournament_stage` (e.g. “Final: +20 / −10”)

## Admin result entry

- `POST /api/admin/matches/:id/apply-result` (or equivalent) accepts `winner` as home name, away name, or `Draw`
- Completing match sets `status = completed` then triggers scoring
