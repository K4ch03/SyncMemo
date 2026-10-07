"use client";
import {useRef,useState} from 'react';
export default function InlineFolderName({name,onCommit,onCancel}:{name:string;onCommit:(name:string)=>void;onCancel:()=>void}) {
 const [value,setValue]=useState(name);
 const latest=useRef(name), finished=useRef(false), composing=useRef(false), blurred=useRef(false);
 function commit(){if(finished.current)return;finished.current=true;onCommit(latest.current.trim() || name);}
 return <input className="folder-name-inline" aria-label="フォルダ名" autoFocus maxLength={100} value={value}
   onFocus={e=>{blurred.current=false;e.target.select();}}
   onChange={e=>{latest.current=e.target.value;setValue(e.target.value);}}
   onCompositionStart={()=>{composing.current=true;}}
   onCompositionEnd={e=>{composing.current=false;latest.current=e.currentTarget.value;setValue(e.currentTarget.value);if(blurred.current)commit();}}
   onBlur={()=>{blurred.current=true;if(!composing.current)commit();}}
   onKeyDown={e=>{
     if(composing.current || e.nativeEvent.isComposing || e.keyCode===229)return;
     if(e.key==='Enter'){e.preventDefault();commit();}
     if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finished.current=true;onCancel();}
   }}/>
}
