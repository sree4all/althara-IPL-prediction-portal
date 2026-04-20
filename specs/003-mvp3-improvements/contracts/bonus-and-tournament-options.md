# Contract: Bonus & tournament answer options (admin + participant)

## Purpose

Administrators manage allowed dropdown values for match-scoped bonus prompts and tournament questions. Participants read options and submit answers that validate against them.

## Admin (examples — paths TBD in implementation)

| Action | Description |
|--------|-------------|
| List options | `GET` … for `prompt_id` or `question_id` |
| Replace options | `PUT`/`POST` batch for a prompt/question (or individual CRUD) |

Admin routes **must** enforce `profiles.role = admin`.

## Option object

```json
{
  "id": "uuid",
  "label": "Option shown in UI",
  "value": "stored-value",
  "sort_order": 0
}
```

## Participant read (embedded in existing flows)

- Match prediction form: when loading bonus prompts for a match, include `input_type` and `options: Option[]` for each `single_choice` prompt.
- Tournament page: for each visible question, include `options: Option[]`.

## Submit validation

- Request body continues to send `answer_text` (or `value`) per existing tables; server rejects if not in allowed set when `input_type` is `single_choice` and options exist.

## Tournament visibility (participant read)

- Questions returned in tournament API only if visibility rules pass (`revealed_by_admin`, `visible_after_utc`, `is_active`, and global tournament lock). Hidden questions **omitted** from list or returned with `visible: false` per implementation choice (prefer omit for simpler UI).
