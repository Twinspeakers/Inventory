import type {
  NvdAssetEmbed,
  NvdBlock,
  NvdEmbedAlignment,
  NvdEmbedBlock,
  NvdEmbedDisplayMode,
} from "../../inventoryProject";
import {
  createNvdBlockDocumentSelection,
  createNvdInsertionDocumentSelection,
  isNvdBlockDocumentSelection,
  isNvdInsertionDocumentSelection,
  type NvdDocumentSelection,
} from "./nvdDocumentSelection";

type NvdEmbedBlockInput = Omit<
  NvdAssetEmbed,
  "alignment" | "caption" | "displayMode" | "heightPx" | "sourceDocumentKind" | "widthPx"
> & {
  alignment?: NvdEmbedAlignment;
  caption?: string;
  displayMode?: NvdEmbedDisplayMode;
  heightPx?: number;
  id?: string;
  sourceDocumentKind?: string;
  widthPx?: number;
};

export type NvdDocumentBlockOperationResult = {
  blocks: NvdBlock[];
  selection: NvdDocumentSelection;
};

export function createNvdEmbedBlock({
  alignment = "center",
  assetId,
  assetKind,
  assetName,
  assetPath,
  caption,
  displayMode = "fit",
  heightPx,
  id,
  sourceDocumentKind,
  widthPx,
}: NvdEmbedBlockInput): NvdEmbedBlock {
  return {
    id: id?.trim() || createNvdDocumentBlockId(),
    kind: "embed",
    embed: {
      alignment,
      assetId,
      assetKind: assetKind.trim() || "image",
      assetName: assetName.trim() || getFallbackAssetName(assetPath),
      assetPath: assetPath.trim(),
      ...(normalizeOptionalString(caption) ? { caption: normalizeOptionalString(caption) } : {}),
      displayMode,
      ...(normalizePositiveNumber(heightPx) ? { heightPx: normalizePositiveNumber(heightPx) } : {}),
      ...(normalizeOptionalString(sourceDocumentKind)
        ? { sourceDocumentKind: normalizeOptionalString(sourceDocumentKind) }
        : {}),
      ...(normalizePositiveNumber(widthPx) ? { widthPx: normalizePositiveNumber(widthPx) } : {}),
    },
  };
}

export function findNvdBlockIndexById(blocks: readonly NvdBlock[], blockId: string) {
  return blocks.findIndex((block) => block.id === blockId);
}

export function insertNvdBlock(
  blocks: readonly NvdBlock[],
  block: NvdBlock,
  index: number,
): NvdDocumentBlockOperationResult {
  const insertionIndex = clampBlockIndex(index, blocks.length);
  return {
    blocks: [...blocks.slice(0, insertionIndex), block, ...blocks.slice(insertionIndex)],
    selection: createNvdBlockDocumentSelection(block.id),
  };
}

export function removeNvdBlockById(
  blocks: readonly NvdBlock[],
  blockId: string,
): NvdDocumentBlockOperationResult {
  return removeNvdBlockAtIndex(blocks, findNvdBlockIndexById(blocks, blockId));
}

export function removeNvdSelectedBlock(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection,
): NvdDocumentBlockOperationResult {
  if (!isNvdBlockDocumentSelection(selection)) {
    return {
      blocks: [...blocks],
      selection,
    };
  }

  return removeNvdBlockById(blocks, selection.blockId);
}

export function removeNvdBlockAtIndex(
  blocks: readonly NvdBlock[],
  index: number,
): NvdDocumentBlockOperationResult {
  const clampedInsertionIndex = clampBlockIndex(index, blocks.length);

  if (blocks.length === 0 || index < 0 || index >= blocks.length) {
    return {
      blocks: [...blocks],
      selection: createNvdInsertionDocumentSelection(clampedInsertionIndex),
    };
  }

  return {
    blocks: [...blocks.slice(0, index), ...blocks.slice(index + 1)],
    selection: createNvdInsertionDocumentSelection(Math.min(index, Math.max(0, blocks.length - 1))),
  };
}

export function moveNvdBlock(
  blocks: readonly NvdBlock[],
  fromIndex: number,
  toIndex: number,
): NvdDocumentBlockOperationResult {
  if (blocks.length === 0) {
    return {
      blocks: [],
      selection: createNvdInsertionDocumentSelection(0),
    };
  }

  const sourceIndex = clampBlockIndex(fromIndex, blocks.length - 1);
  const destinationIndex = clampBlockIndex(toIndex, blocks.length - 1);
  const nextBlocks = [...blocks];
  const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
  nextBlocks.splice(destinationIndex, 0, movedBlock);

  return {
    blocks: nextBlocks,
    selection: createNvdBlockDocumentSelection(movedBlock.id),
  };
}

export function resolveNvdInsertionIndex(
  blocks: readonly NvdBlock[],
  selection: NvdDocumentSelection,
) {
  if (isNvdInsertionDocumentSelection(selection)) {
    return clampBlockIndex(selection.blockIndex, blocks.length);
  }

  if (isNvdBlockDocumentSelection(selection)) {
    const blockIndex = findNvdBlockIndexById(blocks, selection.blockId);
    return blockIndex >= 0 ? blockIndex : blocks.length;
  }

  return null;
}

function clampBlockIndex(index: number, maximum: number) {
  return Math.min(Math.max(Math.floor(index), 0), maximum);
}

function createNvdDocumentBlockId() {
  return `block-${Math.random().toString(36).slice(2, 10)}`;
}

function getFallbackAssetName(assetPath: string) {
  const normalizedPath = assetPath.trim().replace(/\\/g, "/");
  return normalizedPath.split("/").filter(Boolean).pop() ?? "Embedded Asset";
}

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePositiveNumber(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : undefined;
}
