# Contract: List matches (grid)

## Purpose

Drive the match grid (User Story 2): upcoming/completed fixtures, lock indicator for UX (FR-015).

## Request

**Method**: `GET`  
**Path** (example): `/api/matches?status=scheduled` or RPC `list_matches`

**Auth**: Same session as predictions.

## Success response

**Status**: `200`

```json
{
  "matches": [
    {
      "id": "uuid",
      "label": "M21 — SRH vs RR",
      "home_team": "SRH",
      "away_team": "RR",
      "match_time_utc": "2026-04-13T13:30:00.000Z",
      "status": "scheduled",
      "client_lock_hint": true,
      "winner": null
    }
  ],
  "server_time_utc": "2026-04-12T12:00:00.000Z"
}
```

- `client_lock_hint`: `true` when `server_time_utc > match_time_utc - 30m` (for badge/disable inputs). UI must still handle errors from upsert if clock skew.

## Notes

- `server_time_utc` allows client to align display; optional if clients rely entirely on boolean hint.
