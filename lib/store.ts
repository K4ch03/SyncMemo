import { openDB } from "idb";
import { createClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/react";
export type Folder = { id: string; name: string; color?: string | null; created_at: string };
export type Note = {
  folder_id?: string | null;
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
  openDB("quiet-memo", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes", { keyPath: "id" });
      if (!db.objectStoreNames.contains("folders")) db.createObjectStore("folders", { keyPath: "id" });
    },
  });
export const local = {
  folders: async (): Promise<Folder[]> => (await database()).getAll("folders"),
  putFolder: async (f: Folder) => { await (await database()).put("folders", f); },
  removeFolder: async (id: string) => {
    const tx = (await database()).transaction(["notes", "folders"], "readwrite");
    const notes = await tx.objectStore("notes").getAll();
    for (const n of notes) if(n.folder_id === id) await tx.objectStore("notes").put({...n, folder_id: null});
    await tx.objectStore("folders").delete(id);
    await tx.done;
  },
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
    folder_id: null,
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
    .select("id,title,body,plain_text,created_at,updated_at,revision,folder_id");
  if (error) throw error;
  return data ?? [];
}
export async function remoteSave(n: Note, revision: number): Promise<Note> {
  const { data, error } = await cloud!
    .rpc("save_note_with_folder", {
      note_folder: n.folder_id ?? null,
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

export async function remoteFolders(): Promise<Folder[]> {
  const {data,error} = await cloud!.from("folders").select("id,name,created_at,color");
  if(error) throw error;
  return data ?? [];
}
