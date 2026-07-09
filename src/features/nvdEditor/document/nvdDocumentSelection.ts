import type { NvdTextSelection } from "./nvdRichText";

export type NvdDocumentSelection =
  | {
      kind: "text";
      text: NvdTextSelection;
    }
  | {
      kind: "block";
      blockId: string;
    }
  | {
      kind: "insertion";
      blockIndex: number;
    };

export function createNvdTextDocumentSelection(start: number, end: number): NvdDocumentSelection {
  return {
    kind: "text",
    text: {
      end: Math.max(start, end),
      start: Math.min(start, end),
    },
  };
}

export function createNvdBlockDocumentSelection(blockId: string): NvdDocumentSelection {
  return {
    blockId,
    kind: "block",
  };
}

export function createNvdInsertionDocumentSelection(blockIndex: number): NvdDocumentSelection {
  return {
    blockIndex: Math.max(0, Math.floor(blockIndex)),
    kind: "insertion",
  };
}

export function isNvdTextDocumentSelection(
  selection: NvdDocumentSelection,
): selection is Extract<NvdDocumentSelection, { kind: "text" }> {
  return selection.kind === "text";
}

export function isNvdBlockDocumentSelection(
  selection: NvdDocumentSelection,
): selection is Extract<NvdDocumentSelection, { kind: "block" }> {
  return selection.kind === "block";
}

export function isNvdInsertionDocumentSelection(
  selection: NvdDocumentSelection,
): selection is Extract<NvdDocumentSelection, { kind: "insertion" }> {
  return selection.kind === "insertion";
}
