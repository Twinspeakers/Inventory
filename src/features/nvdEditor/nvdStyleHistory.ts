import type { EditorState, Transaction } from "@tiptap/pm/state";

export function createNvdStyleHistoryAnchorTransaction(state: EditorState): Transaction | null {
  const firstBlock = state.doc.firstChild;

  if (!firstBlock) {
    return null;
  }

  return state.tr.setNodeMarkup(0, firstBlock.type, { ...firstBlock.attrs }, firstBlock.marks);
}
