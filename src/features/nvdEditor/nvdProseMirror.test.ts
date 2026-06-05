import { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { getProseMirrorPositionsForTextOffsets } from "./nvdProseMirror";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});

describe("NVD ProseMirror offset projection", () => {
  it("maps sorted document offsets across paragraph separators in one pass", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("abc")),
      schema.node("paragraph", null, schema.text("defgh")),
      schema.node("paragraph", null, schema.text("i")),
    ]);

    expect(getProseMirrorPositionsForTextOffsets(doc, [0, 3, 4, 9, 10, 11, 99])).toEqual([
      1,
      4,
      6,
      11,
      13,
      14,
      doc.content.size,
    ]);
  });
});
