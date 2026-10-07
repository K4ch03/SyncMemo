"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Folder as FolderIcon, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import FolderColor, {foreground} from "./FolderColor";
import type { Folder, Note } from "@/lib/store";

type Props = {
 notes: Note[]; folders: Folder[]; selected: string | null; disabled: boolean;
 onOpen: (id: string) => void; onAdd: (folder?: string) => void;
 onColor: (folder: Folder, color: string | null) => void;
 onFolder: (folder?: Folder) => void; onDeleteFolder: (folder: Folder) => void;
 onMove: (id: string, folder: string | null) => void;
};
export default function NoteList(props: Props) {
 const [menu,setMenu]=useState<string|null>(null);
 const [preview,setPreview]=useState<{id:string;color:string|null}|null>(null);
 const panel=useRef<HTMLDivElement>(null);
 const [menuPosition,setMenuPosition]=useState({left:0,top:0});
 useEffect(()=>{
   if(!menu)return;
   const close=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-folder-menu]')){setMenu(null);setPreview(null);}};
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(null);setPreview(null);}};
   const reposition=()=>{setMenu(null);setPreview(null);};
   document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);window.addEventListener('resize',reposition);
   return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);window.removeEventListener('resize',reposition);};
 },[menu]);
 const colorOf=(f:Folder)=>preview?.id===f.id?preview.color:f.color;
 const [expanded,setExpanded] = useState<Set<string>>(new Set());
 const [drag,setDrag] = useState<{id:string;x:number;y:number} | null>(null);
 const [target,setTarget] = useState<string | null>(null);
 const [announcement,setAnnouncement] = useState("");
 const root = useRef<HTMLElement>(null);
 const current = useRef(props); current.current=props;
 const suppressClick = useRef(0);
 const active = useRef(false);
 const point = useRef({x:0,y:0});
 const dragId = useRef<string | null>(null);
 const destination = useRef<string | null>(null);
 const frame = useRef(0);
 const pick = (x:number,y:number) => {
   point.current={x,y};
   const el=document.elementFromPoint(x,y)?.closest<HTMLElement>("[data-folder-target]");
   const value=el && root.current?.contains(el) ? el.dataset.folderTarget! : null;
   destination.current=value;setTarget(value);
 };
 const stop = () => {active.current=false;dragId.current=null;destination.current=null;cancelAnimationFrame(frame.current);setDrag(null);setTarget(null);};
 const scroll = () => {
   if(!active.current || !root.current) return;
   const box=root.current.getBoundingClientRect(),{x,y}=point.current;
   if(x>=box.left && x<=box.right) {
     const delta=y<box.top+45 ? -9 : y>box.bottom-45 ? 9 : 0;
     if(delta) {root.current.scrollTop+=delta;pick(x,y);}
   }
   frame.current=requestAnimationFrame(scroll);
 };
 const begin = (id:string,x:number,y:number) => {active.current=true;dragId.current=id;pick(x,y);setDrag({id,x,y});setAnnouncement("移動先のフォルダ、またはフォルダ外にドロップしてください");frame.current=requestAnimationFrame(scroll);};
 const finish = () => {
   const id=dragId.current,to=destination.current;
   if(id && to !== null) {current.current.onMove(id,to || null);if(to)setExpanded(old=>new Set([...old,to]));setAnnouncement("メモを移動しました");}
   suppressClick.current=Date.now()+600;stop();
 };
 useEffect(() => {
   const el=root.current;if(!el)return;
   let timer:ReturnType<typeof setTimeout> | undefined;
   let start:{id:string;x:number;y:number} | null=null;
   const cancelTimer=()=>{clearTimeout(timer);start=null;};
   const down=(e:TouchEvent)=>{
     if(current.current.disabled || e.touches.length!==1){cancelTimer();stop();return;}
     const card=(e.target as HTMLElement).closest<HTMLElement>("[data-note-id]");if(!card)return;
     const t=e.touches[0];start={id:card.dataset.noteId!,x:t.clientX,y:t.clientY};
     timer=setTimeout(()=>{if(start){begin(start.id,start.x,start.y);navigator.vibrate?.(20);}},450);
   };
   const move=(e:TouchEvent)=>{
     if(e.touches.length!==1){cancelTimer();stop();return;}
     const t=e.touches[0];
     if(active.current){if(e.cancelable)e.preventDefault();pick(t.clientX,t.clientY);setDrag({id:dragId.current!,x:t.clientX,y:t.clientY});}
     else if(start && Math.hypot(t.clientX-start.x,t.clientY-start.y)>8)cancelTimer();
   };
   const up=()=>{cancelTimer();if(active.current)finish();};
   const cancel=()=>{cancelTimer();if(active.current)suppressClick.current=Date.now()+600;stop();};
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};
   const context=(e:Event)=>{if(start || active.current)e.preventDefault();};
   el.addEventListener('touchstart',down,{passive:true});
   el.addEventListener('touchmove',move,{passive:false});
   el.addEventListener('touchend',up);el.addEventListener('touchcancel',cancel);
   el.addEventListener('contextmenu',context);document.addEventListener('keydown',key);
   window.addEventListener('blur',cancel);
   return()=>{clearTimeout(timer);cancelAnimationFrame(frame.current);el.removeEventListener('touchstart',down);el.removeEventListener('touchmove',move);el.removeEventListener('touchend',up);el.removeEventListener('touchcancel',cancel);el.removeEventListener('contextmenu',context);document.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);};
 },[]);
 const card=(n:Note)=><button key={n.id} data-note-id={n.id} className={`note-card ${props.selected===n.id?'selected':''} ${drag?.id===n.id?'dragging':''}`} disabled={props.disabled}
   draggable={!props.disabled}
   onPointerDown={e=>{e.currentTarget.draggable=e.pointerType === "mouse" && !props.disabled;}}
   onDragStart={e=>{e.dataTransfer.setData('text/plain',n.id);e.dataTransfer.effectAllowed='move';begin(n.id,e.clientX,e.clientY);}}
   onDragEnd={stop}
   onClick={()=>{if(Date.now()>suppressClick.current)props.onOpen(n.id);}}
   onKeyDown={e=>{if(e.key===' ' && !props.disabled){e.preventDefault();dragId.current=n.id;setDrag({id:n.id,x:0,y:0});setAnnouncement('移動先にTabキーで移動してEnterキーを押してください');}}}
 ><div className="note-title">{n.title || '無題のメモ'}</div></button>;
 const drop=(id:string)=>({
   'data-folder-target':id,
   onDragOver:(e:React.DragEvent)=>{if(!dragId.current)return;e.preventDefault();e.dataTransfer.dropEffect='move';pick(e.clientX,e.clientY);},
   onDrop:(e:React.DragEvent)=>{if(!dragId.current)return;e.preventDefault();destination.current=id;finish();},
 });
 return <>
 <nav ref={root} className="notes-list folder-list" aria-label="メモ一覧">
   {(props.folders.length>0 || drag) && <button {...drop('')} className={`root-drop ${target===''?'drop-active':''}`} onClick={()=>{if(dragId.current){destination.current='';finish();}}}>フォルダ外</button>}
   {[...props.folders].sort((a,b)=>a.name.localeCompare(b.name,'ja',{numeric:true})).map(f=><section key={f.id} style={colorOf(f)?{background:colorOf(f)!,color:foreground(colorOf(f)!)}:undefined} className={`folder-block ${colorOf(f)?"has-folder-color":""} ${target===f.id?'drop-active':''}`} {...drop(f.id)}>
     <div className="folder-row">
       <button className="folder-toggle" aria-expanded={expanded.has(f.id)} onClick={()=>{if(dragId.current){destination.current=f.id;finish();return;}setExpanded(old=>{const next=new Set(old);if(next.has(f.id))next.delete(f.id);else next.add(f.id);return next;});}}>
         <ChevronRight size={14} className={expanded.has(f.id)?'expanded':''}/><FolderIcon size={16}/><span>{f.name}</span>
       </button>
       <button aria-label={`${f.name}にメモを追加`} disabled={props.disabled} onClick={()=>{setExpanded(old=>new Set([...old,f.id]));props.onAdd(f.id);}}><Plus size={13}/></button>
       <button aria-label={`${f.name}の名前を変更`} disabled={props.disabled} onClick={()=>props.onFolder(f)}><Pencil size={13}/></button>
       <button data-folder-menu aria-label={`${f.name}のメニュー`} aria-expanded={menu===f.id} disabled={props.disabled} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setMenuPosition({left:Math.max(8,Math.min(r.right-264,window.innerWidth-272)),top:Math.max(8,Math.min(r.bottom+4,window.innerHeight-355))});setPreview(null);setMenu(menu===f.id?null:f.id);}}><MoreHorizontal size={15}/></button>
     </div>
     {expanded.has(f.id) && <div className="folder-notes">{props.notes.filter(n=>n.folder_id===f.id).map(card)}{!props.notes.some(n=>n.folder_id===f.id)&&<p className="folder-empty">メモをここにドロップ</p>}</div>}
   </section>)}
   {props.notes.filter(n=>!n.folder_id || !props.folders.some(f=>f.id===n.folder_id)).map(card)}
   {!props.notes.length && !props.folders.length && <div className="list-empty">まだメモはありません。<button onClick={()=>props.onAdd()} disabled={props.disabled}><Plus size={16}/>最初のメモを書く</button></div>}
 </nav>
 {menu && props.folders.some(f=>f.id===menu) && <div ref={panel} className="folder-menu-panel" role="dialog" aria-label="フォルダの設定" style={menuPosition}>
 <FolderColor key={menu} color={colorOf(props.folders.find(f=>f.id===menu)!)??null} disabled={props.disabled} onPreview={color=>setPreview({id:menu,color})} onSave={color=>{props.onColor(props.folders.find(f=>f.id===menu)!,color);setPreview(null);}}/>
 <button className="folder-delete" disabled={props.disabled} onClick={()=>{props.onDeleteFolder(props.folders.find(f=>f.id===menu)!);setMenu(null);setPreview(null);}}><Trash2 size={15}/>フォルダを削除</button>
 </div>}
 {drag && drag.x!==0 && <div className="drag-preview" style={{left:drag.x+12,top:drag.y-38}}>{props.notes.find(n=>n.id===drag.id)?.title || '無題のメモ'}</div>}
 <span className="sr-only" role="status">{announcement}</span>
 </>;
}
