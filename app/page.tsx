"use client";
import UnsetColor from "./UnsetColor";
import {LineBand,bandColors} from "@/lib/line-band";
import {memoView} from "@/lib/mobile-navigation";
import NoteList from "./NoteList";
import { incomingDocument } from "@/lib/editor-sync";
import { useCallback, useEffect, useRef, useState, useId } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, BackgroundColor, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  PanelTop,
  TriangleAlert,
  Plus,
  FolderPlus,
  FilePlus2,
  ArrowLeft,
  Trash2,
  Bold,
  Strikethrough,
  Underline,
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
  remoteFolders,
  type Folder,
  type Note,
} from "@/lib/store";
const date = (v: string) => {
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
function GuestWarning() {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) {setPinned(false);setHover(false);} };
    const escape = (e: KeyboardEvent) => {if(e.key === "Escape"){setPinned(false);setHover(false);}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return () => {document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[]);
  return <div ref={ref} className="guest-warning" onPointerEnter={e => {if(e.pointerType === "mouse")setHover(true);}} onPointerLeave={() => setHover(false)}>
    <button aria-label="ゲストモードの保存について" aria-describedby={pinned || hover ? id : undefined} aria-expanded={pinned || hover} onClick={() => setPinned(v => !v)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}><TriangleAlert size={19}/></button>
    {(pinned || hover) && <div id={id} role="tooltip" className="guest-warning-popup">ゲストモードはブラウザに保存されているため、データ消失を防ぐにはGoogleアカウント連携を行ってください</div>}
  </div>;
}
const colors = [
  ["未指定", ""],
  ["赤", "#ff9393"],
  ["オレンジ", "#ffbd7a"],
  ["黄", "#eadb79"],
  ["緑", "#b5df77"],
  ["青", "#8fbaff"],
  ["紫", "#c7a4f9"],
];
function Composer({
  note,
  scale,
  onScale,
  onChange,
}: {
  note: Note;
  scale: number;
  onScale: (value: number) => void;
  onChange: (body: JSONContent, text: string) => void;
}) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        italic: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      LineBand,
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
  const [palette, setPalette] = useState<"color" | "background" | "band" | null>(null);
  useEffect(() => {
    if (!editor) return;
    const f = () => redraw((x) => x + 1);
    editor.on("transaction", f);
    return () => {
      editor.off("transaction", f);
    };
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const applyIncoming = () => {
      if(editor.isDestroyed || editor.isFocused || editor.view.composing)return;
      const tr=incomingDocument(editor.state,note.body);
      if(tr)editor.view.dispatch(tr);
    };
    applyIncoming();
    editor.on("blur",applyIncoming);
    return ()=>{editor.off("blur",applyIncoming);};
  }, [editor, note.body]);
  return (
    <>
      <div className="toolbar-shell">
      <div className="toolbar" onMouseDown={e => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
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
        <div className="tool-group">
          <button
            aria-label="太字"
            aria-pressed={editor?.isActive("bold") ?? false}
            className={editor?.isActive("bold") ? "active" : ""}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={18} />
          </button>
          <button aria-label="取り消し線" title="取り消し線" aria-pressed={editor?.isActive("strike") ?? false} className={editor?.isActive("strike") ? "active" : ""} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={18}/></button>
          <button aria-label="下線" title="下線" aria-pressed={editor?.isActive("underline") ?? false} className={editor?.isActive("underline") ? "active" : ""} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={18}/></button>
          <div className="color-wrap">
            <button
              aria-label="文字色"
              aria-expanded={palette === "color"}
              onClick={() => setPalette(palette === "color" ? null : "color")}
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

          </div>
          <div className="color-wrap">
            <button aria-label="背景色" title="背景色" aria-expanded={palette === "background"} onClick={() => setPalette(palette === "background" ? null : "background")}><span className="background-a">A</span><ChevronDown size={12}/></button>

          </div>
          <button aria-label="背景帯" title="背景帯" aria-expanded={palette === "band"} onClick={()=>setPalette(palette === "band" ? null : "band")}><PanelTop size={18}/><ChevronDown size={12}/></button>
          <button
            aria-label="文字の装飾を解除"
            onClick={() => editor?.chain().focus().unsetAllMarks().run()}
          >
            <RemoveFormatting size={18} />
          </button>
        </div>
        <label className="editor-select">
          <select aria-label="文字サイズ" value={editor?.getAttributes("textStyle").fontSize || ""} onChange={e => {if(e.target.value)editor?.chain().focus().setFontSize(e.target.value).run();else editor?.chain().focus().unsetFontSize().run();}}>
            <option value="">標準</option>{[12,14,16,18,20,24,28,32,40,48].map(n => <option key={n} value={`${n}px`}>{n}px</option>)}
          </select>
        </label>
        <label className="editor-select">
          <select aria-label="表示倍率" value={scale} onChange={e => onScale(Number(e.target.value))}>{[150,125,100,90,70,50].map(n => <option key={n} value={n}>{n}%</option>)}</select>
        </label>

      </div>
            {palette === "color" && (
              <div className="palette" role="group" aria-label="文字色を選ぶ" onMouseDown={e=>e.preventDefault()}>
                {colors.map(([name, color]) => (
                  <button
                    key={name}
                    aria-label={name}
                    title={name}
                    style={{ background: color || "transparent" }}
                    onClick={() => {
                      if (color) editor?.chain().focus().setColor(color).run();
                      else editor?.chain().focus().unsetColor().run();
                      setPalette(null);
                    }}
                  >{!color && <UnsetColor/>}</button>
                ))}
              </div>
            )}
            {palette === "background" && <div className="palette background-palette" role="group" aria-label="背景色を選ぶ" onMouseDown={e=>e.preventDefault()}>{[["未指定",""],["赤","#673b42"],["橙","#65462d"],["黄","#615522"],["緑","#344d2c"],["青","#2c4365"],["紫","#503b66"]].map(([name,color]) => <button key={name} aria-label={`背景色：${name}`} title={name} style={{background:color || "transparent"}} onClick={() => {if(color)editor?.chain().focus().setBackgroundColor(color).run();else editor?.chain().focus().unsetBackgroundColor().run();setPalette(null);}}>{!color && <UnsetColor/>}</button>)}</div>}
      {palette === "band" && <div className="palette band-palette" role="group" aria-label="背景帯の色を選ぶ" onMouseDown={e=>e.preventDefault()}>
        <button aria-label="背景帯：未指定" title="未指定" onClick={()=>{editor?.chain().focus().setLineBand(null).run();setPalette(null);}}><UnsetColor/></button>
        {bandColors.map(([name,color])=><button key={color} aria-label={`背景帯：${name}`} title={name} style={{background:color}} onClick={()=>{editor?.chain().focus().setLineBand(color).run();setPalette(null);}}/>)}
      </div>}
      </div>
      <div className="body-wrap">
        <EditorContent editor={editor} style={{zoom: scale / 100}} />
        {!note.plain_text && (
          <span className="placeholder" style={{zoom: scale / 100}}>ここから、書きはじめる。</span>
        )}
      </div>
    </>
  );
}
export default function Page() {
  const [mode, setMode] = useState<"loading" | "guest" | "cloud">("loading");
  const [email, setEmail] = useState("");
  const [editingTitle,setEditingTitle]=useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [editingFolderId,setEditingFolderId]=useState<string|null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState("updated-desc");
  const [scale,setScale] = useState(100);
  useEffect(() => {try {const saved=Number(localStorage.getItem("syncmemo.scale"));if([150,125,100,90,70,50].includes(saved))setScale(saved);}catch{}},[]);
  function changeScale(value:number) {setScale(value);try{localStorage.setItem("syncmemo.scale",String(value));}catch{}}

  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try { const saved = localStorage.getItem("syncmemo.sort");
      if (saved && ["updated-desc", "updated-asc", "title-asc", "title-desc"].includes(saved)) setSort(saved);
    } catch {}
    const closeOutside = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && menuRef.current?.open) { menuRef.current.open = false; menuRef.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {document.removeEventListener("pointerdown", closeOutside);document.removeEventListener("keydown", escape);};
  }, []);
  function changeSort(value: string) { setSort(value); try { localStorage.setItem("syncmemo.sort", value); } catch {} }

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const restore = () => {
      const view=memoView(window.history.state,window.location.hash);
      // Missing router state is not an instruction to leave the editor.
      if(!view)return;
      setMobile(view.kind === "note");if(view.kind === "note")setSelected(view.id);
    };
    restore();window.addEventListener("popstate",restore);window.addEventListener("hashchange",restore);
    return ()=>{window.removeEventListener("popstate",restore);window.removeEventListener("hashchange",restore);};
  },[]);
  function openEditor(id:string) {
    if(window.matchMedia("(max-width: 700px)").matches) {
      const view=memoView(window.history.state,window.location.hash);
      const url=new URL(window.location.href);url.hash=`note=${id}`;
      if(view?.kind === "note")window.history.replaceState({...window.history.state,syncMemoNote:id,syncMemoView:"note"},"",url);
      else {
        window.history.replaceState({...window.history.state,syncMemoNote:null,syncMemoView:"list"},"");
        window.history.pushState({...window.history.state,syncMemoNote:id,syncMemoView:"note",syncMemoPushed:true},"",url);
      }
    }
    setMobile(true);
  }
  function backToList() {
    if(window.history.state?.syncMemoPushed && memoView(window.history.state,window.location.hash)?.kind === "note")window.history.back();
    else {const url=new URL(window.location.href);url.hash="notes";window.history.replaceState({...window.history.state,syncMemoNote:null,syncMemoView:"list",syncMemoPushed:false},"",url);setMobile(false);}
  }

  const [folderDialog,setFolderDialog]=useState<{folder:Folder}|null>(null);
  const [folderError,setFolderError]=useState("");
  const folderSubmitting=useRef(false);
  function showFolderDialog(folder:Folder){setFolderError("");setFolderDialog({folder});}
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
          const loaded = await Promise.all([remoteAll(), remoteFolders()]);
          data = loaded[0];
          if(alive) setFolders(loaded[1]);
          if (!alive) return;
          setEmail(session.user.email || session.user.user_metadata?.user_name || "ログイン中");
          setMode("cloud");
          setGuestCount(
            (await local.all()).filter((g) => !data.some((n) => n.id === g.id))
              .length,
          );
        } else {
          data = await local.all();
          if(alive) setFolders(await local.folders());
          if (!alive) return;
          setMode("guest");
        }
        apply(data);
        setSelected(
          data.find(n => {const view=memoView(window.history.state,window.location.hash);return view?.kind === "note" && n.id === view.id;})?.id ??
          [...data].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.id ?? null,
        );
      } catch (e) {
        if (alive) {
          setMode("guest");
          setError(message(e));
          try {
            apply(await local.all());
            setFolders(await local.folders());
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
      const isEditing=()=>Boolean(document.activeElement?.closest(".prose-editor, .title-input"));
      if (pending.current.size || busy || editingFolderId || document.hidden || isEditing()) return;
      try {
        const [data, loadedFolders] = await Promise.all([remoteAll(),remoteFolders()]);
        if (alive && !pending.current.size && !isEditing()) {
          apply(data);
          setFolders(loadedFolders);
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
  }, [mode, busy, editingFolderId]);

  useEffect(() => {
    if (!account && !deleting && !folderDialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setAccount(false);
        setDeleting(false);
        setFolderDialog(null);
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
  }, [account, deleting, folderDialog, busy]);
  const note = notes.find((n) => n.id === selected);
  const list = [...notes]
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
    try {
      const { error: e } = await cloud.auth.signInWithOAuth({provider: "google", options: {redirectTo: window.location.origin}});
      if (e) throw e;
    } catch (e) {
      setError(message(e));
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
      backToList();
      setDeleting(false);
      setStatus("");
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
      const guestFolders = await local.folders();
      if(guestFolders.length) {
        const {error:folderError} = await cloud!.from("folders").upsert(guestFolders.map(f=>({...f,owner_id:userData.user!.id})),{onConflict:"id",ignoreDuplicates:true});
        if(folderError) throw folderError;
      }
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
      setFolders(await remoteFolders());
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
    openEditor(copy.id);
    await save(copy.id);
    setBusy(false);
  }
  async function setFolderColor(folder:Folder,color:string|null) {
    setBusy(true);
    setFolders(prev=>prev.map(f=>f.id===folder.id?{...f,color}:f));
    try {
      if(mode === "cloud") {
        const {error:e}=await cloud!.from("folders").update({color}).eq("id",folder.id).select("id").single();if(e)throw e;
      } else await local.putFolder({...folder,color});
      setError("");
    }catch(e){setFolders(prev=>prev.map(f=>f.id===folder.id?folder:f));setError(message(e));}finally{setBusy(false);}
  }
  async function createFolder() {
    if(folderSubmitting.current)return;
    folderSubmitting.current=true;setBusy(true);
    const folder:Folder={id:crypto.randomUUID(),name:"新しいフォルダ",created_at:new Date().toISOString()};
    try {
      if(mode === "cloud") {const {error:e}=await cloud!.from("folders").insert(folder);if(e)throw e;}
      else await local.putFolder(folder);
      setFolders(prev=>[...prev,folder]);setEditingFolderId(folder.id);setError("");
    }catch(e){setError(message(e));}finally{folderSubmitting.current=false;setBusy(false);}
  }
  async function renameFolder(folder:Folder,name:string) {
    setEditingFolderId(null);
    if(name===folder.name || !name.trim())return;
    if(folderSubmitting.current)return;
    folderSubmitting.current=true;setBusy(true);
    try {
      if(mode === "cloud") {const {error:e}=await cloud!.from("folders").update({name}).eq("id",folder.id).select("id").single();if(e)throw e;}
      else await local.putFolder({...folder,name});
      setFolders(prev=>prev.map(f=>f.id===folder.id?{...f,name}:f));setError("");
    }catch(e){setError(message(e));}finally{folderSubmitting.current=false;setBusy(false);}
  }
  async function deleteFolder(folder:Folder) {
    if(folderSubmitting.current)return;
    folderSubmitting.current=true;
    setBusy(true);
    try {
      if(!(await flush())){setFolderError("未保存のメモがあります。保存を完了してから再試行してください。");return;}
      if(mode === "cloud") {
        const {error:e}=await cloud!.from("folders").delete().eq("id",folder.id);if(e)throw e;
        apply(await remoteAll());
      } else {
        await local.removeFolder(folder.id);apply(await local.all());
      }
      setFolders(prev=>prev.filter(x=>x.id!==folder.id));setError("");setFolderDialog(null);
    }catch(e){setFolderError(message(e));}finally{setBusy(false);folderSubmitting.current=false;}
  }
  function moveNote(id:string,folder:string|null) {
    if(busy)return;
    const n=notesRef.current.find(n=>n.id===id);
    if(n && (n.folder_id??null)!==folder)stage({...n,folder_id:folder,updated_at:new Date().toISOString()});
  }
  function add(folder?:string) {
    const n = {...newNote(),folder_id:folder??null};
    stage(n);
    setSelected(n.id);
    openEditor(n.id);
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "mobile-hidden" : "")}>
        <div className="sidebar-main">
          <div className="sidebar-controls">
            <details className="app-menu" ref={menuRef}>
              <summary aria-label="アプリメニュー">···</summary>
              <div className="app-menu-panel">
                <h1>SyncMemo</h1>
                <button onClick={() => { if (menuRef.current) menuRef.current.open = false; setAccount(true); }}>
                  {mode === "cloud" ? <Cloud size={18}/> : <HardDrive size={18}/>}
                  {mode === "cloud" ? "アカウント" : "ゲストモード"}
                </button>
              </div>
            </details>
            <select aria-label="メモの並び替え" value={sort} onChange={(e) => changeSort(e.target.value)}>
              <option value="updated-desc">更新日時 · 新しい順</option>
              <option value="updated-asc">更新日時 · 古い順</option>
              <option value="title-asc">タイトル · 昇順</option>
              <option value="title-desc">タイトル · 降順</option>
            </select>
            <button className="add-icon" aria-label="フォルダを作成" title="フォルダを作成" onClick={()=>void createFolder()} disabled={mode === "loading" || busy}><FolderPlus size={22}/></button>
            <button className="add-icon" aria-label="メモを作成" title="メモを作成" onClick={()=>add()} disabled={mode === "loading" || busy}><FilePlus2 size={22}/></button>
          </div>
          {error && <div className="sidebar-error" role="alert">{error}</div>}
          {mode === "loading" ? <p className="list-empty">読み込み中…</p> : <NoteList notes={list} folders={folders} selected={selected} disabled={busy} onAdd={add} onColor={(f,color)=>void setFolderColor(f,color)} onOpen={id=>{setSelected(id);openEditor(id);}} editingFolderId={editingFolderId} onRename={(f,name)=>void renameFolder(f,name)} onCancelRename={()=>setEditingFolderId(null)} onFolder={f=>setEditingFolderId(f.id)} onDeleteFolder={showFolderDialog} onMove={moveNote}/>}

        </div>
        {mode === "guest" && <div className="sidebar-warning"><GuestWarning/></div>}
      </aside>
      <main className={"workspace " + (!mobile ? "mobile-hidden-editor" : "")}>
        <header className="workspace-header">
          <button className="back" aria-label="メモ一覧に戻る" onClick={backToList}><ArrowLeft size={19}/></button>
          <div className="document-actions">
            {mode === "guest" && <div className="header-warning"><GuestWarning/></div>}
            {note && <span className="header-updated">最終更新 {date(note.updated_at)}</span>}
            <span className="save-status" role="status" aria-label={status}>
              {status === "保存しました" ? <Check size={14} aria-hidden="true"/> : status}
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
            <div className="document-intro" style={{zoom: scale / 100}}>
              <input
                className="title-input"
                aria-label="メモのタイトル"
                placeholder="無題のメモ"
                maxLength={200}
                onFocus={()=>setEditingTitle(true)}
                onBlur={()=>setEditingTitle(false)}
                value={editingTitle ? note.title : (folders.find(f=>f.id===note.folder_id) ? `${folders.find(f=>f.id===note.folder_id)!.name} / ${note.title || "無題のメモ"}` : note.title)}
                onChange={(e) =>
                  stage({
                    ...note,
                    title: e.target.value,
                    updated_at: new Date().toISOString(),
                  })
                }
              />
            </div>
            <Composer
              key={note.id}
              note={note}
              scale={scale}
              onScale={changeScale}
              onChange={(body, plain_text) =>
                stage({
                  ...notesRef.current.find((n) => n.id === note.id)!,
                  body,
                  plain_text,
                  updated_at: new Date().toISOString(),
                })
              }
            />

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
              onClick={()=>add()}
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
      {folderDialog && <div className="modal-backdrop">
        <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="folder-dialog-title">
          <form onSubmit={e=>{e.preventDefault();if(!busy)void deleteFolder(folderDialog.folder);}}>
            <h2 id="folder-dialog-title">フォルダを削除しますか？</h2>
            <p>「{folderDialog.folder.name}」を削除します。中のメモは削除せず、フォルダ外に戻します。</p>
            {folderError && <p className="auth-error" role="alert">{folderError}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" autoFocus disabled={busy} onClick={()=>setFolderDialog(null)}>キャンセル</button>
              <button type="submit" className="danger" disabled={busy}>{busy ? "処理中…" : "削除する"}</button>
            </div>
          </form>
        </section>
      </div>}
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
            {error && <p className="auth-error" role="alert">{error}</p>}
            <div className="modal-icon">
              {mode === "cloud" ? <Cloud /> : <HardDrive />}
            </div>
            <h2 id="account-title">
              {mode === "cloud" ? "Googleアカウントでログイン中" : "ゲストとして利用中"}
            </h2>
            <p className="account-description">
              {mode === "cloud"
                ? email
                : "メモはこのブラウザだけに保存されます。\n長期保存や別端末同期を使いたい場合はGoogleログインを行ってください"}
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
                  <div className="login-options">
                    <button className="primary" onClick={() => void login()} disabled={busy}>Googleでログイン</button>
                  </div>
                ) : (
                  <div className="setup-notice">
                    外部アカウントでのログインはまだ設定されていません。現在はゲストモードで利用できます。
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
