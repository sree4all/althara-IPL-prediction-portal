# Contract: Tournament questions + answers

## Endpoints

- `GET /api/tournament/questions`
- `POST /api/tournament/answers`

## GET response (200)

```json
{
  "answer_lock_utc": "2026-03-28T13:30:00Z",
  "is_locked": false,
  "questions": [
    {
      "id": "uuid",
      "slot_no": 1,
      "question_text": "Top run-scorer?",
      "is_active": true
    }
  ],
  "answers": [
    {
      "question_id": "uuid",
      "answer_text": "Player Name"
    }
  ]
}
```

## POST request

```json
{
  "answers": [
    { "question_id": "uuid", "answer_text": "Player Name" }
  ]
}
```

## POST responses

- `200`: answers upserted (before lock)
- `403`: lock exceeded (`TOURNAMENT_ANSWERS_LOCKED`)

## Rules

- Max 5 active questions.
- One answer per `(user, question)`.
- Edits allowed before lock, immutable after lock.
