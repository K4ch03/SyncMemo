import {Extension} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
declare module '@tiptap/core' {interface Commands<ReturnType>{rowFormat:{selectRowIfEmpty:()=>ReturnType}}}
export const RowFormat=Extension.create({
 name:'rowFormat',priority:1200,
 addCommands(){return {selectRowIfEmpty:()=>({tr,dispatch})=>{
   const {empty,$from}=tr.selection;
   if(empty && $from.parent.isTextblock && dispatch){
     let from=$from.start(),to=$from.end();
     $from.parent.forEach((node,offset)=>{if(node.type.name==='hardBreak'){const pos=$from.start()+offset;if(pos<$from.pos)from=pos+1;else if(pos>= $from.pos)to=Math.min(to,pos);}});
     tr.setSelection(TextSelection.create(tr.doc,from,to));
   }
   return true;
 }};},
 addKeyboardShortcuts(){return {
 'Mod-b':()=>this.editor.chain().selectRowIfEmpty().toggleBold().run(),
 'Mod-u':()=>this.editor.chain().selectRowIfEmpty().toggleUnderline().run(),
 'Mod-Shift-s':()=>this.editor.chain().selectRowIfEmpty().toggleStrike().run()
 };}
});
