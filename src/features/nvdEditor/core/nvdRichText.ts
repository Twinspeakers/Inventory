import type { Editor, JSONContent } from "@tiptap/core";
import type {
  NvdBlock,
  NvdDocument,
  NvdTextAlignment,
  NvdTextRun,
  NvdTextStyle,
} from "../../inventoryProject";
import { getNvdFontCssFamilyName, getNvdFontFamily } from "../fonts";
import { getNvdFontSizeCssValue, getNvdFontSizePt } from "../primitives/nvdFontSize";
import {
  DEFAULT_NVD_CHARACTER_SPACING_PT,
  getNvdCharacterSpacingPt,
} from "../primitives/nvdCharacterSpacing";
import { DEFAULT_NVD_LINE_HEIGHT, getNvdLineHeight } from "../primitives/nvdLineHeight";
import {
  DEFAULT_NVD_PARAGRAPH_SPACING_PT,
  getNvdParagraphSpacingPt,
} from "../primitives/nvdParagraphSpacing";
import {
  getNvdDocumentStyleDefinitions,
  getNvdStyleRole,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "./nvdStyles";

export const DEFAULT_NVD_TEXT_ALIGNMENT: NvdTextAlignment = "left";
export const NVD_TEXT_ALIGNMENTS: NvdTextAlignment[] = ["left", "center", "right", "justify"];

export type NvdBlockLayout = {
  kind: NvdStyleRole;
  keepLinesTogether: boolean;
  keepWithNext: boolean;
  lineHeight: number;
  orphanLineCount: number;
  spaceAfterPt: number;
  spaceBeforePt: number;
  textAlign: NvdTextAlignment;
  widowLineCount: number;
};

export type NvdTextSelection = {
  end: number;
  start: number;
};

export function getNvdDocumentText(document: Pick<NvdDocument, "blocks">) {
  return document.blocks.map((block) => block.text).join("\n");
}

export function getNvdDocumentRuns(document: Pick<NvdDocument, "blocks" | "styles">) {
  const runs: NvdTextRun[] = [];
  const styles = getNvdDocumentStyleDefinitions(document.styles);

  document.blocks.forEach((block, index) => {
    if (index > 0) {
      appendNvdTextRun(runs, { text: "\n" });
    }

    getNvdBlockRuns(block, styles[getNvdStyleRole(block.kind)]).forEach((run) =>
      appendNvdTextRun(runs, run),
    );
  });

  return normalizeNvdTextRuns(runs);
}

export function createNvdDocumentBlocks(
  runs: NvdTextRun[],
  existingBlocks: NvdBlock[],
  blockLayouts?: readonly NvdBlockLayout[],
) {
  const paragraphRuns = splitNvdTextRunsIntoParagraphs(runs);
  const paragraphTexts = paragraphRuns.map(getNvdTextRunsText);
  const matchedBlocks = matchExistingBlocksToParagraphs(existingBlocks, paragraphTexts);

  return paragraphRuns.map((runs, index) => {
    const existingBlock = matchedBlocks[index];
    const requestedLayout = blockLayouts?.[index];
    const kind = requestedLayout?.kind ?? getNvdStyleRole(existingBlock?.kind);
    const textAlign = getNvdTextAlignment(
      requestedLayout ? requestedLayout.textAlign : existingBlock?.textAlign,
    );
    const keepLinesTogether = getNvdKeepLinesTogether(
      requestedLayout?.keepLinesTogether ?? existingBlock?.keepLinesTogether,
      kind,
    );
    const keepWithNext = getNvdKeepWithNext(
      requestedLayout?.keepWithNext ?? existingBlock?.keepWithNext,
      kind,
    );
    const lineHeight = getNvdLineHeight(requestedLayout?.lineHeight ?? existingBlock?.lineHeight);
    const orphanLineCount = getNvdParagraphLineConstraint(
      requestedLayout?.orphanLineCount ?? existingBlock?.orphanLineCount,
    );
    const spaceAfterPt = getNvdParagraphSpacingPt(
      requestedLayout?.spaceAfterPt ?? existingBlock?.spaceAfterPt,
    );
    const spaceBeforePt = getNvdParagraphSpacingPt(
      requestedLayout?.spaceBeforePt ?? existingBlock?.spaceBeforePt,
    );
    const widowLineCount = getNvdParagraphLineConstraint(
      requestedLayout?.widowLineCount ?? existingBlock?.widowLineCount,
    );

    return {
      id: existingBlock?.id ?? createNvdBlockId(),
      kind,
      ...(keepLinesTogether ? { keepLinesTogether } : {}),
      ...(keepWithNext ? { keepWithNext } : {}),
      ...(lineHeight !== DEFAULT_NVD_LINE_HEIGHT ? { lineHeight } : {}),
      ...(orphanLineCount > 2 ? { orphanLineCount } : {}),
      ...(spaceAfterPt !== DEFAULT_NVD_PARAGRAPH_SPACING_PT ? { spaceAfterPt } : {}),
      ...(spaceBeforePt !== DEFAULT_NVD_PARAGRAPH_SPACING_PT ? { spaceBeforePt } : {}),
      text: paragraphTexts[index],
      runs,
      ...(textAlign !== DEFAULT_NVD_TEXT_ALIGNMENT ? { textAlign } : {}),
      ...(widowLineCount > 2 ? { widowLineCount } : {}),
    };
  }) satisfies NvdBlock[];
}

export function getNvdTextRunsText(runs: NvdTextRun[]) {
  return runs.map((run) => run.text).join("");
}

export function getNvdDocumentFontFamilies(
  document: Pick<NvdDocument, "blocks" | "fontFamily" | "styles"> | null | undefined,
) {
  if (!document) {
    return [getNvdFontFamily(null)];
  }

  const fontFamilies = new Set<string>([getNvdFontFamily(document.fontFamily)]);

  for (const run of getNvdDocumentRuns(document)) {
    if (run.style?.fontFamily) {
      fontFamilies.add(getNvdFontFamily(run.style.fontFamily));
    }
  }

  return [...fontFamilies];
}

export function getNvdTextRunFontFamily(run: NvdTextRun, defaultFontFamily: string) {
  return getNvdFontFamily(run.style?.fontFamily ?? defaultFontFamily);
}

export function getNvdTextRunFontSizePt(run: NvdTextRun, defaultFontSize: string | number) {
  return getNvdFontSizePt(run.style?.fontSize ?? defaultFontSize);
}

export function getNvdTextRunCharacterSpacingPt(run: NvdTextRun) {
  return getNvdCharacterSpacingPt(run.style?.characterSpacingPt);
}

export function isNvdTextRunBold(run: NvdTextRun) {
  return run.style?.bold === true;
}

export function isNvdTextRunItalic(run: NvdTextRun) {
  return run.style?.italic === true;
}

export function getNvdTextAlignment(value: string | null | undefined): NvdTextAlignment {
  return NVD_TEXT_ALIGNMENTS.includes(value as NvdTextAlignment)
    ? (value as NvdTextAlignment)
    : DEFAULT_NVD_TEXT_ALIGNMENT;
}

export function getNvdDocumentTextAlignments(document: Pick<NvdDocument, "blocks">) {
  return document.blocks.map((block) => getNvdTextAlignment(block.textAlign));
}

export function getNvdDocumentBlockLayouts(document: Pick<NvdDocument, "blocks" | "styles">) {
  const styles = getNvdDocumentStyleDefinitions(document.styles);

  return document.blocks.map((block) => {
    const kind = getNvdStyleRole(block.kind);
    return {
      kind,
      keepLinesTogether: getNvdKeepLinesTogether(
        block.keepLinesTogether ?? styles[kind].keepLinesTogether,
        kind,
      ),
      keepWithNext: getNvdKeepWithNext(block.keepWithNext ?? styles[kind].keepWithNext, kind),
      lineHeight: getNvdLineHeight(block.lineHeight ?? styles[kind].lineHeight),
      orphanLineCount: getNvdParagraphLineConstraint(
        block.orphanLineCount ?? styles[kind].orphanLineCount,
      ),
      spaceAfterPt: getNvdParagraphSpacingPt(block.spaceAfterPt ?? styles[kind].spaceAfterPt),
      spaceBeforePt: getNvdParagraphSpacingPt(block.spaceBeforePt ?? styles[kind].spaceBeforePt),
      textAlign: getNvdTextAlignment(block.textAlign ?? styles[kind].textAlign),
      widowLineCount: getNvdParagraphLineConstraint(
        block.widowLineCount ?? styles[kind].widowLineCount,
      ),
    };
  }) satisfies NvdBlockLayout[];
}

export function normalizeNvdTextRuns(runs: NvdTextRun[]) {
  const normalizedRuns: NvdTextRun[] = [];

  for (const run of runs) {
    if (!run.text) {
      continue;
    }

    appendNvdTextRun(normalizedRuns, {
      text: run.text,
      style: normalizeNvdTextStyle(run.style),
    });
  }

  return normalizedRuns;
}

export function sliceNvdTextRuns(runs: NvdTextRun[], start: number, end: number) {
  const normalizedRuns = normalizeNvdTextRuns(runs);
  const textLength = getNvdTextRunsText(normalizedRuns).length;
  const clampedStart = clampNumber(start, 0, textLength);
  const clampedEnd = clampNumber(end, clampedStart, textLength);
  const slicedRuns: NvdTextRun[] = [];
  let offset = 0;

  for (const run of normalizedRuns) {
    const runStart = offset;
    const runEnd = runStart + run.text.length;
    offset = runEnd;

    if (runEnd <= clampedStart || runStart >= clampedEnd) {
      continue;
    }

    const localStart = Math.max(0, clampedStart - runStart);
    const localEnd = Math.min(run.text.length, clampedEnd - runStart);
    appendNvdTextRun(slicedRuns, {
      text: run.text.slice(localStart, localEnd),
      style: run.style,
    });
  }

  return slicedRuns;
}

export function replaceNvdTextRunRange(
  runs: NvdTextRun[],
  start: number,
  end: number,
  replacementRuns: NvdTextRun[],
) {
  const textLength = getNvdTextRunsText(runs).length;
  const clampedStart = clampNumber(start, 0, textLength);
  const clampedEnd = clampNumber(end, clampedStart, textLength);

  return normalizeNvdTextRuns([
    ...sliceNvdTextRuns(runs, 0, clampedStart),
    ...replacementRuns,
    ...sliceNvdTextRuns(runs, clampedEnd, textLength),
  ]);
}

export function nvdTextRunsToTiptapContent(
  runs: NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[] = [],
): JSONContent {
  const paragraphs = splitNvdTextRunsIntoParagraphs(runs);

  return {
    type: "doc",
    content: paragraphs.map((paragraphRuns, index) =>
      createTiptapBlock(paragraphRuns, blockLayouts[index]),
    ),
  };
}

export function tiptapContentToNvdTextRuns(content: JSONContent) {
  const runs: NvdTextRun[] = [];
  const blocks = content.content ?? [];

  blocks.forEach((block, index) => {
    if (index > 0) {
      appendNvdTextRun(runs, { text: "\n" });
    }

    appendTiptapNodeRuns(runs, block);
  });

  return normalizeNvdTextRuns(runs);
}

export function tiptapContentToNvdTextAlignments(content: JSONContent) {
  return tiptapContentToNvdBlockLayouts(content).map((layout) => layout.textAlign);
}

export function tiptapContentToNvdBlockLayouts(content: JSONContent): NvdBlockLayout[] {
  const blocks = content.content ?? [];

  if (blocks.length === 0) {
    return [{
      kind: "p",
      keepLinesTogether: false,
      keepWithNext: false,
      lineHeight: DEFAULT_NVD_LINE_HEIGHT,
      orphanLineCount: 2,
      spaceAfterPt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
      spaceBeforePt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
      textAlign: DEFAULT_NVD_TEXT_ALIGNMENT,
      widowLineCount: 2,
    }];
  }

  return blocks.map((block) => ({
    kind: getTiptapBlockStyleRole(block),
    keepLinesTogether: getNvdKeepLinesTogether(block.attrs?.keepLinesTogether, getTiptapBlockStyleRole(block)),
    keepWithNext: getNvdKeepWithNext(block.attrs?.keepWithNext, getTiptapBlockStyleRole(block)),
    lineHeight: getNvdLineHeight(block.attrs?.lineHeight),
    orphanLineCount: getNvdParagraphLineConstraint(block.attrs?.orphanLineCount),
    spaceAfterPt: getNvdParagraphSpacingPt(block.attrs?.spaceAfterPt),
    spaceBeforePt: getNvdParagraphSpacingPt(block.attrs?.spaceBeforePt),
    textAlign: getNvdTextAlignment(
      typeof block.attrs?.textAlign === "string" ? block.attrs.textAlign : undefined,
    ),
    widowLineCount: getNvdParagraphLineConstraint(block.attrs?.widowLineCount),
  })) satisfies NvdBlockLayout[];
}

export function getNvdEditorSelection(editor: Editor): NvdTextSelection {
  const { from, to } = editor.state.selection;

  return {
    start: getNvdTextOffsetForTiptapPosition(editor, from),
    end: getNvdTextOffsetForTiptapPosition(editor, to),
  };
}

function getNvdBlockRuns(block: NvdBlock, roleStyle: NvdStyleDefinition) {
  const normalizedRuns = normalizeNvdTextRuns(block.runs ?? []);
  const blockRuns =
    getNvdTextRunsText(normalizedRuns) === block.text
      ? normalizedRuns
      : block.text
        ? [{ text: block.text }]
        : [];

  return blockRuns.map((run) => ({
    ...run,
    style: normalizeNvdTextStyle({
      bold: run.style?.bold ?? roleStyle.bold,
      characterSpacingPt: run.style?.characterSpacingPt ?? roleStyle.characterSpacingPt,
      fontFamily: run.style?.fontFamily ?? roleStyle.fontFamily,
      fontSize: run.style?.fontSize ?? getNvdFontSizeCssValue(roleStyle.fontSizePt),
      italic: run.style?.italic ?? roleStyle.italic,
    }),
  }));
}

function appendNvdTextRun(runs: NvdTextRun[], run: NvdTextRun) {
  if (!run.text) {
    return;
  }

  const style = normalizeNvdTextStyle(run.style);
  const previousRun = runs[runs.length - 1];

  if (previousRun && nvdTextStylesEqual(previousRun.style, style)) {
    previousRun.text += run.text;
    return;
  }

  runs.push({
    text: run.text,
    ...(style ? { style } : {}),
  });
}

export function splitNvdTextRunsIntoParagraphs(runs: NvdTextRun[]) {
  const paragraphs: NvdTextRun[][] = [[]];

  for (const run of normalizeNvdTextRuns(runs)) {
    const pieces = run.text.split("\n");

    pieces.forEach((piece, index) => {
      if (piece) {
        appendNvdTextRun(paragraphs[paragraphs.length - 1], {
          text: piece,
          style: run.style,
        });
      }

      if (index < pieces.length - 1) {
        paragraphs.push([]);
      }
    });
  }

  return paragraphs;
}

function matchExistingBlocksToParagraphs(existingBlocks: NvdBlock[], paragraphTexts: string[]) {
  const matches: (NvdBlock | undefined)[] = new Array(paragraphTexts.length);
  let prefixLength = 0;

  while (
    prefixLength < existingBlocks.length &&
    prefixLength < paragraphTexts.length &&
    existingBlocks[prefixLength].text === paragraphTexts[prefixLength]
  ) {
    matches[prefixLength] = existingBlocks[prefixLength];
    prefixLength += 1;
  }

  let existingSuffixIndex = existingBlocks.length - 1;
  let paragraphSuffixIndex = paragraphTexts.length - 1;

  while (
    existingSuffixIndex >= prefixLength &&
    paragraphSuffixIndex >= prefixLength &&
    existingBlocks[existingSuffixIndex].text === paragraphTexts[paragraphSuffixIndex]
  ) {
    matches[paragraphSuffixIndex] = existingBlocks[existingSuffixIndex];
    existingSuffixIndex -= 1;
    paragraphSuffixIndex -= 1;
  }

  const middleMatchCount = Math.min(
    existingSuffixIndex - prefixLength + 1,
    paragraphSuffixIndex - prefixLength + 1,
  );

  for (let index = 0; index < middleMatchCount; index += 1) {
    matches[prefixLength + index] = existingBlocks[prefixLength + index];
  }

  return matches;
}

function normalizeNvdTextStyle(style: NvdTextStyle | null | undefined) {
  const bold = style?.bold === true ? true : undefined;
  const characterSpacingPt = getNvdCharacterSpacingPt(style?.characterSpacingPt);
  const fontFamily = style?.fontFamily?.trim() ? getNvdFontFamily(style.fontFamily) : undefined;
  const fontSize = style?.fontSize?.trim() ? getNvdFontSizeCssValue(style.fontSize) : undefined;
  const italic = style?.italic === true ? true : undefined;

  if (!bold && characterSpacingPt === DEFAULT_NVD_CHARACTER_SPACING_PT && !fontFamily && !fontSize && !italic) {
    return undefined;
  }

  return {
    ...(bold ? { bold } : {}),
    ...(characterSpacingPt !== DEFAULT_NVD_CHARACTER_SPACING_PT ? { characterSpacingPt } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(italic ? { italic } : {}),
  } satisfies NvdTextStyle;
}

function nvdTextStylesEqual(left: NvdTextStyle | null | undefined, right: NvdTextStyle | null | undefined) {
  return (
    left?.bold === right?.bold &&
    left?.characterSpacingPt === right?.characterSpacingPt &&
    left?.fontFamily === right?.fontFamily &&
    left?.fontSize === right?.fontSize &&
    left?.italic === right?.italic
  );
}

function createTiptapBlock(paragraphRuns: NvdTextRun[], layout: NvdBlockLayout | undefined): JSONContent {
  const content = paragraphRuns.map((run) => createTiptapTextNode(run.text, run.style));
  const kind = getNvdStyleRole(layout?.kind);

  return {
    type: kind === "p" ? "paragraph" : "heading",
    attrs: {
      ...(kind !== "p" ? { level: Number(kind.slice(1)) } : {}),
      keepLinesTogether: layout?.keepLinesTogether,
      keepWithNext: layout?.keepWithNext,
      lineHeight: getNvdLineHeight(layout?.lineHeight),
      orphanLineCount: getNvdParagraphLineConstraint(layout?.orphanLineCount),
      spaceAfterPt: getNvdParagraphSpacingPt(layout?.spaceAfterPt),
      spaceBeforePt: getNvdParagraphSpacingPt(layout?.spaceBeforePt),
      textAlign: getNvdTextAlignment(layout?.textAlign),
      widowLineCount: getNvdParagraphLineConstraint(layout?.widowLineCount),
    },
    content: content.length > 0 ? content : undefined,
  };
}

function getTiptapBlockStyleRole(block: JSONContent): NvdStyleRole {
  if (block.type !== "heading") {
    return "p";
  }

  return getNvdStyleRole(`h${block.attrs?.level ?? 1}`);
}

function createTiptapTextNode(text: string, style: NvdTextStyle | null | undefined): JSONContent {
  const normalizedStyle = normalizeNvdTextStyle(style);
  const tiptapStyle =
    normalizedStyle?.characterSpacingPt || normalizedStyle?.fontFamily || normalizedStyle?.fontSize
    ? {
        ...(normalizedStyle.characterSpacingPt
          ? { characterSpacingPt: normalizedStyle.characterSpacingPt }
          : {}),
        ...(normalizedStyle.fontFamily
          ? { fontFamily: getNvdFontCssFamilyName(normalizedStyle.fontFamily) }
          : {}),
        ...(normalizedStyle.fontSize ? { fontSize: normalizedStyle.fontSize } : {}),
      }
    : undefined;
  const marks: JSONContent["marks"] = [
    ...(normalizedStyle?.bold ? [{ type: "bold" }] : []),
    ...(normalizedStyle?.italic ? [{ type: "italic" }] : []),
    ...(tiptapStyle
      ? [
          {
            type: "textStyle",
            attrs: tiptapStyle,
          },
        ]
      : []),
  ];

  return {
    type: "text",
    text,
    ...(marks.length > 0 ? { marks } : {}),
  };
}

function appendTiptapNodeRuns(runs: NvdTextRun[], node: JSONContent) {
  if (node.type === "text" && node.text) {
    const textStyle = node.marks?.find((mark) => mark.type === "textStyle")?.attrs;
    appendNvdTextRun(runs, {
      text: node.text,
      style: normalizeNvdTextStyle({
        bold: node.marks?.some((mark) => mark.type === "bold") || undefined,
        characterSpacingPt:
          typeof textStyle?.characterSpacingPt === "number"
            ? textStyle.characterSpacingPt
            : undefined,
        fontFamily: typeof textStyle?.fontFamily === "string" ? textStyle.fontFamily : undefined,
        fontSize: typeof textStyle?.fontSize === "string" ? textStyle.fontSize : undefined,
        italic: node.marks?.some((mark) => mark.type === "italic") || undefined,
      }),
    });
    return;
  }

  if (node.type === "hardBreak") {
    appendNvdTextRun(runs, { text: "\n" });
    return;
  }

  for (const child of node.content ?? []) {
    appendTiptapNodeRuns(runs, child);
  }
}

function getNvdTextOffsetForTiptapPosition(editor: Editor, requestedPosition: number) {
  const doc = editor.state.doc;
  const position = clampNumber(requestedPosition, 0, doc.content.size);
  let textOffset = 0;
  let blockPosition = 0;

  for (let index = 0; index < doc.childCount; index += 1) {
    const block = doc.child(index);
    const blockEndPosition = blockPosition + block.nodeSize;

    if (position <= blockEndPosition) {
      return textOffset + getProseMirrorBlockTextOffsetForPosition(block, blockPosition, position);
    }

    textOffset += getProseMirrorBlockTextLength(block);

    if (index < doc.childCount - 1) {
      textOffset += 1;
    }

    blockPosition = blockEndPosition;
  }

  return textOffset;
}

function getProseMirrorBlockTextLength(block: Editor["state"]["doc"]) {
  let textLength = 0;

  for (let index = 0; index < block.childCount; index += 1) {
    textLength += getProseMirrorChildTextLength(block.child(index));
  }

  return textLength;
}

function getProseMirrorBlockTextOffsetForPosition(
  block: Editor["state"]["doc"],
  blockPosition: number,
  requestedPosition: number,
) {
  return getInlineTextOffsetForPosition(block, blockPosition + 1, requestedPosition);
}

function getInlineTextOffsetForPosition(
  block: Editor["state"]["doc"],
  contentStartPosition: number,
  requestedPosition: number,
) {
  let textOffset = 0;
  let childPosition = contentStartPosition;

  for (let index = 0; index < block.childCount; index += 1) {
    const child = block.child(index);
    const childTextLength = getProseMirrorChildTextLength(child);
    const childEndPosition = childPosition + child.nodeSize;

    if (requestedPosition <= childEndPosition) {
      return textOffset + clampNumber(requestedPosition - childPosition, 0, childTextLength);
    }

    textOffset += childTextLength;
    childPosition = childEndPosition;
  }

  return textOffset;
}

function getProseMirrorChildTextLength(child: Editor["state"]["doc"]) {
  if (child.isText) {
    return child.text?.length ?? 0;
  }

  return child.type.name === "hardBreak" ? 1 : child.textContent.length;
}

function getNvdKeepLinesTogether(
  value: boolean | null | undefined,
  kind: NvdStyleRole,
) {
  return value === true ? true : kind.startsWith("h") ? true : false;
}

function getNvdKeepWithNext(
  value: boolean | null | undefined,
  kind: NvdStyleRole,
) {
  return value === true ? true : kind.startsWith("h") ? true : false;
}

function getNvdParagraphLineConstraint(value: number | string | null | undefined) {
  return Math.max(2, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 2);
}

function createNvdBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `block-${crypto.randomUUID()}`;
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
