# Contract: Admin tabbed layout

## Route

- `GET /admin` — single page with client or server tabs

## Tabs

| Tab | Contents | Excluded |
|-----|----------|----------|
| **Match Predictions** | Match list, result entry, apply scoring, per-match bonus result fields | Tournament lock, stage matrix |
| **Tournament Settings** | `answer_lock_utc`, maintenance mode/banner, season bonus visibility, mega-bonus all-answers visibility | Match scoring matrix |
| **Bonus Points Settings** | Bonus prompts CRUD, tournament questions + options, mega-bonus answers view | Flat stage points |
| **Scoring Configuration** | `stage_scoring_config` editor, `tournament_slot_points`, default `match_bonus_points` | Match result entry |

## Removed from admin

- IPL KnockoutPanel (M71–M74 bracket placeholders)
- Links/copy referencing migration, legacy alias, IPL branding

## Navigation branding

- App shell title: `World Cup 2026 Predictions` (from `lib/brand.ts`)
- No FIFA trademark strings in tab labels
