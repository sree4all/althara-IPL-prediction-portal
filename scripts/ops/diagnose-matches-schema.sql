-- Run this FIRST. Paste the full output when asking for help.
-- Confirms which Supabase project/schema you are connected to.

select current_database() as database_name, current_schema() as schema_name;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'matches'
order by ordinal_position;

select count(*) as total_rows from public.matches;

select * from public.matches limit 3;
