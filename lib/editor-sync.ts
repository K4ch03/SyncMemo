import type { JSONContent } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { Selection, TextSelection } from '@tiptap/pm/state';
export function incomingDocument(state:EditorState, body:JSONContent) {
 const next=state.schema.nodeFromJSON(body);
 if(state.doc.eq(next))return null;
 const selection=state.selection.toJSON();
 const tr=state.tr.replaceWith(0,state.doc.content.size,next.content);
 try {tr.setSelection(Selection.fromJSON(tr.doc,selection));}
 catch {tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(state.selection.from,tr.doc.content.size))));}
 return tr.setMeta('preventUpdate',true).setMeta('addToHistory',false);
}
