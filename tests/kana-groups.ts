import assert from "node:assert/strict";
import { groupByKana, kanaHeading } from "../lib/kana-groups";
import type { Note } from "../lib/store";

assert.equal(kanaHeading("あいう"), "あ");
assert.equal(kanaHeading("アイウ"), "あ");
assert.equal(kanaHeading("ガイル対策"), "か");
assert.equal(kanaHeading("ぱなし対策"), "は");
assert.equal(kanaHeading(""), "#");
assert.equal(kanaHeading("SF6"), "#");

const base = {
  id: "id",
  body: {},
  plain_text: "",
  created_at: "",
  updated_at: "",
  revision: 1,
} satisfies Omit<Note, "title">;
const groups = groupByKana([
  { ...base, id: "1", title: "アキ" },
  { ...base, id: "2", title: "いぶき" },
  { ...base, id: "3", title: "ザンギ" },
  { ...base, id: "4", title: "SF6" },
]);
assert.deepEqual(groups.map(([heading]) => heading), ["あ", "い", "さ", "#"]);
console.log("PASS kana groups: hiragana, katakana, voiced kana, fallback");
