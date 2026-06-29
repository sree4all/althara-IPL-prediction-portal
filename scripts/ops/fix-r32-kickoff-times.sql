-- Round of 32 (M73–M88): update match_time_utc only.
--
-- STORAGE (matches table):
--   Column match_time_utc is timestamptz — always store the UTC instant (+00), NOT IST.
--   Same values produced by npm seed / parseKickoffCsvAsUtcIso(docs/fifa/matches.csv).
--
-- DISPLAY (UI):
--   Match cards convert UTC → IST (Asia/Kolkata) via formatIstDateTimeFriendly.
--   Lock uses UTC comparison: predictions close when now > match_time_utc (kickoff instant).
--
-- SOURCE TIMES (US Eastern wall clock in CSV → UTC below):
--   M76 Brazil vs Japan: 29 Jun 1:00 PM Eastern = 17:00 UTC = 10:30 PM IST
--
-- Paste into Supabase SQL editor.

begin;

update public.matches m
set
  match_time_utc = k.match_time_utc,
  updated_at = now()
from (
  values
    (73, '2026-06-28 19:00:00+00'::timestamptz), -- 28 Jun 3:00 PM Eastern
    (74, '2026-06-29 20:30:00+00'::timestamptz), -- 29 Jun 4:30 PM Eastern
    (75, '2026-06-30 00:00:00+00'::timestamptz), -- 29 Jun 8:00 PM Eastern
    (76, '2026-06-29 17:00:00+00'::timestamptz), -- 29 Jun 1:00 PM Eastern (Brazil–Japan)
    (77, '2026-06-30 21:00:00+00'::timestamptz), -- 30 Jun 5:00 PM Eastern
    (78, '2026-06-30 17:00:00+00'::timestamptz), -- 30 Jun 1:00 PM Eastern
    (79, '2026-07-01 00:00:00+00'::timestamptz), -- 30 Jun 8:00 PM Eastern
    (80, '2026-07-01 16:00:00+00'::timestamptz), --  1 Jul 12:00 PM Eastern
    (81, '2026-07-02 00:00:00+00'::timestamptz), --  1 Jul  8:00 PM Eastern
    (82, '2026-07-01 20:00:00+00'::timestamptz), --  1 Jul  4:00 PM Eastern
    (83, '2026-07-02 23:00:00+00'::timestamptz), --  2 Jul  7:00 PM Eastern
    (84, '2026-07-02 19:00:00+00'::timestamptz), --  2 Jul  3:00 PM Eastern
    (85, '2026-07-03 03:00:00+00'::timestamptz), --  2 Jul 11:00 PM Eastern
    (86, '2026-07-03 22:00:00+00'::timestamptz), --  3 Jul  6:00 PM Eastern
    (87, '2026-07-04 01:30:00+00'::timestamptz), --  3 Jul  9:30 PM Eastern
    (88, '2026-07-03 18:00:00+00'::timestamptz)  --  3 Jul  2:00 PM Eastern
) as k (match_number, match_time_utc)
where m.match_number = k.match_number
   or m.external_key = 'WC26-M' || k.match_number::text
   or m.external_key = 'wc2026:m' || k.match_number::text;

commit;

-- Verify (ordered by kickoff). In UI, times will show as IST.
select
  match_number,
  external_key,
  home_team,
  away_team,
  match_time_utc,
  match_time_utc at time zone 'Asia/Kolkata' as kickoff_ist_local
from public.matches
where match_number between 73 and 88
   or external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
order by match_time_utc, match_number;
