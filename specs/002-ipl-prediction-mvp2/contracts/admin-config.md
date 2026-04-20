# Contract: Admin configuration APIs

## Endpoints

- `GET /api/admin/config`
- `PATCH /api/admin/config`
- `POST /api/admin/tournament-questions`
- `PATCH /api/admin/tournament-questions/:id`
- `POST /api/admin/bonus-prompts`
- `PATCH /api/admin/bonus-prompts/:id`

## Access

- Admin role only.
- Non-admin must receive `403`.

## Config shape (example)

```json
{
  "season_year": 2026,
  "answer_lock_utc": "2026-03-28T13:30:00Z",
  "questions": [
    { "id": "uuid", "slot_no": 1, "question_text": "Top run-scorer?", "is_active": true }
  ],
  "bonus_prompts": [
    {
      "id": "uuid",
      "scope": "match",
      "match_id": "uuid",
      "prompt_key": "powerplay_runs",
      "prompt_text": "Powerplay runs?",
      "is_active": true
    }
  ]
}
```

## Rules

- At most 5 active tournament question slots.
- Scope enum must be valid (`match` or `tournament`).
- Match-scoped prompt requires `match_id`.
