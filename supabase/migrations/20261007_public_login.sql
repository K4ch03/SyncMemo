-- Existing installations: run this in Supabase SQL Editor once.
-- Existing notes and ownership remain unchanged. Safe to rerun.
begin;
alter table public.notes enable row level security;
drop policy if exists own_notes on public.notes;
create policy own_notes on public.notes for all to authenticated
 using ((select auth.uid()) = owner_id)
 with check ((select auth.uid()) = owner_id);
-- Keep the unused legacy allowlist table/function so old metadata is not destroyed.
commit;
