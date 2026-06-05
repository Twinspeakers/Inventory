import { Schema } from "@tiptap/pm/model";
import { history, redo, redoDepth, undo, undoDepth } from "@tiptap/pm/history";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { createNvdStyleHistoryAnchorTransaction } from "./nvdStyleHistory";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});

describe("NVD style history", () => {
  it("creates an undoable history event without changing document content", () => {
    let state = EditorState.create({
      doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("Inventory"))]),
      plugins: [history()],
      schema,
    });
    const originalDocument = state.doc.toJSON();
    const anchor = createNvdStyleHistoryAnchorTransaction(state);

    expect(anchor).not.toBeNull();
    state = state.apply(anchor!);

    expect(state.doc.toJSON()).toEqual(originalDocument);
    expect(undoDepth(state)).toBe(1);

    undo(state, (transaction) => {
      state = state.apply(transaction);
    });
    expect(state.doc.toJSON()).toEqual(originalDocument);
    expect(redoDepth(state)).toBe(1);

    redo(state, (transaction) => {
      state = state.apply(transaction);
    });
    expect(state.doc.toJSON()).toEqual(originalDocument);
    expect(undoDepth(state)).toBe(1);
  });
});
