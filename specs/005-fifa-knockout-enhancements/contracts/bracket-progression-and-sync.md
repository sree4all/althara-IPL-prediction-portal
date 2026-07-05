# Contract: Bracket progression and schedule sync

## Winner propagation

### Trigger

`POST /api/admin/matches/[id]/apply-result` — after successful winner save and before/after scoring (implementation: immediately after match row update).

### Behavior

1. Resolve source `match_number` from match row.
2. If `tournament_stage` ∉ `{r32, r16, qf, sf}` — skip (no propagation for group / third_place / final beyond normal completion).
3. Look up `BracketFeed[]` for source match → `{ targetMatchNumber, targetSlot }`.
4. Update target match:
   - `home_team` or `away_team` = winning team name string
   - Mirror `home_team_display` / `away_team_display` if columns exist
5. If target slot already contains a different confirmed team (not TBD/W{n}/empty), record conflict — do not overwrite; return in response.

### Response extension (apply-result 200)

```json
{
  "ok": true,
  "message": "Match scored. 12 ledger row(s) written.",
  "propagation": {
    "updated": [{ "match_number": 89, "slot": "home", "team": "Canada" }],
    "conflicts": []
  }
}
```

### Bracket feed examples (from FIFA CSV)

| Source | Target | Slot |
|--------|--------|------|
| M73 winner | M89 | home (W73) |
| M75 winner | M89 | away (W75) |
| M89 winner | M97 | home (W89) |
| … | … | … |

Full map maintained in `lib/fifa/bracket-map.ts`.

## Schedule sync

### Route

`POST /api/admin/fifa/sync-schedule` — admin only.

**Request** (optional):

```json
{
  "fifa_dir": "./docs/fifa",
  "season_year": 2026
}
```

Default: read bundled `docs/fifa/matches.csv`.

### Behavior

Calls `importFifaMatches(..., { mode: 'metadata' })`:

- Upsert by `external_key` (`WC26-M{n}`)
- Update: `match_number`, `match_time_utc`, `kickoff_tz_offset`, `venue_label`, `dataset_version`, `updated_at`
- **Preserve**: `home_team`, `away_team`, `winner`, `status`, `scored_at`

### Response 200

```json
{
  "ok": true,
  "updated": 104,
  "errors": []
}
```

### Side effects

- Forecast lock instant may change if earliest QF kickoff moves.
- Match prediction locks (`match_time_utc`) follow updated kickoffs per existing rules.

## Admin UI

**Tournament Settings** tab:

- Button: **Sync FIFA schedule (times & numbers)**
- Show last `dataset_version` from any match row

## Errors

| Status | Code | When |
|--------|------|------|
| 403 | — | Non-admin |
| 500 | `SYNC_FAILED` | CSV parse or DB errors (partial success reported in `errors[]`) |
