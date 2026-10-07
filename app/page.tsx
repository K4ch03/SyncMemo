"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  Bold,
  RemoveFormatting,
  Undo2,
  Redo2,
  Cloud,
  HardDrive,
  LogOut,
  NotebookPen,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  cloud,
  local,
  newNote,
  remoteAll,
  remoteSave,
  type Note,
} from "@/lib/store";
const date = (v: string) =>
  new Date(v).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const colors = [
  ["標準", ""],
  ["赤", "#ff9393"],
  ["オレンジ", "#ffbd7a"],
  ["黄", "#eadb79"],
  ["緑", "#b5df77"],
  ["青", "#8fbaff"],
  ["紫", "#c7a4f9"],
];
function Composer({
  note,
  onChange,
}: {
  note: Note;
  onChange: (body: JSONContent, text: string) => void;
}) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      Color,
    ],
    immediatelyRender: false,
    content: note.body,
    editorProps: {
      attributes: {
        class: "prose-editor",
        "aria-label": "メモの本文",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => cb.current(editor.getJSON(), editor.getText()),
  });
  const [, redraw] = useState(0);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const f = () => redraw((x) => x + 1);
    editor.on("transaction", f);
    return () => {
      editor.off("transaction", f);
    };
  }, [editor]);
  useEffect(() => {
    if (
      editor &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(note.body)
    )
      editor.commands.setContent(note.body, { emitUpdate: false });
  }, [editor, note.body]);
  return (
    <>
      <div className="toolbar">
        <div className="tool-group">
          <button
            aria-label="太字"
            aria-pressed={editor?.isActive("bold") ?? false}
            className={editor?.isActive("bold") ? "active" : ""}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={18} />
          </button>
          <div className="color-wrap">
            <button
              aria-label="文字色"
              aria-expanded={palette}
              onClick={() => setPalette(!palette)}
            >
              <span
                className="color-a"
                style={{
                  borderColor:
                    editor?.getAttributes("textStyle").color || "#b5df77",
                }}
              >
                A
              </span>
              <ChevronDown size={12} />
            </button>
            {palette && (
              <div className="palette" role="group" aria-label="文字色を選ぶ">
                {colors.map(([name, color]) => (
                  <button
                    key={name}
                    aria-label={name}
                    title={name}
                    style={{ background: color || "#e6e8e5" }}
                    onClick={() => {
                      if (color) editor?.chain().focus().setColor(color).run();
                      else editor?.chain().focus().unsetColor().run();
                      setPalette(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            aria-label="文字の装飾を解除"
            onClick={() => editor?.chain().focus().unsetAllMarks().run()}
          >
            <RemoveFormatting size={18} />
          </button>
        </div>
        <div className="tool-group">
          <button
            aria-label="元に戻す"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="やり直す"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <span className="toolbar-hint">文字を選んで、装飾</span>
      </div>
      <div className="body-wrap">
        <EditorContent editor={editor} />
        {!note.plain_text && (
          <span className="placeholder">ここから、書きはじめる。</span>
        )}
      </div>
    </>
  );
}
export default function Page() {
  const [mode, setMode] = useState<"loading" | "guest" | "cloud">("loading");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated-desc");
  const [mobile, setMobile] = useState(false);
  const [account, setAccount] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const pending = useRef(new Map<string, Note>());
  const revisions = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chain = useRef(Promise.resolve());
  const apply = (data: Note[]) => {
    data.forEach((n) => revisions.current.set(n.id, n.revision));
    notesRef.current = data;
    setNotes(data);
  };
  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const sessionResult = cloud ? await cloud.auth.getSession() : null;
        if (sessionResult?.error) throw sessionResult.error;
        const session = sessionResult?.data.session ?? null;
        let data: Note[];
        if (session) {
          const { data: allowed, error: e } = await cloud!.rpc("is_allowed");
          if (e || !allowed) {
            await cloud!.auth.signOut();
            throw new Error("このGoogleアカウントは利用を許可されていません。");
          }
          data = await remoteAll();
          if (!alive) return;
          setEmail(session.user.email || "");
          setMode("cloud");
          setGuestCount(
            (await local.all()).filter((g) => !data.some((n) => n.id === g.id))
              .length,
          );
        } else {
          data = await local.all();
          if (!alive) return;
          setMode("guest");
        }
        apply(data);
        setSelected(
          data.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
            ?.id ?? null,
        );
      } catch (e) {
        if (alive) {
          setMode("guest");
          setError(message(e));
          try {
            apply(await local.all());
          } catch {
            setError(
              "ブラウザへの保存が利用できません。サイトデータの設定をご確認ください。",
            );
          }
        }
      }
    }
    void init();
    return () => {
      alive = false;
    };
  }, []);
  function message(e: unknown) {
    const s =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String(e.message)
          : "保存できませんでした。";
    return s.includes("CONFLICT")
      ? "別の端末でこのメモが更新されました。内容を残すには「別メモとして保存」を押してください。"
      : s;
  }
  const save = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    chain.current = chain.current.then(async () => {
      const n = pending.current.get(id);
      if (!n) return;
      try {
        let saved: Note = n;
        if (modeRef.current === "cloud")
          saved = await remoteSave(n, revisions.current.get(id) || 0);
        else await local.put(n);
        revisions.current.set(id, saved.revision);
        if (pending.current.get(id) === n) {
          pending.current.delete(id);
          setNotes((prev) =>
            prev.map((x) =>
              x.id === id
                ? {
                    ...x,
                    revision: saved.revision,
                    updated_at: saved.updated_at,
                  }
                : x,
            ),
          );
        }
        if (!pending.current.size) setError("");
        setStatus(pending.current.size ? "保存中…" : "保存しました");
      } catch (e) {
        setError(message(e));
        setStatus("未保存");
      }
    });
    return chain.current;
  }, []);
  function stage(n: Note) {
    pending.current.set(n.id, n);
    const next = notesRef.current.some((x) => x.id === n.id)
      ? notesRef.current.map((x) => (x.id === n.id ? n : x))
      : [n, ...notesRef.current];
    notesRef.current = next;
    setNotes(next);
    setStatus("保存中…");
    clearTimeout(timers.current.get(n.id));
    timers.current.set(
      n.id,
      setTimeout(() => void save(n.id), mode === "guest" ? 100 : 600),
    );
  }
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (pending.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const flush = () => {
      if (document.visibilityState === "hidden")
        for (const id of pending.current.keys()) void save(id);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [save]);
  useEffect(() => {
    if (mode !== "cloud") return;
    let alive = true;
    const poll = async () => {
      if (pending.current.size || busy || document.hidden) return;
      try {
        const data = await remoteAll();
        if (alive && !pending.current.size) {
          apply(data);
        }
      } catch {
        if (alive) setStatus("同期を待っています");
      }
    };
    const timer = setInterval(() => void poll(), 5000);
    window.addEventListener("focus", poll);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [mode, busy]);

  useEffect(() => {
    if (!account && !deleting) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setAccount(false);
        setDeleting(false);
      }
      if (event.key === "Tab" && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,[tabindex="0"]',
          ),
        );
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [account, deleting, busy]);
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: "search_memos",
            description:
              "現在のメモ一覧を検索して表示する。保存内容は変更しない。",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== "object" ||
                !("query" in input) ||
                typeof input.query !== "string"
              )
                throw new Error("query must be a string");
              const q = input.query;
              setQuery(q);
              setMobile(false);
              return {
                matches: notesRef.current
                  .filter((n) =>
                    (n.title + " " + n.plain_text)
                      .toLocaleLowerCase()
                      .includes(q.toLocaleLowerCase()),
                  )
                  .map((n) => ({ id: n.id, title: n.title || "無題のメモ" })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  const note = notes.find((n) => n.id === selected);
  const list = notes
    .filter((n) =>
      (n.title + " " + n.plain_text)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => {
      const asc = sort.endsWith("asc");
      const n = sort.startsWith("title")
        ? (a.title || "無題のメモ").localeCompare(
            b.title || "無題のメモ",
            "ja",
            { numeric: true },
          )
        : a.updated_at.localeCompare(b.updated_at);
      return asc ? n : -n;
    });
  async function flush() {
    for (const id of pending.current.keys()) await save(id);
    return pending.current.size === 0;
  }
  async function login() {
    if (!cloud) {
      setAccount(true);
      return;
    }
    if (!(await flush())) return;
    setBusy(true);
    const { error: e } = await cloud.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function logout() {
    if (!(await flush())) return;
    setBusy(true);
    try {
      const result = await cloud!.auth.signOut();
      if (result.error) throw result.error;
      window.location.reload();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  async function remove() {
    if (!note) return;
    const id = note.id;
    setBusy(true);
    try {
      await save(id);
      if (pending.current.has(id))
        throw new Error("未保存の変更があります。先に保存してください。");
      if (mode === "cloud") {
        const { error: e } = await cloud!.rpc("delete_note", {
          note_id: id,
          expected_revision: revisions.current.get(id),
        });
        if (e) throw e;
      } else await local.remove(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setSelected(null);
      setMobile(false);
      setDeleting(false);
      setStatus("削除しました");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function migrate() {
    setBusy(true);
    try {
      if (!(await flush())) return;
      const guests = await local.all();
      const { data: userData, error: authError } = await cloud!.auth.getUser();
      if (authError || !userData.user)
        throw authError || new Error("ログインしてください。");
      if (guests.length) {
        const { error: importError } = await cloud!.from("notes").upsert(
          guests.map((n) => ({
            ...n,
            owner_id: userData.user!.id,
            revision: 1,
          })),
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (importError) throw importError;
      }
      apply(await remoteAll());
      setGuestCount(0);
      setStatus("ゲストのメモをコピーしました");
      setAccount(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    const original = note;
    if (!original) return;
    setBusy(true);
    await chain.current;
    clearTimeout(timers.current.get(original.id));
    pending.current.delete(original.id);
    const copy = {
      ...newNote(),
      title: (original.title || "無題のメモ") + "（競合時のコピー）",
      body: original.body,
      plain_text: original.plain_text,
    };
    stage(copy);
    setSelected(copy.id);
    await save(copy.id);
    setBusy(false);
  }
  function add() {
    const n = newNote();
    stage(n);
    setSelected(n.id);
    setMobile(true);
    setQuery("");
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "mobile-hidden" : "")}>
        <header className="brand">
          <span className="brand-mark">
            <NotebookPen size={23} />
          </span>
          <h1>
            余白<span>MEMO</span>
          </h1>
          <span className="edition">PRIVATE NOTES</span>
        </header>
        <div className="sidebar-main">
          <div className="list-heading">
            <h2>
              すべてのメモ <span>{notes.length}</span>
            </h2>
            <button
              className="add-icon"
              aria-label="メモを新規作成"
              onClick={add}
              disabled={mode === "loading"}
            >
              <Plus size={22} />
            </button>
          </div>
          <label className="search">
            <Search size={17} />
            <input
              placeholder="メモを検索"
              aria-label="メモを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="検索をクリア" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>
          <div className="sort-row">
            <span>{query ? `${list.length} 件の検索結果` : "メモ一覧"}</span>
            <select
              aria-label="メモの並び替え"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="updated-desc">更新日時 · 新しい順</option>
              <option value="updated-asc">更新日時 · 古い順</option>
              <option value="title-asc">タイトル · 昇順</option>
              <option value="title-desc">タイトル · 降順</option>
            </select>
          </div>
          <nav className="notes-list" aria-label="メモ一覧">
            {mode === "loading" ? (
              <p className="list-empty">読み込み中…</p>
            ) : list.length === 0 ? (
              <div className="list-empty">
                {query
                  ? "一致するメモがありません。"
                  : "まだメモはありません。"}
                {!query && <button onClick={add}>最初のメモを書く</button>}
              </div>
            ) : (
              list.map((n) => (
                <button
                  key={n.id}
                  className={
                    "note-card " + (selected === n.id ? "selected" : "")
                  }
                  onClick={() => {
                    setSelected(n.id);
                    setMobile(true);
                  }}
                >
                  <div className="note-title">{n.title || "無題のメモ"}</div>
                  <p>{n.plain_text || "本文はまだありません"}</p>
                  <time>{date(n.updated_at)}</time>
                </button>
              ))
            )}
          </nav>
        </div>
        <footer className="account-footer">
          <button className="account-button" onClick={() => setAccount(true)}>
            <span className="avatar">
              {mode === "cloud" ? <Cloud size={19} /> : <HardDrive size={19} />}
            </span>
            <span>
              <strong>
                {mode === "cloud" ? "マイアカウント" : "ゲストモード"}
              </strong>
              <small>
                {mode === "cloud" ? "クラウドに保存" : "このブラウザに保存"}
              </small>
            </span>
            <ChevronDown size={16} />
          </button>
        </footer>
      </aside>
      <main className={"workspace " + (!mobile ? "mobile-hidden-editor" : "")}>
        <header className="workspace-header">
          <div className="breadcrumb">
            <button
              className="back"
              aria-label="メモ一覧に戻る"
              onClick={() => setMobile(false)}
            >
              <ArrowLeft size={19} />
            </button>
            <span>メモ帳</span>
            <span className="slash">/</span>
            <strong>
              {note?.title || (note ? "無題のメモ" : "すべてのメモ")}
            </strong>
          </div>
          <div className="document-actions">
            <span className="save-status" role="status">
              {status === "保存しました" && <Check size={14} />} {status}
            </span>
            {note && (
              <button
                aria-label="このメモを削除"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            {pending.current.size > 0 && (
              <>
                <button onClick={() => void flush()}>再試行</button>
                <button onClick={() => void recover()} disabled={busy}>
                  別メモとして保存
                </button>
              </>
            )}
            <button aria-label="エラーを閉じる" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {note ? (
          <article className="document">
            <div className="document-intro">
              <span className="eyebrow">MY NOTE</span>
              <input
                className="title-input"
                aria-label="メモのタイトル"
                placeholder="無題のメモ"
                maxLength={200}
                value={note.title}
                onChange={(e) =>
                  stage({
                    ...note,
                    title: e.target.value,
                    updated_at: new Date().toISOString(),
                  })
                }
              />
              <div className="timestamps">
                <span>作成 {date(note.created_at)}</span>
                <span>更新 {date(note.updated_at)}</span>
              </div>
            </div>
            <Composer
              key={note.id}
              note={note}
              onChange={(body, plain_text) =>
                stage({
                  ...notesRef.current.find((n) => n.id === note.id)!,
                  body,
                  plain_text,
                  updated_at: new Date().toISOString(),
                })
              }
            />
            <footer className="document-footer">
              <span>
                {note.plain_text.replace(/\n/g, "").length.toLocaleString()}{" "}
                文字
              </span>
              <span>
                {mode === "cloud" ? (
                  <Cloud size={14} />
                ) : (
                  <HardDrive size={14} />
                )}{" "}
                {mode === "cloud" ? "クラウド保存" : "このブラウザに保存"}
              </span>
            </footer>
          </article>
        ) : (
          <div className="empty-workspace">
            <div className="empty-icon">
              <NotebookPen size={34} strokeWidth={1.4} />
            </div>
            <span className="eyebrow">A LITTLE SPACE FOR YOUR THOUGHTS</span>
            <h2>思いついたことを、ここに。</h2>
            <p>
              書き留めたいことも、まだまとまらないことも。
              <br />
              あなただけのメモを、ひとつずつ。
            </p>
            <button
              className="primary"
              onClick={add}
              disabled={mode === "loading"}
            >
              <Plus size={18} /> 新しいメモ
            </button>
            <small>
              {mode === "cloud"
                ? "同じアカウントで、ほかの端末からも。"
                : "ゲストのメモは、このブラウザに自動保存されます。"}
            </small>
          </div>
        )}
      </main>
      {account && (
        <div className="modal-backdrop" onClick={() => setAccount(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="閉じる"
              onClick={() => setAccount(false)}
              autoFocus
            >
              <X size={20} />
            </button>
            <div className="modal-icon">
              {mode === "cloud" ? <Cloud /> : <HardDrive />}
            </div>
            <h2 id="account-title">
              {mode === "cloud" ? "アカウント" : "ゲストとして利用中"}
            </h2>
            <p>
              {mode === "cloud"
                ? email
                : "メモはこのブラウザだけに保存されます。別の端末とは同期されず、サイトデータを削除するとメモも消えます。"}
            </p>
            {mode === "cloud" ? (
              <>
                {guestCount > 0 && (
                  <div className="import-box">
                    <strong>ゲストのメモが {guestCount} 件あります</strong>
                    <p>
                      クラウドにコピーすると、ほかの端末でも使えます。元のメモはこのブラウザに残ります。
                    </p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void migrate()}
                    >
                      クラウドにコピー
                    </button>
                  </div>
                )}
                <button
                  className="secondary"
                  onClick={() => void logout()}
                  disabled={busy}
                >
                  <LogOut size={17} />
                  ログアウト
                </button>
              </>
            ) : (
              <>
                {cloud ? (
                  <button
                    className="primary"
                    onClick={() => void login()}
                    disabled={busy}
                  >
                    Googleでログイン
                  </button>
                ) : (
                  <div className="setup-notice">
                    Googleログインはまだ設定されていません。現在はゲストモードで利用できます。
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => setAccount(false)}
                >
                  ゲストのまま続ける
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {deleting && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">このメモを削除しますか？</h2>
            <p>
              「{note?.title || "無題のメモ"}
              」を削除します。この操作は取り消せません。
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                autoFocus
                onClick={() => setDeleting(false)}
                disabled={busy}
              >
                キャンセル
              </button>
              <button
                className="danger"
                onClick={() => void remove()}
                disabled={busy}
              >
                削除する
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
