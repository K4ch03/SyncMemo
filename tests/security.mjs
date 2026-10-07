import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const alice = "00000000-0000-4000-8000-000000000001",
  bob = "00000000-0000-4000-8000-000000000002",
  eve = "00000000-0000-4000-8000-000000000003",
  note = "10000000-0000-4000-8000-000000000001";
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.test_uid',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
await db.exec(
  (await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")).split("-- Run once in Supabase SQL Editor")[0],
);
await db.query(
  "insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now())",
  [alice, "alice@example.com", bob, "bob@example.com", eve, null],
);
async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.test_uid',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function save(title, rev) {
  return (
    await db.query("select * from public.save_note($1,$2,$3,$4,$5)", [
      note,
      title,
      { type: "doc", content: [{ type: "paragraph" }] },
      "",
      rev,
    ])
  ).rows[0];
}
await asUser(alice);
let row = await save("one", 0);
assert.equal(row.revision, 1);
row = await save("two", 1);
assert.equal(row.revision, 2);
await assert.rejects(() => save("stale", 1), /CONFLICT/);
assert.equal(
  (await db.query("select title from public.notes")).rows[0].title,
  "two",
);
const folderMigration=await readFile(new URL("../supabase/migrations/20261007_folders.sql",import.meta.url),"utf8");
await db.exec("reset role");await db.exec(folderMigration);await db.exec(folderMigration);
await asUser(alice);
assert.equal((await db.query("select title,folder_id from public.notes")).rows[0].title,"two");
assert.equal((await db.query("select folder_id from public.notes")).rows[0].folder_id,null);
// Simulate the former restrictive policy, then migrate twice without losing notes.
await db.exec("reset role;drop policy own_notes on public.notes;create policy own_notes on public.notes for all to authenticated using (false) with check (false);");
const migration = await readFile(new URL("../supabase/migrations/20261007_public_login.sql", import.meta.url), "utf8");
await db.exec(migration);
await db.exec(migration);
await asUser(alice);
assert.equal((await db.query("select title,owner_id,revision from public.notes")).rows[0].title,"two");
assert.equal((await db.query("select owner_id from public.notes")).rows[0].owner_id,alice);
await asUser(bob);
assert.equal((await db.query("select * from public.notes")).rows.length, 0);
await assert.rejects(() => save("overwrite", 2), /CONFLICT/);
await assert.rejects(
  () =>
    db.query("insert into public.notes(id,owner_id) values($1,$2)", [
      "20000000-0000-4000-8000-000000000001",
      alice,
    ]),
  /row-level security/,
);
await asUser(eve);
// A new OAuth user without an allowlist entry (or email) can own notes.
await db.query("insert into public.notes(id) values($1)", ["30000000-0000-4000-8000-000000000001"]);
assert.equal((await db.query("select * from public.notes")).rows.length, 1);
await assert.rejects(() => save("other user edit", 2), /CONFLICT/);
await assert.rejects(() => db.query("select public.delete_note($1,$2)", [note, 2]), /CONFLICT/);
await asUser(alice);
const folder="40000000-0000-4000-8000-000000000001";
await db.query("insert into public.folders(id,name) values($1,'仕事')",[folder]);
await db.query("select * from public.save_note_with_folder($1,'two','{}','',2,$2)",[note,folder]);
assert.equal((await db.query("select folder_id from public.notes")).rows[0].folder_id,folder);
await assert.rejects(()=>db.query("select * from public.save_note_with_folder($1,'stale','{}','',2,null)",[note]),/CONFLICT/);
await asUser(bob);
assert.equal((await db.query("select * from public.folders")).rows.length,0);
await assert.rejects(()=>db.query("insert into public.notes(id,folder_id) values($1,$2)",["50000000-0000-4000-8000-000000000001",folder]),/foreign key/);
await db.query("delete from public.folders where id=$1",[folder]);
await asUser(alice);
assert.equal((await db.query("select * from public.folders")).rows.length,1);
await db.query("delete from public.folders where id=$1",[folder]);
assert.equal((await db.query("select folder_id from public.notes")).rows[0].folder_id,null);
assert.equal((await db.query("select title from public.notes")).rows[0].title,"two");
await db.exec("reset role");
await db.exec(folderMigration);await db.exec(folderMigration);
await asUser(alice);
await assert.rejects(
  () => db.query("select public.delete_note($1,$2)", [note, 1]),
  /CONFLICT/,
);
await db.query("select public.delete_note($1,$2)", [note, 3]);
assert.equal((await db.query("select * from public.notes")).rows.length, 0);
await db.exec("reset role;set role anon;");
await assert.rejects(
  () => db.query("select * from public.notes"),
  /permission denied/,
);
console.log(
  "PASS PostgreSQL: new user access, row isolation, stale save protection, stale delete protection, anonymous denial",
);
await db.close();
