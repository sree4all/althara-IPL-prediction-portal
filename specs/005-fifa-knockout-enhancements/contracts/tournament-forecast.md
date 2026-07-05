# Contract: Tournament Forecast

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/forecast/eligibility` | Signed-in | Eligible teams, exclusion groups, lock instant, eliminated teams |
| GET | `/api/forecast/answers` | Signed-in | Current user’s forecast row (or empty defaults) |
| PUT | `/api/forecast/answers` | Signed-in | Upsert forecast; rejected if locked or invalid |
| GET | `/api/forecast/stats` | Signed-in + (admin OR `forecast_stats_visible`) | Aggregate distributions |

## UI

| Route | Description |
|-------|-------------|
| `/forecast` | Participant forecast form (3 linked steps) |
| `/forecast/stats` | Aggregate stats; nav hidden when toggle off and non-admin |

## GET `/api/forecast/eligibility`

**Response 200**:

```json
{
  "season_year": 2026,
  "locked": false,
  "lock_at_utc": "2026-07-09T20:00:00.000Z",
  "eligible_teams": ["Canada", "Morocco", "..."],
  "eliminated_teams": ["Team X"],
  "sf_exclusion_groups": [
    { "group_id": "r16-89", "teams": ["Canada", "South Africa", "Morocco", "Netherlands"] }
  ],
  "final_halves": [
    { "half_id": "left", "teams": ["..."] },
    { "half_id": "right", "teams": ["..."] }
  ]
}
```

- `eligible_teams`: knockout teams still alive (R32/R16 complete results applied).
- `sf_exclusion_groups`: at most one pick per group for semi-finalists.

## PUT `/api/forecast/answers`

**Request**:

```json
{
  "semi_finalist_teams": ["Canada", "Germany", "Brazil", "France"],
  "finalist_teams": ["Canada", "Brazil"],
  "winner_team": "Brazil"
}
```

**Validation errors** (400):

| Code | Condition |
|------|-----------|
| `FORECAST_LOCKED` | `now >= lock_at_utc` |
| `INVALID_SEMI_FINALISTS` | Wrong count, unknown team, or two from same exclusion group |
| `INVALID_FINALISTS` | Not subset of semi-finalists or same final half |
| `INVALID_WINNER` | Not in finalist set |
| `ELIMINATED_TEAM` | Team already knocked out |

**Response 200**: Saved row with `updated_at`.

## GET `/api/forecast/stats`

**Response 200**:

```json
{
  "season_year": 2026,
  "total_forecasts": 42,
  "show_percentages": true,
  "semi_finalists": [{ "team": "Brazil", "count": 18, "pct": 42.9 }],
  "finalists": [{ "team": "Brazil", "count": 12, "pct": 28.6 }],
  "winners": [{ "team": "Argentina", "count": 15, "pct": 35.7 }]
}
```

- When `total_forecasts < 3`: `show_percentages: false`; omit or null `pct`.

**Response 403**: Non-admin and `forecast_stats_visible === false`.

## Admin

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/admin/forecast/visibility` | `{ "forecast_stats_visible": true }` |

Stored on `tournament_config` for season 2026.

## Scoring (optional same release)

Forecast answer scoring is **out of scope** for v1 contract unless enabled in tasks; capture and stats only.
