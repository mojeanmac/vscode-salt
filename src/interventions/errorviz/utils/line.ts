import type { TextEditor } from "vscode";

import { range } from "../../../utils/math";

type Index = number;

/**
 * in the current editor document,
 * gets the difference of line width of the longest line between indeces `from` to `to` (inclusive)
 * and the width of `from` in character count,
 * i.e. how many characters line `from` would need to be padded to be equal in length to the longest line between `from` and `to`.
 */
export function getXshift(editor: TextEditor, from: Index, to: Index): number {
  const longest = Math.max(
    ...range(from, to + 1).map((li) => {
      try {
        return editor.document.lineAt(li).text.length;
      } catch (_) {
        return 0;
      }
    })
  );
  const first = editor.document.lineAt(from).text.length;
  return longest - first;
}
