import type { NvdAssetEmbed, NvdBlock, NvdTextBlock } from "../../inventoryProject";
import {
  createNvdBlockDocumentSelection,
  createNvdInsertionDocumentSelection,
  createNvdTextDocumentSelection,
  isNvdBlockDocumentSelection,
  isNvdInsertionDocumentSelection,
  isNvdTextDocumentSelection,
  type NvdDocumentSelection,
} from "./nvdDocumentSelection";
import {
  createNvdEmbedBlock,
  findNvdBlockIndexById,
  insertNvdBlock,
  moveNvdBlock,
  removeNvdSelectedBlock,
  resolveNvdInsertionIndex,
  type NvdDocumentBlockOperationResult,
} from "./nvdDocumentModel";
import type { NvdStyleDefinition } from "./nvdStyles";
import { isNvdTextBlock } from "./nvdRichText";

export type NvdInsertAssetPayload = Omit<NvdAssetEmbed, "alignment" | "caption" | "displayMode" | "heightPx" | "sourceDocumentKind" | "widthPx"> & {
  alignment?: NvdAssetEmbed["alignment"];
  caption?: string;
  displayMode?: NvdAssetEmbed["displayMode"];
  heightPx?: number;
  sourceDocumentKind?: string;
  widthPx?: number;
};

export function normalizeNvdDocumentSelection(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
) {
  if (!selection) {
    return null;
  }

  if (isNvdInsertionDocumentSelection(selection)) {
    return createNvdInsertionDocumentSelection(selection.blockIndex);
  }

  if (isNvdBlockDocumentSelection(selection)) {
    return findNvdBlockIndexById(blocks, selection.blockId) >= 0
      ? selection
      : createNvdInsertionDocumentSelection(blocks.length);
  }

  return createNvdTextDocumentSelection(selection.text.start, selection.text.end);
}

export function resolveNvdInsertionIndexFromSelection(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
) {
  if (!selection) {
    return blocks.length;
  }

  const structuralIndex = resolveNvdInsertionIndex(blocks, selection);

  if (structuralIndex !== null) {
    return structuralIndex;
  }

  if (!isNvdTextDocumentSelection(selection)) {
    return blocks.length;
  }

  const caretOffset = selection.text.end;
  let textCursor = 0;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];

    if (!isNvdTextBlock(block)) {
      continue;
    }

    const blockStart = textCursor;
    const blockEnd = blockStart + block.text.length;

    if (caretOffset <= blockStart) {
      return blockIndex;
    }

    if (caretOffset <= blockEnd) {
      return blockIndex + 1;
    }

    textCursor = blockEnd + 1;
  }

  return blocks.length;
}

export function getNvdTextSelectionForBlockIndex(
  blocks: readonly NvdBlock[],
  blockIndex: number,
  placement: "end" | "start" = "start",
) {
  let textCursor = 0;

  for (let currentBlockIndex = 0; currentBlockIndex < blocks.length; currentBlockIndex += 1) {
    const block = blocks[currentBlockIndex];

    if (!isNvdTextBlock(block)) {
      continue;
    }

    const start = textCursor;
    const end = start + block.text.length;

    if (currentBlockIndex === blockIndex) {
      const offset = placement === "end" ? end : start;
      return createNvdTextDocumentSelection(offset, offset);
    }

    textCursor = end + 1;
  }

  return createNvdTextDocumentSelection(textCursor, textCursor);
}

export function insertNvdAssetAtSelection(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
  asset: NvdInsertAssetPayload,
) {
  const insertionIndex = resolveNvdInsertionIndexFromSelection(blocks, selection);
  return insertNvdBlock(blocks, createNvdEmbedBlock(asset), insertionIndex);
}

export function insertNvdParagraphAtSelection(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
  style: NvdStyleDefinition,
): NvdDocumentBlockOperationResult {
  const insertionIndex = resolveNvdInsertionIndexFromSelection(blocks, selection);
  const result = insertNvdBlock(blocks, createNvdTextBlockFromStyle(style), insertionIndex);

  return {
    blocks: result.blocks,
    selection: getNvdTextSelectionForBlockIndex(result.blocks, insertionIndex),
  };
}

export function insertNvdParagraphTextAtSelection(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
  style: NvdStyleDefinition,
  text: string,
  runs: NvdTextBlock["runs"],
): NvdDocumentBlockOperationResult {
  const insertionIndex = resolveNvdInsertionIndexFromSelection(blocks, selection);
  const result = insertNvdBlock(
    blocks,
    {
      ...createNvdTextBlockFromStyle(style),
      text,
      runs,
    },
    insertionIndex,
  );

  return {
    blocks: result.blocks,
    selection: getNvdTextSelectionForBlockIndex(result.blocks, insertionIndex, "end"),
  };
}

export function removeSelectedNvdBlock(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
) {
  if (!selection) {
    return {
      blocks: [...blocks],
      selection: createNvdInsertionDocumentSelection(blocks.length),
    } satisfies NvdDocumentBlockOperationResult;
  }

  return removeNvdSelectedBlock(blocks, selection);
}

export function moveSelectedNvdBlock(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
  toIndex: number,
) {
  if (!selection || !isNvdBlockDocumentSelection(selection)) {
    return {
      blocks: [...blocks],
      selection: normalizeNvdDocumentSelection(blocks, selection) ?? createNvdInsertionDocumentSelection(blocks.length),
    } satisfies NvdDocumentBlockOperationResult;
  }

  const fromIndex = findNvdBlockIndexById(blocks, selection.blockId);

  if (fromIndex < 0) {
    return {
      blocks: [...blocks],
      selection: createNvdInsertionDocumentSelection(blocks.length),
    } satisfies NvdDocumentBlockOperationResult;
  }

  return moveNvdBlock(blocks, fromIndex, toIndex);
}

export function updateSelectedNvdEmbed(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection | null,
  updates: Partial<NvdAssetEmbed>,
) {
  if (!selection || !isNvdBlockDocumentSelection(selection)) {
    return {
      blocks: [...blocks],
      selection: normalizeNvdDocumentSelection(blocks, selection) ?? createNvdInsertionDocumentSelection(blocks.length),
    } satisfies NvdDocumentBlockOperationResult;
  }

  const blockIndex = findNvdBlockIndexById(blocks, selection.blockId);
  const targetBlock = blockIndex >= 0 ? blocks[blockIndex] : null;

  if (!targetBlock || targetBlock.kind !== "embed") {
    return {
      blocks: [...blocks],
      selection: createNvdInsertionDocumentSelection(blocks.length),
    } satisfies NvdDocumentBlockOperationResult;
  }

  const embedBlock = targetBlock as Extract<NvdBlock, { kind: "embed" }>;
  const nextBlocks = [...blocks];
  nextBlocks[blockIndex] = {
    ...embedBlock,
    embed: {
      ...embedBlock.embed,
      ...updates,
    },
  };

  return {
    blocks: nextBlocks,
    selection: createNvdBlockDocumentSelection(embedBlock.id),
  } satisfies NvdDocumentBlockOperationResult;
}

function createNvdTextBlockFromStyle(style: NvdStyleDefinition): NvdTextBlock {
  return {
    id: `block-${Math.random().toString(36).slice(2, 10)}`,
    kind: style.role,
    keepLinesTogether: style.keepLinesTogether,
    keepWithNext: style.keepWithNext,
    lineHeight: style.lineHeight,
    orphanLineCount: style.orphanLineCount,
    spaceAfterPt: style.spaceAfterPt,
    spaceBeforePt: style.spaceBeforePt,
    text: "",
    runs: [],
    textAlign: style.textAlign,
    widowLineCount: style.widowLineCount,
  };
}
