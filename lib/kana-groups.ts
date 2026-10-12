import type { Note } from "./store";

export const kanaHeadings = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");

const voiced: Record<string, string> = {
  が: "か", ぎ: "き", ぐ: "く", げ: "け", ご: "こ",
  ざ: "さ", じ: "し", ず: "す", ぜ: "せ", ぞ: "そ",
  だ: "た", ぢ: "ち", づ: "つ", で: "て", ど: "と",
  ば: "は", び: "ひ", ぶ: "ふ", べ: "へ", ぼ: "ほ",
  ぱ: "は", ぴ: "ひ", ぷ: "ふ", ぺ: "へ", ぽ: "ほ",
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
  ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ",
};

export function kanaHeading(title: string) {
  const first = (title.trim() || "無題のメモ").charAt(0);
  if (!first) return "#";
  const code = first.charCodeAt(0);
  const kana = code >= 0x30a1 && code <= 0x30f6
    ? String.fromCharCode(code - 0x60)
    : first;
  const heading = voiced[kana] ?? kana;
  return kanaHeadings.includes(heading) ? heading : "#";
}

export function groupByKana(notes: Note[]) {
  const groups = new Map<string, Note[]>();
  for (const heading of [...kanaHeadings, "#"]) groups.set(heading, []);
  for (const note of notes) groups.get(kanaHeading(note.title))!.push(note);
  return [...groups.entries()].filter(([, items]) => items.length);
}
