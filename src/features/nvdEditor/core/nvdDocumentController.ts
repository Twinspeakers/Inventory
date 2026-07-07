import type { NvdTextRun } from "../../inventoryProject";
import {
  getNvdTextRunsText,
  replaceNvdTextRunRange,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "./nvdRichText";

export type NvdDocumentEditResult = {
  blockLayouts: NvdBlockLayout[];
  runs: NvdTextRun[];
  selection: NvdTextSelection;
};

export function applyNvdTextEdit(
  runs: NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  selection: NvdTextSelection,
  replacement: string | NvdTextRun[],
) {
  const text = getNvdTextRunsText(runs);
  const clampedSelection = clampSelection(selection, text.length);
  const replacementRuns = typeof replacement === "string" ? [{ text: replacement }] : replacement;
  const replacementText = getNvdTextRunsText(replacementRuns);
  const nextRuns = replaceNvdTextRunRange(
    runs,
    clampedSelection.start,
    clampedSelection.end,
    replacementRuns,
  );
  const nextCursor = clampedSelection.start + replacementText.length;

  return {
    blockLayouts: updateBlockLayoutsForTextEdit(
      blockLayouts,
      text,
      clampedSelection.start,
      clampedSelection.end,
      replacementText,
    ),
    runs: nextRuns,
    selection: {
      end: nextCursor,
      start: nextCursor,
    },
  } satisfies NvdDocumentEditResult;
}

export function deleteNvdBackward(
  runs: NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  selection: NvdTextSelection,
) {
  const text = getNvdTextRunsText(runs);
  const clampedSelection = clampSelection(selection, text.length);

  if (clampedSelection.start !== clampedSelection.end) {
    return applyNvdTextEdit(runs, blockLayouts, clampedSelection, "");
  }

  if (clampedSelection.start <= 0) {
    return {
      blockLayouts: [...blockLayouts],
      runs,
      selection: clampedSelection,
    } satisfies NvdDocumentEditResult;
  }

  return applyNvdTextEdit(
    runs,
    blockLayouts,
    { start: clampedSelection.start - 1, end: clampedSelection.end },
    "",
  );
}

export function deleteNvdForward(
  runs: NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  selection: NvdTextSelection,
) {
  const text = getNvdTextRunsText(runs);
  const clampedSelection = clampSelection(selection, text.length);

  if (clampedSelection.start !== clampedSelection.end) {
    return applyNvdTextEdit(runs, blockLayouts, clampedSelection, "");
  }

  if (clampedSelection.end >= text.length) {
    return {
      blockLayouts: [...blockLayouts],
      runs,
      selection: clampedSelection,
    } satisfies NvdDocumentEditResult;
  }

  return applyNvdTextEdit(
    runs,
    blockLayouts,
    { start: clampedSelection.start, end: clampedSelection.end + 1 },
    "",
  );
}

function updateBlockLayoutsForTextEdit(
  blockLayouts: readonly NvdBlockLayout[],
  text: string,
  start: number,
  end: number,
  replacementText: string,
) {
  const startParagraphIndex = countLineBreaks(text.slice(0, start));
  const removedNewlineCount = countLineBreaks(text.slice(start, end));
  const insertedNewlineCount = countLineBreaks(replacementText);
  const nextLayouts = [...blockLayouts];
  const baseLayout = cloneBlockLayout(
    nextLayouts[startParagraphIndex] ?? nextLayouts[nextLayouts.length - 1] ?? createDefaultBlockLayout(),
  );

  if (removedNewlineCount > 0) {
    nextLayouts.splice(startParagraphIndex + 1, removedNewlineCount);
  }

  if (insertedNewlineCount > 0) {
    nextLayouts.splice(
      startParagraphIndex + 1,
      0,
      ...Array.from({ length: insertedNewlineCount }, () => cloneBlockLayout(baseLayout)),
    );
  }

  return nextLayouts.length > 0 ? nextLayouts : [createDefaultBlockLayout()];
}

function cloneBlockLayout(layout: NvdBlockLayout): NvdBlockLayout {
  return { ...layout };
}

function createDefaultBlockLayout(): NvdBlockLayout {
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
  };
}

function countLineBreaks(text: string) {
  return text.match(/\n/g)?.length ?? 0;
}

function clampSelection(selection: NvdTextSelection, textLength: number): NvdTextSelection {
  const start = clampNumber(selection.start, 0, textLength);
  const end = clampNumber(selection.end, start, textLength);

  return { start, end };
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
