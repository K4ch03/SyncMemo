import "fake-indexeddb/auto";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle,Color,BackgroundColor,FontSize } from "@tiptap/extension-text-style";
import assert from "node:assert/strict";
import { local, newNote } from "../lib/store";
async function main() {
  const n = {
    ...newNote(),
    title: "日本語のメモ",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "大切なこと",
              marks: [
                { type: "bold" },
                { type: "strike" },
                { type: "underline" },
                { type: "textStyle", attrs: { color: "#ff9393", backgroundColor: "#344d2c", fontSize: "24px" } },
              ],
            },
          ],
        },
      ],
    },
    plain_text: "大切なこと",
  };
  const schema = getSchema([StarterKit.configure({italic:false}),TextStyle,Color,BackgroundColor,FontSize]);
  const roundtrip = schema.nodeFromJSON(n.body).toJSON();
  const marks = roundtrip.content[0].content[0].marks;
  for (const mark of ["bold","strike","underline","textStyle"]) assert.ok(marks.some((m: {type:string}) => m.type === mark));
  assert.equal(marks.find((m: {type:string})=>m.type === "textStyle").attrs.fontSize,"24px");
  assert.equal(marks.find((m: {type:string})=>m.type === "textStyle").attrs.backgroundColor,"#344d2c");
  await local.put(n);
  assert.deepEqual((await local.all())[0], n);
  await local.put({ ...n, title: "更新" });
  assert.equal((await local.all()).length, 1);
  assert.equal((await local.all())[0].title, "更新");
  await local.remove(n.id);
  assert.equal((await local.all()).length, 0);
  console.log("PASS IndexedDB: create, rich-text roundtrip, update, delete");
}
void main();
