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
  await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
);
await db.query(
  "insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now())",
  [alice, "alice@example.com", bob, "bob@example.com", eve, "eve@example.com"],
);
await db.exec(
  "insert into public.allowed_accounts values ('alice@example.com'),('bob@example.com');",
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
assert.equal(
  (await db.query("select public.is_allowed() as ok")).rows[0].ok,
  true,
);
let row = await save("one", 0);
assert.equal(row.revision, 1);
row = await save("two", 1);
assert.equal(row.revision, 2);
await assert.rejects(() => save("stale", 1), /CONFLICT/);
assert.equal(
  (await db.query("select title from public.notes")).rows[0].title,
  "two",
);
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
assert.equal(
  (await db.query("select public.is_allowed() as ok")).rows[0].ok,
  false,
);
await assert.rejects(
  () =>
    db.query("insert into public.notes(id) values($1)", [
      "30000000-0000-4000-8000-000000000001",
    ]),
  /row-level security/,
);
await assert.rejects(
  () => db.query("select * from public.allowed_accounts"),
  /permission denied/,
);
await asUser(alice);
await assert.rejects(
  () => db.query("select public.delete_note($1,$2)", [note, 1]),
  /CONFLICT/,
);
await db.query("select public.delete_note($1,$2)", [note, 2]);
assert.equal((await db.query("select * from public.notes")).rows.length, 0);
await db.exec("reset role;set role anon;");
await assert.rejects(
  () => db.query("select * from public.notes"),
  /permission denied/,
);
console.log(
  "PASS PostgreSQL: account allowlist, row isolation, stale save protection, stale delete protection, anonymous denial",
);
await db.close();
