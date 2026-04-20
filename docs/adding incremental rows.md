Best path: **use CSV import (recommended)**, not manual SQL, unless it’s just 1-2 rows.

## Recommended workflow (append new predictions)

### 1) Create a **delta CSV** (new file) with only new submissions  
You can also reuse full file, but delta is cleaner/faster.

Required headers (Google Form export style works):
- `Name`
- `Select the match` (must contain `M1`, `M2`, etc.)
- `Winner Prediction`
- `Bonus Question Answer` (optional)
- `Submitted at` (important for latest-row logic)

### 2) Run import command
If users have already signed in / claimed alias:

```bash
npm run seed -- legacy-predictions ./docs/predictions_incremental.csv 2026
```

If names in CSV match `profiles.display_name` better than aliases, use:

```bash
npm run seed -- legacy-predictions ./docs/predictions_incremental.csv 2026 --display-name
```

### 3) Recompute scores
Imported rows update `predictions`, but points depend on scored matches.  
Run your recompute (like we just did) after import if needed.

---

## Do I need a brand new CSV?
- **Not required**, but **recommended** (delta file).
- Full historical file also works because import is upsert + latest timestamp per `(person, match)`.

---

## If you want SQL instead (manual)
Use this only for small edits.

```sql
insert into public.predictions (user_id, match_id, predicted_winner, bonus_pick, updated_at)
values (
  '<user_uuid>',
  (select id from public.matches where external_key = 'M29'),
  'RCB',
  'A',
  now()
)
on conflict (user_id, match_id)
do update set
  predicted_winner = excluded.predicted_winner,
  bonus_pick = excluded.bonus_pick,
  updated_at = excluded.updated_at;
```

If that match uses **multi bonus prompts**, also write to `prediction_bonus_answers` (not just `bonus_pick`).

---

If you share one sample new row, I can validate the exact CSV format before you run it.