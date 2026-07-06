-- Unify duplicate FIFA fixture rows (wc2026:m{n} vs WC26-M{n}).
-- Results and predictions live on WC26-M{n}; legacy wc2026:m{n} rows often keep
-- match_number but stay status=scheduled with no winner.
--
-- Safe path (predictions already on canonical rows):
--   1) Set match_number on WC26-M{n} from external_key
--   2) Delete wc2026:m{n} when WC26-M{n} exists
--
-- If you must repoint predictions from legacy → canonical, temporarily disable
-- enforce_prediction_lock or use service-role during maintenance.

begin;

update public.matches
set match_number = substring(external_key from 'M([0-9]+)$')::int,
    updated_at = now()
where external_key ~ '^WC26-M[0-9]+$'
  and match_number is null;

delete from public.matches legacy
where legacy.external_key ~* '^wc2026:m[0-9]+$'
  and exists (
    select 1
    from public.matches canon
    where canon.external_key = 'WC26-M' || substring(legacy.external_key from 'm([0-9]+)$')
  );

commit;

-- Verify
select external_key, match_number, winner, status, scored_at
from public.matches
where match_number between 89 and 96
order by match_number;
