-- Run once in Supabase SQL Editor. Then add your email to allowed_accounts below.
create table public.allowed_accounts (email text primary key check (email=lower(email)));
alter table public.allowed_accounts enable row level security;
revoke all on public.allowed_accounts from anon, authenticated;
create or replace function public.is_allowed() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.allowed_accounts a join auth.users u on lower(u.email)=a.email where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.is_allowed() from public;
grant execute on function public.is_allowed() to authenticated;
create table public.notes (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null default '' check(length(title)<=200),
 body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
 plain_text text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision integer not null default 1 check(revision>0)
);
create index notes_owner_updated on public.notes(owner_id,updated_at desc);
alter table public.notes enable row level security;
create policy own_notes on public.notes for all to authenticated
 using ((select auth.uid())=owner_id and (select public.is_allowed()))
 with check ((select auth.uid())=owner_id and (select public.is_allowed()));
revoke all on public.notes from anon;
grant select,insert,update,delete on public.notes to authenticated;
create or replace function public.save_note(note_id uuid,note_title text,note_body jsonb,note_text text,expected_revision integer)
 returns public.notes language plpgsql security invoker set search_path='' as $$
 declare saved public.notes;
 begin
 if expected_revision=0 then
  insert into public.notes(id,title,body,plain_text) values(note_id,note_title,note_body,note_text) on conflict(id) do nothing returning * into saved;
 else
  update public.notes set title=note_title,body=note_body,plain_text=note_text,updated_at=now(),revision=revision+1
  where id=note_id and owner_id=auth.uid() and revision=expected_revision returning * into saved;
 end if;
 if saved.id is null then raise exception 'CONFLICT'; end if;
 return saved;
 end;
$$;
create or replace function public.delete_note(note_id uuid,expected_revision integer)
 returns void language plpgsql security invoker set search_path='' as $$
 begin
 delete from public.notes where id=note_id and owner_id=auth.uid() and revision=expected_revision;
 if not found then raise exception 'CONFLICT'; end if;
 end;
$$;
revoke all on function public.save_note(uuid,text,jsonb,text,integer) from public;
revoke all on function public.delete_note(uuid,integer) from public;
grant execute on function public.save_note(uuid,text,jsonb,text,integer) to authenticated;
grant execute on function public.delete_note(uuid,integer) to authenticated;
-- Replace with your Google account email, then execute separately:
-- insert into public.allowed_accounts(email) values ('you@example.com');
