# Contract: Community picks kickoff gate

## Scope

Regular **match-winner** community visibility only (not Tournament Forecast aggregates).

## Affected routes

| Route | Component |
|-------|-----------|
| `GET /api/community-picks?match_id=` | `CommunityPicksList` on match detail |
| `GET /api/prediction-stat/by-match?match_id=` | Prediction Stat drill-down |

## Gate rule

```
revealed = now >= match.match_time_utc OR viewer.role === 'admin'
```

| Condition | Response rows |
|-----------|---------------|
| `revealed === true` | All pre-lock submitters (existing behavior) |
| `revealed === false`, regular user | Only rows where `user_id === viewer.id` |
| `revealed === false`, admin | All rows |

## Response shape (unchanged)

```json
{
  "match_id": "uuid",
  "kickoff_utc": "2026-07-04T17:00:00.000Z",
  "picks_revealed": false,
  "rows": [
    { "user_display_name": "Player", "predicted_winner": "Brazil" }
  ]
}
```

Add optional fields `kickoff_utc` and `picks_revealed` so UI can show “Community picks unlock at kickoff”.

## Prediction Stat entries

Same filter on `entries[]` before kickoff for non-admins. Bonus answers within an entry follow the parent row visibility (hide other users’ full entry).

## FR-019 audit surfaces

| Surface | Action |
|---------|--------|
| `/api/community-picks` | Gate applied |
| `/api/prediction-stat/by-match` | Gate applied |
| `/api/prediction-stat/matches` | List match metadata only — no other users’ picks |
| History | Already user-scoped |
| Leaderboard | Points only — no pick exposure |

## Errors

| Status | When |
|--------|------|
| 401 | Unauthenticated |
| 404 | Unknown match |
