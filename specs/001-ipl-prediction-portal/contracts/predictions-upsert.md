# Contract: Upsert prediction

## Purpose

Create or update the signed-in user’s prediction for a match (FR-005). Reject when lock window has started (FR-004, FR-014).

## Request

**Method**: `POST`  
**Path** (example): `/api/predictions` or RPC `upsert_prediction`

**Headers**: `Content-Type: application/json`, session cookie or `Authorization: Bearer <access_token>`.

**Body** (JSON):

```json
{
  "match_id": "uuid",
  "predicted_winner": "string",
  "bonus_pick": "string | null"
}
```

## Success response

**Status**: `200` or `201`

```json
{
  "prediction_id": "uuid",
  "match_id": "uuid",
  "updated_at": "2026-04-12T12:00:00.000Z",
  "was_update": true
}
```

- `was_update: false` → first save (FR-012 toast).
- `was_update: true` → revision before lock (FR-013 toast).

## Error responses

| Status | Code | Message (user-facing from spec) |
|--------|------|----------------------------------|
| `403` | `MATCH_LOCKED` | "Sorry! The deadline for this match was 30 minutes before start time (GMT). This match is now locked." |
| `401` | `UNAUTHORIZED` | Generic sign-in required |
| `404` | `MATCH_NOT_FOUND` | Match does not exist |
| `400` | `VALIDATION` | Invalid team code or payload |

## Server rules

1. Resolve `user_id` from session; never trust client `user_id`.
2. Load `match_time_utc`; deny if `now() > match_time_utc - 30 minutes` (strict `>` per spec edge case).
3. Upsert on `UNIQUE (user_id, match_id)`.
