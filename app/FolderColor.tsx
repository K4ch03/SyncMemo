"use client";
import UnsetColor from "./UnsetColor";
import {useRef,useState} from 'react';
export function hsvHex(h:number,s:number,v:number) {
 const f=(n:number)=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0');};
 return '#'+f(5)+f(3)+f(1);
}
function hsv(hex:string){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);const v=Math.max(r,g,b),d=v-Math.min(r,g,b);return {h:d===0?0:((v===r?(g-b)/d:v===g?2+(b-r)/d:4+(r-g)/d)*60+360)%360,s:v===0?0:d/v,v};}
export default function FolderColor({color,onPreview,onSave,disabled}:{color:string|null;onPreview:(c:string|null)=>void;onSave:(c:string|null)=>void;disabled:boolean}){
 const [value,setValue]=useState(()=>hsv(color||'#526b44'));const ref=useRef(value);
 function change(next:typeof value){ref.current=next;setValue(next);onPreview(hsvHex(next.h,next.s,next.v));}
 function position(e:React.PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();change({...ref.current,s:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),v:Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))});}
 const save=()=>onSave(hsvHex(ref.current.h,ref.current.s,ref.current.v));
 return <div className="folder-color">
 <div className="color-heading"><button aria-label="フォルダ色：未指定" title="未指定" disabled={disabled} onClick={()=>{const standard=hsv("#526b44");ref.current=standard;setValue(standard);onPreview(null);onSave(null);}}><UnsetColor/></button><strong>色変更</strong></div>
 <div className="sv-palette" role="group" aria-label="彩度と明るさ" style={{backgroundColor:hsvHex(value.h,1,1)}} onPointerDown={e=>{if(disabled)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);position(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))position(e);}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){position(e);e.currentTarget.releasePointerCapture(e.pointerId);save();}}} onPointerCancel={save}>
 <i style={{left:`${value.s*100}%`,top:`${(1-value.v)*100}%`}}/>
 </div>
 <input className="hue-slider" aria-label="色相" type="range" min="0" max="359" value={value.h} disabled={disabled} onChange={e=>change({...ref.current,h:Number(e.target.value)})} onPointerUp={save} onKeyUp={save}/>
 <div className="color-keyboard"><label>鮮やかさ<input aria-label="鮮やかさ" type="range" min="0" max="100" value={value.s*100} disabled={disabled} onChange={e=>change({...ref.current,s:Number(e.target.value)/100})} onPointerUp={save} onKeyUp={save}/></label><label>明るさ<input aria-label="明るさ" type="range" min="0" max="100" value={value.v*100} disabled={disabled} onChange={e=>change({...ref.current,v:Number(e.target.value)/100})} onPointerUp={save} onKeyUp={save}/></label></div>
 <div className="color-preview"><i style={{background:color||'#252c26'}}/>{color||<UnsetColor/>}</div>
 </div>;
}
export function foreground(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#101510':'#ffffff';}
