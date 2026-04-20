# Contract: Prediction history

## Endpoint

- `GET /api/history`

## Purpose

Return participant's own past predictions and points ledger contributions.

## Response (200)

```json
{
  "user_id": "uuid",
  "rows": [
    {
      "type": "match",
      "source_id": "uuid",
      "label": "M1 RCB vs SRH",
      "prediction": "RCB",
      "points_delta": 2,
      "status": "final"
    },
    {
      "type": "tournament_question",
      "source_id": "uuid",
      "label": "Top run-scorer?",
      "prediction": "Player Name",
      "points_delta": null,
      "status": "pending"
    }
  ]
}
```

## Rules

- Authenticated user sees only own rows.
- Points may be null/pending when outcomes unresolved.
