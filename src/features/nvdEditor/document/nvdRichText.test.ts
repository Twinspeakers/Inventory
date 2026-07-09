import { describe, expect, it } from "vitest";
import type { NvdBlock, NvdDocument } from "../../inventoryProject";
import {
  createNvdDocumentBlocks,
  getNvdDocumentBlockLayouts,
  getNvdDocumentRuns,
  nvdTextRunsToTiptapContent,
  tiptapContentToNvdBlockLayouts,
  tiptapContentToNvdTextRuns,
  type NvdBlockLayout,
} from "./nvdRichText";

function createLayout(overrides: Partial<NvdBlockLayout>): NvdBlockLayout {
  return {
    kind: "p",
    keepLinesTogether: false,
    keepWithNext: false,
    lineHeight: 1.4,
    orphanLineCount: 2,
    spaceAfterPt: 0,
    spaceBeforePt: 0,
    textAlign: "left",
    widowLineCount: 2,
    ...overrides,
  };
}

describe("NVD semantic block roles", () => {
  it("round-trips paragraph and heading roles through Tiptap content", () => {
    const layouts = [
      createLayout({ kind: "h1", keepLinesTogether: true, keepWithNext: true, lineHeight: 1.2, spaceAfterPt: 12, spaceBeforePt: 6, textAlign: "center" }),
      createLayout({ kind: "p", lineHeight: 1.75, spaceAfterPt: 0, spaceBeforePt: 0, textAlign: "left" }),
      createLayout({ kind: "h3", keepLinesTogether: true, keepWithNext: true, lineHeight: 2.25, spaceAfterPt: 4, spaceBeforePt: 8, textAlign: "right" }),
    ] as const;

    const content = nvdTextRunsToTiptapContent([{ text: "Title\nBody\nDetail" }], layouts);

    expect(content.content?.map((block) => [block.type, block.attrs?.level])).toEqual([
      ["heading", 1],
      ["paragraph", undefined],
      ["heading", 3],
    ]);
    expect(tiptapContentToNvdBlockLayouts(content)).toEqual(layouts);
  });

  it("persists requested roles while normalizing legacy block kinds", () => {
    const existingBlocks: NvdBlock[] = [
      { id: "legacy-heading", kind: "heading", text: "Title" },
      { id: "legacy-paragraph", kind: "paragraph", text: "Body" },
    ];

    expect(getNvdDocumentBlockLayouts({ blocks: existingBlocks })).toEqual([
      createLayout({ kind: "h1", keepLinesTogether: true, keepWithNext: true, lineHeight: 1.15, spaceAfterPt: 12, spaceBeforePt: 24, textAlign: "left" }),
      createLayout({ kind: "p", lineHeight: 1.4, spaceAfterPt: 8, spaceBeforePt: 0, textAlign: "left" }),
    ]);

    expect(
      createNvdDocumentBlocks([{ text: "Title\nBody" }], existingBlocks, [
        createLayout({ kind: "h2", keepLinesTogether: true, keepWithNext: true, lineHeight: 1.4, spaceAfterPt: 12, spaceBeforePt: 6, textAlign: "left" }),
        createLayout({ kind: "p", lineHeight: 1.75, spaceAfterPt: 0, spaceBeforePt: 0, textAlign: "left" }),
      ]).map((block) => ({ id: block.id, kind: block.kind })),
    ).toEqual([
      { id: "legacy-heading", kind: "h2" },
      { id: "legacy-paragraph", kind: "p" },
    ]);
  });

  it("preserves non-text blocks while rebuilding text paragraphs", () => {
    const existingBlocks: NvdBlock[] = [
      { id: "paragraph-1", kind: "p", text: "Before" },
      {
        id: "embed-1",
        kind: "embed",
        embed: {
          assetId: 12,
          assetKind: "image",
          assetName: "Reference",
          assetPath: "workspace/reference.png",
          alignment: "center",
          caption: "A caption",
          displayMode: "fit",
          sourceDocumentKind: "nvv",
          widthPx: 320,
        },
      },
      { id: "paragraph-2", kind: "p", text: "After" },
    ];

    expect(createNvdDocumentBlocks([{ text: "Updated before\nUpdated after" }], existingBlocks)).toEqual([
      { id: "paragraph-1", kind: "p", text: "Updated before", runs: [{ text: "Updated before" }] },
      existingBlocks[1],
      { id: "paragraph-2", kind: "p", text: "Updated after", runs: [{ text: "Updated after" }] },
    ]);
  });

  it("round-trips character spacing through Tiptap text styles", () => {
    const runs = [{ text: "Wide", style: { characterSpacingPt: 2.5, fontFamily: "Inter" } }];
    const content = nvdTextRunsToTiptapContent(runs);

    expect(tiptapContentToNvdTextRuns(content)).toEqual(runs);
  });

  it("inherits semantic role style values while preserving local run overrides", () => {
    const document: Pick<NvdDocument, "blocks" | "styles"> = {
      blocks: [
        { id: "plain", kind: "p", text: "Plain" },
        {
          id: "overridden",
          kind: "p",
          text: "Custom",
          runs: [{ text: "Custom", style: { fontFamily: "Inter" } }],
        },
        { id: "heading", kind: "h1", text: "Heading" },
        {
          id: "partially-overridden-heading",
          kind: "h2",
          text: "Local heading",
          runs: [{ text: "Local heading", style: { fontFamily: "Inter" } }],
        },
      ],
      styles: {
        p: {
          bold: true,
          characterSpacingPt: 1.5,
          fontFamily: "Caveat",
          fontSizePt: 18,
          italic: true,
          label: "Paragraph",
          lineHeight: 2.25,
          spaceAfterPt: 12,
          spaceBeforePt: 6,
          role: "p",
          textAlign: "center",
        },
        h1: {
          bold: true,
          characterSpacingPt: 2,
          fontFamily: "Press Start 2P",
          fontSizePt: 36,
          italic: false,
          label: "Heading 1",
          lineHeight: 1.15,
          spaceAfterPt: 12,
          spaceBeforePt: 24,
          role: "h1",
          textAlign: "left",
        },
        h2: {
          bold: true,
          characterSpacingPt: 0.5,
          fontFamily: "Roboto Slab",
          fontSizePt: 24,
          italic: true,
          label: "Heading 2",
          lineHeight: 1.2,
          spaceAfterPt: 8,
          spaceBeforePt: 18,
          role: "h2",
          textAlign: "left",
        },
      },
    };

    expect(getNvdDocumentRuns(document)).toEqual([
      {
        text: "Plain",
        style: { bold: true, characterSpacingPt: 1.5, fontFamily: "Caveat", fontSize: "18pt", italic: true },
      },
      { text: "\n" },
      {
        text: "Custom",
        style: { bold: true, characterSpacingPt: 1.5, fontFamily: "Inter", fontSize: "18pt", italic: true },
      },
      { text: "\n" },
      {
        text: "Heading",
        style: { bold: true, characterSpacingPt: 2, fontFamily: "Press Start 2P", fontSize: "36pt" },
      },
      { text: "\n" },
      {
        text: "Local heading",
        style: { bold: true, characterSpacingPt: 0.5, fontFamily: "Inter", fontSize: "24pt", italic: true },
      },
    ]);
    expect(getNvdDocumentBlockLayouts(document)).toEqual([
      createLayout({ kind: "p", lineHeight: 2.25, spaceAfterPt: 12, spaceBeforePt: 6, textAlign: "center" }),
      createLayout({ kind: "p", lineHeight: 2.25, spaceAfterPt: 12, spaceBeforePt: 6, textAlign: "center" }),
      createLayout({ kind: "h1", keepLinesTogether: true, keepWithNext: true, lineHeight: 1.15, spaceAfterPt: 12, spaceBeforePt: 24, textAlign: "left" }),
      createLayout({ kind: "h2", keepLinesTogether: true, keepWithNext: true, lineHeight: 1.2, spaceAfterPt: 8, spaceBeforePt: 18, textAlign: "left" }),
    ]);
  });
});
