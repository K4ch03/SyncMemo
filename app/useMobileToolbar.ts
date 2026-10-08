import {useEffect,useState,type RefObject} from 'react';
export function useMobileToolbar(ref:RefObject<HTMLDivElement|null>){
 const [dock,setDock]=useState<'top'|'bottom'>('bottom');
 const [position,setPosition]=useState({top:0,left:0,width:0});
 useEffect(()=>{try{if(localStorage.getItem('linqeditor.toolbar')==='top')setDock('top');}catch{}},[]);
 useEffect(()=>{
   let frame=0;
   const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const v=window.visualViewport;const height=ref.current?.offsetHeight||42;setPosition({top:Math.max(0,(v?.offsetTop||0)+(v?.height||window.innerHeight)-height),left:v?.offsetLeft||0,width:v?.width||window.innerWidth});});};
   const observer=new ResizeObserver(update);if(ref.current)observer.observe(ref.current);
   update();window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);
   return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};
 },[ref,dock]);
 return {dock,position,toggle:()=>setDock(previous=>{const next=previous==='top'?'bottom':'top';try{localStorage.setItem('linqeditor.toolbar',next);}catch{}return next;})};
}
