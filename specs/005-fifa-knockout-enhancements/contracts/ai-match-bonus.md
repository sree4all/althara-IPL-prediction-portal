# Contract: AI match bonus (odd fixtures)

## Scope

Automatic bonus prompts for **odd-numbered** matches from deployment cutoff forward. Flat **+3 / 0** scoring.

## Deployment cutoff

At deploy, record `max_odd_bonus_cutoff = max(match_number)` among matches that already have an active match-scoped `bonus_prompts` row. Generate only for odd `match_number > max_odd_bonus_cutoff` (or env `ODD_BONUS_START_MATCH_NUMBER` if set).

## Generation

### Route

`POST /api/admin/bonus/generate-odd-matches` — admin only.

**Request** (optional):

```json
{
  "season_year": 2026,
  "dry_run": false,
  "limit": 10
}
```

### Behavior

1. Query scheduled matches with odd `match_number`, no active match bonus, above cutoff.
2. For each (up to `limit`), call LLM with context: match number, home/away, stage, kickoff.
3. Insert `bonus_prompts`:
   - `scope = 'match'`
   - `source = 'ai_generated'`
   - `correct_points = 3`, `incorrect_points = 0`
   - `input_type = 'single_choice'`
   - `is_active = true`
4. Insert `bonus_prompt_options` (3–5 options).
5. `dry_run: true` returns proposed questions without insert.

### Script (ops)

```bash
npx tsx scripts/generate-odd-match-bonuses.ts [--dry-run] [--limit N]
```

Requires `OPENAI_API_KEY` (or configured provider).

### LLM output schema

```json
{
  "prompt_text": "Which team will score first?",
  "options": [
    { "label": "Canada", "value": "Canada" },
    { "label": "Morocco", "value": "Morocco" },
    { "label": "Neither / No goal", "value": "Neither" }
  ]
}
```

Reject generation if options empty, duplicate labels, or prompt fails basic content filter.

## Admin edit

Existing Bonus Points Settings panel:

- Edit `prompt_text`, options, `is_active`
- Set `correct_answer` at result time (unchanged flow)
- Change `source` to `manual` after heavy edit (optional)

## Scoring

In `applyMatchScoring` for each match bonus prompt:

```
if prompt.correct_points != null && prompt.incorrect_points != null:
  bonus_delta = correct ? prompt.correct_points : 0   // never negative
else:
  bonus_delta = correct ? scoring_config.match_bonus_points : 0
```

Incorrect AI bonus: **no ledger row** or `points_delta: 0` — never negative.

## Participant read

Unchanged match prediction flow — bonus prompts loaded with match include AI prompts when `is_active`.

## Errors

| Status | Code | When |
|--------|------|------|
| 403 | — | Non-admin |
| 503 | `AI_UNAVAILABLE` | Missing API key or provider error |
| 400 | `NO_MATCHES` | No qualifying odd matches |
