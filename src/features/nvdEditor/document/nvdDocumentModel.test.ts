import { describe, expect, it } from "vitest";
import type { NvdBlock } from "../../inventoryProject";
import {
  createNvdEmbedBlock,
  findNvdBlockIndexById,
  insertNvdBlock,
  moveNvdBlock,
  removeNvdBlockAtIndex,
  removeNvdBlockById,
  removeNvdSelectedBlock,
  resolveNvdInsertionIndex,
} from "./nvdDocumentModel";
import {
  createNvdBlockDocumentSelection,
  createNvdInsertionDocumentSelection,
  createNvdTextDocumentSelection,
} from "./nvdDocumentSelection";

describe("NVD document model", () => {
  it("creates normalized embed blocks with durable defaults", () => {
    const block = createNvdEmbedBlock({
      assetId: 12,
      assetKind: " ",
      assetName: " ",
      assetPath: " workspace/reference.png ",
      caption: "  Figure 1  ",
      displayMode: "custom",
      heightPx: -5,
      id: "embed-1",
      sourceDocumentKind: " NVV ",
      widthPx: 480,
    });

    expect(block).toEqual({
      id: "embed-1",
      kind: "embed",
      embed: {
        alignment: "center",
        assetId: 12,
        assetKind: "image",
        assetName: "reference.png",
        assetPath: "workspace/reference.png",
        caption: "Figure 1",
        displayMode: "custom",
        sourceDocumentKind: "NVV",
        widthPx: 480,
      },
    });
  });

  it("inserts blocks at a clamped index and selects the inserted block", () => {
    const blocks: NvdBlock[] = [{ id: "p-1", kind: "p", text: "Intro" }];
    const embed = createNvdEmbedBlock({
      assetId: 9,
      assetKind: "image",
      assetName: "Photo",
      assetPath: "workspace/photo.png",
      id: "embed-1",
    });

    expect(insertNvdBlock(blocks, embed, 99)).toEqual({
      blocks: [blocks[0], embed],
      selection: {
        blockId: "embed-1",
        kind: "block",
      },
    });
  });

  it("removes blocks by id and leaves an insertion selection at the removed slot", () => {
    const blocks: NvdBlock[] = [
      { id: "p-1", kind: "p", text: "Intro" },
      createNvdEmbedBlock({
        assetId: 9,
        assetKind: "image",
        assetName: "Photo",
        assetPath: "workspace/photo.png",
        id: "embed-1",
      }),
      { id: "p-2", kind: "p", text: "Outro" },
    ];

    expect(removeNvdBlockById(blocks, "embed-1")).toEqual({
      blocks: [blocks[0], blocks[2]],
      selection: {
        blockIndex: 1,
        kind: "insertion",
      },
    });
  });

  it("moves blocks and preserves selection on the moved block", () => {
    const blocks: NvdBlock[] = [
      { id: "p-1", kind: "p", text: "Intro" },
      { id: "p-2", kind: "p", text: "Body" },
      { id: "p-3", kind: "p", text: "Outro" },
    ];

    expect(moveNvdBlock(blocks, 0, 2)).toEqual({
      blocks: [blocks[1], blocks[2], blocks[0]],
      selection: {
        blockId: "p-1",
        kind: "block",
      },
    });
  });

  it("finds block indexes and handles invalid removals without mutating content", () => {
    const blocks: NvdBlock[] = [{ id: "p-1", kind: "p", text: "Intro" }];

    expect(findNvdBlockIndexById(blocks, "p-1")).toBe(0);
    expect(findNvdBlockIndexById(blocks, "missing")).toBe(-1);
    expect(removeNvdBlockAtIndex(blocks, 3)).toEqual({
      blocks,
      selection: {
        blockIndex: 1,
        kind: "insertion",
      },
    });
  });

  it("removes the selected block when document selection is block-based", () => {
    const blocks: NvdBlock[] = [
      { id: "p-1", kind: "p", text: "Intro" },
      { id: "p-2", kind: "p", text: "Body" },
    ];

    expect(removeNvdSelectedBlock(blocks, createNvdBlockDocumentSelection("p-1"))).toEqual({
      blocks: [blocks[1]],
      selection: {
        blockIndex: 0,
        kind: "insertion",
      },
    });
    expect(removeNvdSelectedBlock(blocks, createNvdTextDocumentSelection(0, 0))).toEqual({
      blocks,
      selection: {
        kind: "text",
        text: {
          end: 0,
          start: 0,
        },
      },
    });
  });

  it("resolves insertion indexes from insertion and block selections", () => {
    const blocks: NvdBlock[] = [
      { id: "p-1", kind: "p", text: "Intro" },
      { id: "p-2", kind: "p", text: "Body" },
    ];

    expect(resolveNvdInsertionIndex(blocks, createNvdInsertionDocumentSelection(1))).toBe(1);
    expect(resolveNvdInsertionIndex(blocks, createNvdBlockDocumentSelection("p-2"))).toBe(1);
    expect(resolveNvdInsertionIndex(blocks, createNvdBlockDocumentSelection("missing"))).toBe(2);
    expect(resolveNvdInsertionIndex(blocks, createNvdTextDocumentSelection(0, 4))).toBeNull();
  });
});
