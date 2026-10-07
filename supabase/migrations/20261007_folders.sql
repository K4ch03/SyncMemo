-- Run once in Supabase SQL Editor before deploying the folder-enabled app.
begin;
create table if not exists public.folders (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 created_at timestamptz not null default now(),
 unique(owner_id,id)
);
alter table public.folders enable row level security;
drop policy if exists own_folders on public.folders;
create policy own_folders on public.folders for all to authenticated
 using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.folders from anon;
grant select,insert,update,delete on public.folders to authenticated;
alter table public.notes add column if not exists folder_id uuid;
-- A composite foreign key prevents linking a note to another account's folder.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='notes_own_folder') then
 alter table public.notes add constraint notes_own_folder foreign key(owner_id,folder_id)
 references public.folders(owner_id,id) on delete set null (folder_id);
 end if;
end $$;
create index if not exists notes_folder on public.notes(folder_id);
create or replace function public.save_note_with_folder(note_id uuid,note_title text,note_body jsonb,note_text text,expected_revision integer,note_folder uuid)
 returns public.notes language plpgsql security invoker set search_path='' as $$
 declare saved public.notes;
 begin
 if expected_revision=0 then
  insert into public.notes(id,title,body,plain_text,folder_id) values(note_id,note_title,note_body,note_text,note_folder)
  on conflict(id) do nothing returning * into saved;
 else
  update public.notes set title=note_title,body=note_body,plain_text=note_text,folder_id=note_folder,updated_at=now(),revision=revision+1
  where id=note_id and owner_id=auth.uid() and revision=expected_revision returning * into saved;
 end if;
 if saved.id is null then raise exception 'CONFLICT'; end if;
 return saved;
 end;
$$;
revoke all on function public.save_note_with_folder(uuid,text,jsonb,text,integer,uuid) from public;
grant execute on function public.save_note_with_folder(uuid,text,jsonb,text,integer,uuid) to authenticated;
commit;
