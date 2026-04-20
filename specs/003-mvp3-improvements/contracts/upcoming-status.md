# Contract: Upcoming prediction status

## Purpose

Support the MVP3 **Upcoming** (or similarly named) tab: list matches that are still open for predictions and show whether the current user has submitted picks.

## Suggested endpoint

- `GET /api/upcoming-predictions` (name may vary; single GET preferred)

## Response (200)

```json
{
  "season_year": 2026,
  "matches": [
    {
      "match_id": "uuid",
      "label": "M3 — RCB vs SRH",
      "external_key": "M3",
      "match_time_utc": "2026-05-10T14:00:00.000Z",
      "lock_time_utc": "2026-05-10T13:30:00.000Z",
      "has_prediction": true,
      "predicted_winner": "RCB",
      "bonus_summary": "A"
    },
    {
      "match_id": "uuid",
      "label": "M4 — …",
      "external_key": "M4",
      "match_time_utc": "…",
      "lock_time_utc": "…",
      "has_prediction": false,
      "predicted_winner": null,
      "bonus_summary": null
    }
  ]
}
```

## Rules

- **401** if unauthenticated.
- Include only matches that qualify as “upcoming” per product rules (e.g. `status = scheduled` and before lock window—align with `enforce_prediction_lock` / match lock policy).
- Exclude completed or abandoned fixtures from this list unless product explicitly extends scope (default: exclude).
- `bonus_summary` optional: short text if match has bonus prompts answered; null if none or not submitted.

## Client

- New nav item pointing to a page that consumes this payload and renders a table or card list.
