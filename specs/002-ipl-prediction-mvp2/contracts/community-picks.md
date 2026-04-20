# Contract: Community picks per match

## Endpoint

- `GET /api/community-picks?match_id=<uuid>`

## Purpose

Return all submitted picks for a specific match (submitters only).

## Response (200)

```json
{
  "match_id": "uuid",
  "match_label": "M1 RCB vs SRH",
  "rows": [
    {
      "user_display_name": "Sree",
      "predicted_winner": "RCB"
    }
  ]
}
```

## Rules

- Include only users with submitted pick for target match.
- Exclude emails and any sensitive fields.
- Non-submitters do not appear.
