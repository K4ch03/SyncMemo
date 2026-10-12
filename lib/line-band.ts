import {Plugin, TextSelection} from '@tiptap/pm/state';
import {Extension} from '@tiptap/core';
export const bandColors=[['赤','#57383c'],['橙','#59432f'],['黄','#514c30'],['緑','#334c3e'],['青','#31465c'],['紫','#493c59'],['灰','#41494c']] as const;
const valid=(v:unknown):v is string=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
declare module '@tiptap/core'  {interface Commands<ReturnType>{lineBand:{setLineBand:(color:string|null)=>ReturnType; splitBandParagraph:()=>ReturnType}}}
export const LineBand=Extension.create({
 name:'lineBand', priority:1100,
 addKeyboardShortcuts(){return {Enter:()=>this.editor.isActive('paragraph') && !!this.editor.getAttributes('paragraph').bandColor && this.editor.commands.splitBandParagraph()};},
 addProseMirrorPlugins(){return [new Plugin({props:{handleDOMEvents:{beforeinput:(view,event)=>{
   const input=event as InputEvent;
   if(input.inputType!=='insertParagraph' || input.isComposing || view.composing || !this.editor.getAttributes('paragraph').bandColor)return false;
   const handled=this.editor.commands.splitBandParagraph();if(handled)event.preventDefault();return handled;
 }}}})];},
 addGlobalAttributes(){return [{types:['paragraph'],attributes:{bandColor:{default:null,keepOnSplit:false,parseHTML:el=>valid(el.getAttribute('data-band-color'))?el.getAttribute('data-band-color'):null,renderHTML:attrs=>valid(attrs.bandColor)?{'data-band-color':attrs.bandColor,style:`background-color: ${attrs.bandColor}`}:{}}}}];},
 addCommands(){return {
 splitBandParagraph:()=>({chain,state})=>{
   const color=state.selection.$from.parent.attrs.bandColor;
   const keepBandOnTextLine=state.selection.empty && state.selection.$from.parentOffset===0 && valid(color);
   if(keepBandOnTextLine){
     return chain().command(({tr,dispatch,state})=>{
       const {$from,from}=state.selection;
       for(let depth=$from.depth;depth>0;depth--){
         const node=$from.node(depth);
         if(node.type.name!=='paragraph')continue;
         if(dispatch){
           const pos=$from.before(depth);
           tr.insert(pos,node.type.create({...node.attrs,bandColor:null}));
           tr.setSelection(TextSelection.create(tr.doc,tr.mapping.map(from,1)));
         }
         return true;
       }
       return false;
     }).run();
   }
   return chain().command(({commands})=>commands.first([
     ()=>commands.splitListItem('listItem'),()=>commands.newlineInCode(),()=>commands.createParagraphNear(),()=>commands.liftEmptyBlock(),()=>commands.splitBlock()
   ])).setLineBand(null).run();
 },
 setLineBand:color=>({tr,dispatch})=>{
   if(color!==null && !valid(color))return false;
   const {from,to,empty,$from}=tr.selection;
   if(dispatch){
     if(empty){for(let depth=$from.depth;depth>0;depth--){const node=$from.node(depth);if(node.type.name==='paragraph'){tr.setNodeMarkup($from.before(depth),undefined,{...node.attrs,bandColor:color});break;}}}
     else tr.doc.nodesBetween(from,to,(node,pos)=>{if(node.type.name==='paragraph' && pos+1<to && pos+node.nodeSize>from)tr.setNodeMarkup(pos,undefined,{...node.attrs,bandColor:color});});
   }
   return true;
 }};}
});
