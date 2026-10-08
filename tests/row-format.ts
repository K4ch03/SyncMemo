import assert from 'node:assert/strict';
import {Editor,type ChainedCommands} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle,Color,BackgroundColor,FontSize} from '@tiptap/extension-text-style';
import {RowFormat} from '../lib/row-format';
import {LineBand} from '../lib/line-band';
const make=()=>new Editor({element:null,extensions:[StarterKit,TextStyle,Color,BackgroundColor,FontSize,LineBand,RowFormat],content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'first'}]},{type:'paragraph',content:[{type:'text',text:'second'}]}]}});
for(const [mark,apply] of [
 ['bold',(c:ChainedCommands)=>c.toggleBold()],['underline',(c:ChainedCommands)=>c.toggleUnderline()],['strike',(c:ChainedCommands)=>c.toggleStrike()],['textStyle',(c:ChainedCommands)=>c.setColor('#ff9393')],['textStyle',(c:ChainedCommands)=>c.setBackgroundColor('#334c3e')],['textStyle',(c:ChainedCommands)=>c.setFontSize('22px')]
] as const){const e=make();e.commands.setTextSelection(3);apply(e.chain().selectRowIfEmpty()).restoreRowCaret().run();assert.equal(e.state.selection.from,3);assert.equal(e.state.selection.to,3);assert.ok(e.getJSON().content![0].content![0].marks?.some(m=>m.type===mark));assert.equal(e.getJSON().content![1].content![0].marks,undefined);e.commands.setTextSelection(2);e.chain().selectRowIfEmpty().unsetAllMarks().restoreRowCaret().run();assert.equal(e.getJSON().content![0].content![0].marks,undefined);e.destroy();}
const e=make();e.commands.setTextSelection({from:2,to:4});e.chain().selectRowIfEmpty().toggleBold().restoreRowCaret().run();assert.equal(e.state.selection.from,2);assert.equal(e.state.selection.to,4);
e.commands.setTextSelection(3);e.commands.setLineBand('#31465c');assert.equal(e.state.selection.empty,true);
e.destroy();console.log('PASS row formatting: all seven operations, existing selection preserved, band selection unchanged');
