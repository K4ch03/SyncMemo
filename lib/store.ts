import { openDB } from "idb";
import { createClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/react";
export type Note = {
  id: string;
  title: string;
  body: JSONContent;
  plain_text: string;
  created_at: string;
  updated_at: string;
  revision: number;
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloud =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;
const database = () =>
  openDB("quiet-memo", 1, {
    upgrade(db) {
      db.createObjectStore("notes", { keyPath: "id" });
    },
  });
export const local = {
  all: async (): Promise<Note[]> => (await database()).getAll("notes"),
  put: async (n: Note) => {
    await (await database()).put("notes", n);
  },
  remove: async (id: string) => {
    await (await database()).delete("notes", id);
  },
};
export function newNote(): Note {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: { type: "doc", content: [{ type: "paragraph" }] },
    plain_text: "",
    created_at: now,
    updated_at: now,
    revision: 0,
  };
}
export async function remoteAll(): Promise<Note[]> {
  const { data, error } = await cloud!
    .from("notes")
    .select("id,title,body,plain_text,created_at,updated_at,revision");
  if (error) throw error;
  return data ?? [];
}
export async function remoteSave(n: Note, revision: number): Promise<Note> {
  const { data, error } = await cloud!
    .rpc("save_note", {
      note_id: n.id,
      note_title: n.title,
      note_body: n.body,
      note_text: n.plain_text,
      expected_revision: revision,
    })
    .single();
  if (error) throw error;
  return data as Note;
}
