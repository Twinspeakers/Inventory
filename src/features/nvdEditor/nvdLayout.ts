import type { NvdDocument, NvdLayoutMode, NvdTextRun } from "../inventoryProject";
import { getNvdFontCssStack } from "./fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "./nvdFontSize";
import { DEFAULT_NVD_LINE_HEIGHT, getNvdLineHeight } from "./nvdLineHeight";
import { getNvdParagraphSpacingPt } from "./nvdParagraphSpacing";
import { getNvdDocumentStyleDefinitions } from "./nvdStyles";
import {
  getNvdDocumentRuns,
  getNvdDocumentBlockLayouts,
  getNvdDocumentText,
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  normalizeNvdTextRuns,
  sliceNvdTextRuns,
  type NvdBlockLayout,
} from "./nvdRichText";

export const DEFAULT_NVD_LAYOUT_MODE: NvdLayoutMode = "pageless";
export const NVD_A4_PAGE_WIDTH_PX = 794;
export const NVD_A4_PAGE_HEIGHT_PX = 1123;
export const NVD_A4_PAGE_MARGIN_X_PX = 96;
export const NVD_A4_PAGE_MARGIN_Y_PX = 96;
export const NVD_A4_PAGE_GAP_PX = 20;
export const NVD_TEXT_LINE_HEIGHT = DEFAULT_NVD_LINE_HEIGHT;

const nvdA4PageBorderPx = 1;
const nvdA4ContentWidthPx = NVD_A4_PAGE_WIDTH_PX - NVD_A4_PAGE_MARGIN_X_PX * 2 - nvdA4PageBorderPx * 2;
export const NVD_A4_CONTENT_HEIGHT_PX =
  NVD_A4_PAGE_HEIGHT_PX - NVD_A4_PAGE_MARGIN_Y_PX * 2 - nvdA4PageBorderPx * 2;
let textMeasurementContext: CanvasRenderingContext2D | null | undefined;
const nvdPaginationCache = new Map<string, NvdTextPage[]>();
const NVD_PAGINATION_CACHE_SIZE = 8;

type PositionedNvdTextRun = {
  bold: boolean;
  characterSpacingPt: number;
  end: number;
  fontFamily: string;
  fontSizePt: number;
  italic: boolean;
  start: number;
  text: string;
};

type NvdVisualLine = {
  end: number;
  heightPx: number;
  start: number;
};

export type NvdTextPage = {
  contentHeightPx: number;
  end: number;
  index: number;
  paragraphIndexes: number[];
  runs: NvdTextRun[];
  start: number;
  text: string;
};

export type NvdPageBreak = {
  heightPx: number;
  offset: number;
};

export { getNvdDocumentText };

export function getNvdLayoutMode(layoutMode: NvdLayoutMode | string | null | undefined): NvdLayoutMode {
  return layoutMode === "a4" ? "a4" : DEFAULT_NVD_LAYOUT_MODE;
}

export function paginateNvdDocument(
  document: Pick<NvdDocument, "blocks" | "fontFamily" | "fontSize" | "styles">,
) {
  const paragraphStyle = getNvdDocumentStyleDefinitions(document.styles).p;

  return paginateNvdTextRuns(
    getNvdDocumentRuns(document),
    paragraphStyle.fontFamily,
    paragraphStyle.fontSizePt,
    getNvdDocumentBlockLayouts(document),
  );
}

export function paginateNvdText(
  text: string,
  fontFamily?: string | null,
  fontSize?: string | number | null,
): NvdTextPage[] {
  return paginateNvdTextRuns(text ? [{ text }] : [], fontFamily, fontSize);
}

export function paginateNvdTextRuns(
  runs: NvdTextRun[],
  defaultFontFamily?: string | null,
  defaultFontSize?: string | number | null,
  blockLayouts: readonly NvdBlockLayout[] = [],
): NvdTextPage[] {
  const normalizedRuns = normalizeNvdTextRuns(runs);
  const normalizedDefaultFontSizePt = getNvdFontSizePt(defaultFontSize);
  const cacheKey = JSON.stringify([
    defaultFontFamily ?? "",
    normalizedDefaultFontSizePt,
    normalizedRuns,
    blockLayouts,
  ]);
  const cachedPages = nvdPaginationCache.get(cacheKey);

  if (cachedPages) {
    nvdPaginationCache.delete(cacheKey);
    nvdPaginationCache.set(cacheKey, cachedPages);
    return cachedPages;
  }

  const text = getNvdTextRunsText(normalizedRuns);
  const positionedRuns = positionNvdTextRuns(
    normalizedRuns,
    defaultFontFamily ?? undefined,
    normalizedDefaultFontSizePt,
  );
  const visualLines = getVisualLines(
    text,
    positionedRuns,
    normalizedDefaultFontSizePt,
    blockLayouts,
  );

  const pages = createNvdTextPages(normalizedRuns, text, visualLines);
  nvdPaginationCache.set(cacheKey, pages);

  if (nvdPaginationCache.size > NVD_PAGINATION_CACHE_SIZE) {
    nvdPaginationCache.delete(nvdPaginationCache.keys().next().value as string);
  }

  return pages;
}

export function getNvdA4PageBreaks(pages: readonly NvdTextPage[]) {
  return pages.slice(0, -1).map((page) => ({
    heightPx:
      NVD_A4_CONTENT_HEIGHT_PX -
      page.contentHeightPx +
      NVD_A4_PAGE_MARGIN_Y_PX * 2 +
      NVD_A4_PAGE_GAP_PX,
    offset: page.end,
  })) satisfies NvdPageBreak[];
}

export function findNvdPageIndexForOffset(pages: NvdTextPage[], offset: number) {
  const clampedOffset = Math.max(0, offset);

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const isLastPage = index === pages.length - 1;

    if (clampedOffset < page.end || (isLastPage && clampedOffset <= page.end)) {
      return index;
    }
  }

  return Math.max(0, pages.length - 1);
}

function positionNvdTextRuns(
  runs: NvdTextRun[],
  defaultFontFamily: string | undefined,
  defaultFontSizePt: number,
) {
  const positionedRuns: PositionedNvdTextRun[] = [];
  let offset = 0;

  for (const run of runs) {
    const start = offset;
    const end = start + run.text.length;
    offset = end;
    positionedRuns.push({
      bold: isNvdTextRunBold(run),
      characterSpacingPt: getNvdTextRunCharacterSpacingPt(run),
      end,
      fontFamily: getNvdTextRunFontFamily(run, defaultFontFamily ?? ""),
      fontSizePt: getNvdTextRunFontSizePt(run, defaultFontSizePt),
      italic: isNvdTextRunItalic(run),
      start,
      text: run.text,
    });
  }

  return positionedRuns;
}

function getVisualLines(
  text: string,
  positionedRuns: PositionedNvdTextRun[],
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
) {
  if (!text) {
    return [
      {
        end: 0,
        heightPx:
          getLineHeightPx(defaultFontSizePt, blockLayouts[0]?.lineHeight) +
          getParagraphSpacingPx(blockLayouts[0]?.spaceBeforePt) +
          getParagraphSpacingPx(blockLayouts[0]?.spaceAfterPt),
        start: 0,
      },
    ];
  }

  const visualLines: NvdVisualLine[] = [];
  let position = 0;
  let paragraphIndex = 0;

  while (position < text.length) {
    const nextPosition = findVisualLineEnd(text, position, positionedRuns);
    const end = Math.max(nextPosition, position + 1);
    const isFirstParagraphLine = position === 0 || text[position - 1] === "\n";
    const isLastParagraphLine = end === text.length || text[end - 1] === "\n";
    const blockLayout = blockLayouts[paragraphIndex];
    visualLines.push({
      end,
      heightPx: measureTextRangeLineHeight(
        position,
        end,
        positionedRuns,
        defaultFontSizePt,
        blockLayout?.lineHeight,
      ) +
        (isFirstParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceBeforePt) : 0) +
        (isLastParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceAfterPt) : 0),
      start: position,
    });
    if (text.slice(position, end).endsWith("\n")) {
      paragraphIndex += 1;
    }
    position = end;
  }

  if (text.endsWith("\n")) {
    visualLines.push({
      end: text.length,
      heightPx:
        getLineHeightPx(defaultFontSizePt, blockLayouts[paragraphIndex]?.lineHeight) +
        getParagraphSpacingPx(blockLayouts[paragraphIndex]?.spaceBeforePt) +
        getParagraphSpacingPx(blockLayouts[paragraphIndex]?.spaceAfterPt),
      start: text.length,
    });
  }

  return visualLines;
}

function createNvdTextPages(normalizedRuns: NvdTextRun[], text: string, visualLines: NvdVisualLine[]) {
  const pages: NvdTextPage[] = [];
  let pageStartLineIndex = 0;
  let pageHeightPx = 0;

  for (let lineIndex = 0; lineIndex < visualLines.length; lineIndex += 1) {
    const line = visualLines[lineIndex];

    if (pageHeightPx > 0 && pageHeightPx + line.heightPx > NVD_A4_CONTENT_HEIGHT_PX) {
      pages.push(createNvdTextPage(normalizedRuns, text, visualLines, pageStartLineIndex, lineIndex, pages.length));
      pageStartLineIndex = lineIndex;
      pageHeightPx = 0;
    }

    pageHeightPx += line.heightPx;
  }

  pages.push(createNvdTextPage(normalizedRuns, text, visualLines, pageStartLineIndex, visualLines.length, pages.length));
  return pages;
}

function createNvdTextPage(
  normalizedRuns: NvdTextRun[],
  text: string,
  visualLines: NvdVisualLine[],
  startLineIndex: number,
  endLineIndex: number,
  index: number,
) {
  const start = visualLines[startLineIndex]?.start ?? text.length;
  const end = visualLines[Math.max(startLineIndex, endLineIndex - 1)]?.end ?? text.length;

  return {
    contentHeightPx: visualLines
      .slice(startLineIndex, endLineIndex)
      .reduce((heightPx, line) => heightPx + line.heightPx, 0),
    end,
    index,
    paragraphIndexes: getNvdParagraphIndexesForRange(text, start, end),
    runs: sliceNvdTextRuns(normalizedRuns, start, end),
    start,
    text: text.slice(start, end),
  };
}

function getNvdParagraphIndexesForRange(text: string, start: number, end: number) {
  const firstParagraphIndex = countLineBreaks(text.slice(0, start));
  const paragraphCount = countLineBreaks(text.slice(start, end)) + 1;

  return Array.from({ length: paragraphCount }, (_, index) => firstParagraphIndex + index);
}

function countLineBreaks(text: string) {
  return text.match(/\n/g)?.length ?? 0;
}

function findVisualLineEnd(text: string, start: number, positionedRuns: PositionedNvdTextRun[]) {
  const newlineIndex = text.indexOf("\n", start);
  const logicalLineEnd = newlineIndex === -1 ? text.length : newlineIndex;

  if (logicalLineEnd === start) {
    return Math.min(text.length, start + 1);
  }

  if (measureTextRangeWidth(start, logicalLineEnd, positionedRuns) <= nvdA4ContentWidthPx) {
    return newlineIndex === -1 ? logicalLineEnd : logicalLineEnd + 1;
  }

  let low = start + 1;
  let high = logicalLineEnd;
  let fittingEnd = low;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const width = measureTextRangeWidth(start, middle, positionedRuns);

    if (width <= nvdA4ContentWidthPx) {
      fittingEnd = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  for (let index = fittingEnd; index > start; index -= 1) {
    if (/\s/u.test(text[index - 1])) {
      return index;
    }
  }

  return fittingEnd;
}

function measureTextRangeWidth(start: number, end: number, positionedRuns: PositionedNvdTextRun[]) {
  let width = 0;

  for (const run of positionedRuns) {
    if (run.end <= start || run.start >= end) {
      continue;
    }

    const localStart = Math.max(0, start - run.start);
    const localEnd = Math.min(run.text.length, end - run.start);
    width += measureTextWidth(
      run.text.slice(localStart, localEnd),
      getNvdFontCssStack(run.fontFamily),
      run.fontSizePt,
      run.bold,
      run.characterSpacingPt,
      run.italic,
    );
  }

  return width;
}

function measureTextRangeLineHeight(
  start: number,
  end: number,
  positionedRuns: PositionedNvdTextRun[],
  defaultFontSizePt: number,
  lineHeight: number | undefined,
) {
  let maxFontSizePt = defaultFontSizePt;

  for (const run of positionedRuns) {
    if (run.end <= start || run.start >= end) {
      continue;
    }

    maxFontSizePt = Math.max(maxFontSizePt, run.fontSizePt);
  }

  return getLineHeightPx(maxFontSizePt, lineHeight);
}

function getLineHeightPx(fontSizePt: number, lineHeight: number | undefined) {
  return getNvdFontSizePx(fontSizePt) * getNvdLineHeight(lineHeight);
}

function getParagraphSpacingPx(spacingPt: number | undefined) {
  return getNvdParagraphSpacingPt(spacingPt) * (4 / 3);
}

function measureTextWidth(
  text: string,
  fontCssStack: string,
  fontSizePt: number,
  bold: boolean,
  characterSpacingPt: number,
  italic: boolean,
) {
  const context = getTextMeasurementContext();
  const measurableText = text.replace(/\t/g, "    ");
  const fontSizePx = getNvdFontSizePx(fontSizePt);
  const characterSpacingPx = characterSpacingPt * (4 / 3);
  const spacingWidth = Math.max(0, measurableText.length - 1) * characterSpacingPx;

  if (!context) {
    return Math.max(
      0,
      measurableText.length * (fontSizePx * (bold ? 0.55 : 0.52) * (italic ? 1.01 : 1)) +
        spacingWidth,
    );
  }

  context.font = `${italic ? "italic " : ""}${bold ? "700 " : ""}${fontSizePx}px ${fontCssStack}`;
  return Math.max(0, context.measureText(measurableText).width + spacingWidth);
}

function getTextMeasurementContext() {
  if (textMeasurementContext !== undefined) {
    return textMeasurementContext;
  }

  if (typeof document === "undefined") {
    textMeasurementContext = null;
    return textMeasurementContext;
  }

  textMeasurementContext = document.createElement("canvas").getContext("2d");
  return textMeasurementContext;
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
