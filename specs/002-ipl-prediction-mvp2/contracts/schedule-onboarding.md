# Contract: Schedule + onboarding payload

## Endpoint

- `GET /api/matches/full-schedule`

## Purpose

Return complete IPL 2026 schedule for MVP2 plus onboarding metadata shown on first visits.

## Response (200)

```json
{
  "season_year": 2026,
  "onboarding": {
    "title": "How predictions work",
    "items": [
      "Match picks lock 30 minutes before match start (UTC).",
      "Tournament answers lock at a configured UTC time.",
      "Bonus prompts may be match-specific or tournament-wide."
    ]
  },
  "matches": [
    {
      "id": "uuid",
      "external_key": "M1",
      "home_team": "RCB",
      "away_team": "SRH",
      "match_time_utc": "2026-03-28T13:30:00Z",
      "status": "scheduled"
    }
  ]
}
```

## Rules

- `matches` ordered by `match_time_utc`.
- Internal schedule source of truth is UTC.
