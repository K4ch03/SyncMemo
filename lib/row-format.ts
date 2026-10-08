import {Extension} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
declare module '@tiptap/core' {interface Commands<ReturnType>{rowFormat:{selectRowIfEmpty:()=>ReturnType;restoreRowCaret:()=>ReturnType}}}
export const RowFormat=Extension.create({
 name:'rowFormat',priority:1200,
 addCommands(){return {selectRowIfEmpty:()=>({tr,dispatch})=>{
   const {empty,$from}=tr.selection;
   if(empty && $from.parent.isTextblock && dispatch){
     tr.setMeta('row-format-caret',$from.pos);
     let from=$from.start(),to=$from.end();
     $from.parent.forEach((node,offset)=>{if(node.type.name==='hardBreak'){const pos=$from.start()+offset;if(pos<$from.pos)from=pos+1;else if(pos>= $from.pos)to=Math.min(to,pos);}});
     tr.setSelection(TextSelection.create(tr.doc,from,to));
   }
   return true;
 },restoreRowCaret:()=>({tr,dispatch})=>{const position=tr.getMeta('row-format-caret');if(dispatch && typeof position==='number')tr.setSelection(TextSelection.create(tr.doc,Math.min(position,tr.doc.content.size)));return true;}};},
 addKeyboardShortcuts(){return {
 'Mod-b':()=>this.editor.chain().selectRowIfEmpty().toggleBold().restoreRowCaret().run(),
 'Mod-u':()=>this.editor.chain().selectRowIfEmpty().toggleUnderline().restoreRowCaret().run(),
 'Mod-Shift-s':()=>this.editor.chain().selectRowIfEmpty().toggleStrike().restoreRowCaret().run()
 };}
});
