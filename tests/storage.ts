import "fake-indexeddb/auto";
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
                { type: "textStyle", attrs: { color: "#ff9393" } },
              ],
            },
          ],
        },
      ],
    },
    plain_text: "大切なこと",
  };
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
