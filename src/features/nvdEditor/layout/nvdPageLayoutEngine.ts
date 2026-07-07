import type { NvdDocument, NvdPageLayout, NvdTextRun } from "../../inventoryProject";
import { getNvdFontCssStack } from "../fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "../primitives/nvdFontSize";
import { getNvdLineHeight } from "../primitives/nvdLineHeight";
import { getNvdPageLayout, getNvdPageLayoutPx } from "./nvdPageLayout";
import { getNvdParagraphSpacingPt } from "../primitives/nvdParagraphSpacing";
import { getNvdDocumentStyleDefinitions } from "../core/nvdStyles";
import {
  getNvdDocumentBlockLayouts,
  getNvdDocumentRuns,
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  normalizeNvdTextRuns,
  sliceNvdTextRuns,
  type NvdBlockLayout,
} from "../core/nvdRichText";

let textMeasurementContext: CanvasRenderingContext2D | null | undefined;
const nvdLayoutCache = new Map<string, NvdDocumentLayoutSnapshot>();
const NVD_LAYOUT_CACHE_SIZE = 8;

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

export type NvdTextPage = {
  contentHeightPx: number;
  end: number;
  index: number;
  paragraphIndexes: number[];
  runs: NvdTextRun[];
  start: number;
  text: string;
};

export type NvdLineFragment = {
  end: number;
  heightPx: number;
  index: number;
  isFirstParagraphLine: boolean;
  isLastParagraphLine: boolean;
  pageIndex: number;
  paragraphIndex: number;
  start: number;
  topPx: number;
};

export type NvdParagraphFragment = {
  end: number;
  heightPx: number;
  kind: NvdBlockLayout["kind"];
  lineEndIndex: number;
  lineStartIndex: number;
  pageIndex: number;
  paragraphIndex: number;
  runs: NvdTextRun[];
  spaceAfterPt: number;
  spaceBeforePt: number;
  start: number;
  text: string;
  textAlign: NvdBlockLayout["textAlign"];
  topPx: number;
};

export type NvdPageFragment = NvdTextPage & {
  contentBottomPx: number;
  contentTopPx: number;
  lineEndIndex: number;
  lineStartIndex: number;
  lines: NvdLineFragment[];
  paragraphFragments: NvdParagraphFragment[];
};

export type NvdDocumentLayoutSnapshot = {
  blockLayouts: readonly NvdBlockLayout[];
  defaultFontFamily: string;
  defaultFontSizePt: number;
  pageLayout: NvdPageLayout;
  pages: NvdPageFragment[];
  runs: NvdTextRun[];
  text: string;
};

export type NvdCaretGeometry = {
  heightPx: number;
  leftPx: number;
  lineIndex: number;
  pageIndex: number;
  paragraphIndex: number;
  topPx: number;
};

export type NvdSelectionRect = {
  heightPx: number;
  leftPx: number;
  lineIndex: number;
  pageIndex: number;
  topPx: number;
  widthPx: number;
};

export function layoutNvdDocument(
  document: Pick<NvdDocument, "blocks" | "fontFamily" | "fontSize" | "styles" | "pageLayout">,
) {
  const paragraphStyle = getNvdDocumentStyleDefinitions(document.styles).p;

  return layoutNvdTextRuns(
    getNvdDocumentRuns(document),
    paragraphStyle.fontFamily,
    paragraphStyle.fontSizePt,
    getNvdDocumentBlockLayouts(document),
    document.pageLayout,
  );
}

export function layoutNvdText(
  text: string,
  defaultFontFamily?: string | null,
  defaultFontSize?: string | number | null,
) {
  return layoutNvdTextRuns(text ? [{ text }] : [], defaultFontFamily, defaultFontSize);
}

export function layoutNvdTextRuns(
  runs: NvdTextRun[],
  defaultFontFamily?: string | null,
  defaultFontSize?: string | number | null,
  blockLayouts: readonly NvdBlockLayout[] = [],
  pageLayout?: Partial<NvdPageLayout> | null,
) {
  const normalizedRuns = normalizeNvdTextRuns(runs);
  const normalizedDefaultFontSizePt = getNvdFontSizePt(defaultFontSize);
  const normalizedPageLayout = getNvdPageLayout(pageLayout);
  const normalizedDefaultFontFamily = defaultFontFamily ?? "";
  const cacheKey = JSON.stringify([
    normalizedDefaultFontFamily,
    normalizedDefaultFontSizePt,
    normalizedRuns,
    blockLayouts,
    normalizedPageLayout,
  ]);
  const cachedLayout = nvdLayoutCache.get(cacheKey);

  if (cachedLayout) {
    nvdLayoutCache.delete(cacheKey);
    nvdLayoutCache.set(cacheKey, cachedLayout);
    return cachedLayout;
  }

  const text = getNvdTextRunsText(normalizedRuns);
  const positionedRuns = positionNvdTextRuns(
    normalizedRuns,
    normalizedDefaultFontFamily || undefined,
    normalizedDefaultFontSizePt,
  );
  const lines = createLineFragments(
    text,
    positionedRuns,
    normalizedDefaultFontSizePt,
    blockLayouts,
    normalizedPageLayout,
  );
  const pages = createPageFragments(normalizedRuns, text, lines, blockLayouts, normalizedPageLayout);
  const layoutSnapshot = {
    blockLayouts,
    defaultFontFamily: normalizedDefaultFontFamily,
    defaultFontSizePt: normalizedDefaultFontSizePt,
    pageLayout: normalizedPageLayout,
    pages,
    runs: normalizedRuns,
    text,
  } satisfies NvdDocumentLayoutSnapshot;

  nvdLayoutCache.set(cacheKey, layoutSnapshot);

  if (nvdLayoutCache.size > NVD_LAYOUT_CACHE_SIZE) {
    nvdLayoutCache.delete(nvdLayoutCache.keys().next().value as string);
  }

  return layoutSnapshot;
}

export function findNvdPageFragmentForOffset(
  pages: readonly NvdPageFragment[],
  offset: number,
) {
  const clampedOffset = Math.max(0, offset);

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const isLastPage = index === pages.length - 1;

    if (clampedOffset < page.end || (isLastPage && clampedOffset <= page.end)) {
      return page;
    }
  }

  return pages[Math.max(0, pages.length - 1)] ?? null;
}

export function findNvdParagraphFragmentForOffset(
  page: NvdPageFragment | null | undefined,
  offset: number,
) {
  if (!page) {
    return null;
  }

  const clampedOffset = Math.max(page.start, offset);

  for (let index = 0; index < page.paragraphFragments.length; index += 1) {
    const fragment = page.paragraphFragments[index];
    const isLastFragment = index === page.paragraphFragments.length - 1;

    if (clampedOffset < fragment.end || (isLastFragment && clampedOffset <= fragment.end)) {
      return fragment;
    }
  }

  return page.paragraphFragments[page.paragraphFragments.length - 1] ?? null;
}

export function findNvdLineFragmentForOffset(
  page: NvdPageFragment | null | undefined,
  offset: number,
) {
  if (!page) {
    return null;
  }

  const clampedOffset = Math.max(page.start, offset);

  for (let index = 0; index < page.lines.length; index += 1) {
    const line = page.lines[index];
    const isLastLine = index === page.lines.length - 1;

    if (clampedOffset < line.end || (isLastLine && clampedOffset <= line.end)) {
      return line;
    }
  }

  return page.lines[page.lines.length - 1] ?? null;
}

export function getNvdCaretGeometry(
  layout: NvdDocumentLayoutSnapshot,
  offset: number,
) {
  const page = findNvdPageFragmentForOffset(layout.pages, offset);
  const line = findNvdLineFragmentForOffset(page, offset);

  if (!page) {
    return null;
  }

  if (!line) {
    const blockLayout = layout.blockLayouts[0] ?? getDefaultBlockLayout();

    return {
      heightPx: getLineHeightPx(layout.defaultFontSizePt, blockLayout.lineHeight),
      leftPx: 0,
      lineIndex: 0,
      pageIndex: page.index,
      paragraphIndex: 0,
      topPx: 0,
    } satisfies NvdCaretGeometry;
  }

  const clampedOffset = clampNumber(offset, line.start, line.end);
  const leftPx = measureTextRangeWidthForRuns(
    line.start,
    Math.min(clampedOffset, line.end),
    positionNvdTextRuns(layout.runs, layout.defaultFontFamily || undefined, layout.defaultFontSizePt),
  );

  return {
    heightPx: line.heightPx,
    leftPx,
    lineIndex: line.index,
    pageIndex: page.index,
    paragraphIndex: line.paragraphIndex,
    topPx: line.topPx,
  } satisfies NvdCaretGeometry;
}

export function getNvdSelectionGeometry(
  layout: NvdDocumentLayoutSnapshot,
  start: number,
  end: number,
) {
  const selectionStart = clampNumber(start, 0, layout.text.length);
  const selectionEnd = clampNumber(end, selectionStart, layout.text.length);

  if (selectionEnd <= selectionStart) {
    return [] satisfies NvdSelectionRect[];
  }

  const positionedRuns = positionNvdTextRuns(
    layout.runs,
    layout.defaultFontFamily || undefined,
    layout.defaultFontSizePt,
  );
  const rects: NvdSelectionRect[] = [];

  layout.pages.forEach((page) => {
    page.lines.forEach((line) => {
      if (selectionEnd <= line.start || selectionStart >= line.end) {
        return;
      }

      const lineSelectionStart = Math.max(selectionStart, line.start);
      const lineSelectionEnd = Math.min(selectionEnd, line.end);
      const leftPx = measureTextRangeWidthForRuns(line.start, lineSelectionStart, positionedRuns);
      const rightPx = measureTextRangeWidthForRuns(line.start, lineSelectionEnd, positionedRuns);

      if (rightPx <= leftPx) {
        return;
      }

      rects.push({
        heightPx: line.heightPx,
        leftPx,
        lineIndex: line.index,
        pageIndex: page.index,
        topPx: line.topPx,
        widthPx: rightPx - leftPx,
      });
    });
  });

  return rects;
}

export function getNvdOffsetAtPagePoint(
  layout: NvdDocumentLayoutSnapshot,
  pageIndex: number,
  leftPx: number,
  topPx: number,
) {
  const page = layout.pages[pageIndex];

  if (!page) {
    return 0;
  }

  const positionedRuns = positionNvdTextRuns(
    layout.runs,
    layout.defaultFontFamily || undefined,
    layout.defaultFontSizePt,
  );
  const clampedTopPx = Math.max(0, topPx);
  const targetLine =
    page.lines.find((line) => clampedTopPx < line.topPx + line.heightPx) ??
    page.lines[page.lines.length - 1];

  if (!targetLine) {
    return page.start;
  }

  const lineContentEnd =
    targetLine.end > targetLine.start && layout.text[targetLine.end - 1] === "\n"
      ? targetLine.end - 1
      : targetLine.end;

  if (leftPx <= 0) {
    return targetLine.start;
  }

  const totalLineWidthPx = measureTextRangeWidthForRuns(
    targetLine.start,
    lineContentEnd,
    positionedRuns,
  );

  if (leftPx >= totalLineWidthPx) {
    return lineContentEnd;
  }

  let low = targetLine.start;
  let high = lineContentEnd;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const widthPx = measureTextRangeWidthForRuns(targetLine.start, middle, positionedRuns);

    if (widthPx < leftPx) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const previousOffset = Math.max(targetLine.start, low - 1);
  const previousWidthPx = measureTextRangeWidthForRuns(targetLine.start, previousOffset, positionedRuns);
  const currentWidthPx = measureTextRangeWidthForRuns(targetLine.start, low, positionedRuns);

  return Math.abs(leftPx - previousWidthPx) <= Math.abs(currentWidthPx - leftPx)
    ? previousOffset
    : low;
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

function createLineFragments(
  text: string,
  positionedRuns: PositionedNvdTextRun[],
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);

  if (!text) {
    return [
      {
        end: 0,
        heightPx:
          getLineHeightPx(defaultFontSizePt, blockLayouts[0]?.lineHeight) +
          getParagraphSpacingPx(blockLayouts[0]?.spaceBeforePt) +
          getParagraphSpacingPx(blockLayouts[0]?.spaceAfterPt),
        index: 0,
        isFirstParagraphLine: true,
        isLastParagraphLine: true,
        pageIndex: 0,
        paragraphIndex: 0,
        start: 0,
        topPx: 0,
      },
    ] satisfies NvdLineFragment[];
  }

  const lineSeeds: Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">[] = [];
  let position = 0;
  let paragraphIndex = 0;

  while (position < text.length) {
    const nextPosition = findVisualLineEnd(text, position, positionedRuns, pageLayoutPx.contentWidthPx);
    const end = Math.max(nextPosition, position + 1);
    const isFirstParagraphLine = position === 0 || text[position - 1] === "\n";
    const isLastParagraphLine = end === text.length || text[end - 1] === "\n";
    const blockLayout = blockLayouts[paragraphIndex];
    lineSeeds.push({
      end,
      heightPx:
        measureTextRangeLineHeight(position, end, positionedRuns, defaultFontSizePt, blockLayout?.lineHeight) +
        (isFirstParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceBeforePt) : 0) +
        (isLastParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceAfterPt) : 0),
      isFirstParagraphLine,
      isLastParagraphLine,
      paragraphIndex,
      start: position,
    });
    if (text.slice(position, end).endsWith("\n")) {
      paragraphIndex += 1;
    }
    position = end;
  }

  if (text.endsWith("\n")) {
    lineSeeds.push({
      end: text.length,
      heightPx:
        getLineHeightPx(defaultFontSizePt, blockLayouts[paragraphIndex]?.lineHeight) +
        getParagraphSpacingPx(blockLayouts[paragraphIndex]?.spaceBeforePt) +
        getParagraphSpacingPx(blockLayouts[paragraphIndex]?.spaceAfterPt),
      isFirstParagraphLine: true,
      isLastParagraphLine: true,
      paragraphIndex,
      start: text.length,
    });
  }

  const lines: NvdLineFragment[] = [];
  let pageIndex = 0;
  let pageHeightPx = 0;
  let lineTopPx = 0;
  let currentPageLineStartIndex = 0;

  lineSeeds.forEach((line, index) => {
    if (pageHeightPx > 0 && pageHeightPx + line.heightPx > pageLayoutPx.contentHeightPx) {
      const movedKeptParagraph = moveKeptParagraphToNextPage(
        lines,
        lineSeeds,
        blockLayouts,
        currentPageLineStartIndex,
        pageIndex,
        index,
        pageLayoutPx.contentHeightPx,
      );
      const movedConstrainedParagraph = !movedKeptParagraph
        ? moveLineConstrainedParagraphToNextPage(
            lines,
            lineSeeds,
            blockLayouts,
            currentPageLineStartIndex,
            pageIndex,
            index,
            pageLayoutPx.contentHeightPx,
          )
        : null;
      const movedHeading = !movedKeptParagraph && !movedConstrainedParagraph && line.isFirstParagraphLine
        ? moveTrailingHeadingWithNextParagraph(
            lines,
            blockLayouts,
            currentPageLineStartIndex,
            pageIndex,
            pageLayoutPx.contentHeightPx,
            line.heightPx,
          )
        : null;

      const movedFragment = movedKeptParagraph ?? movedConstrainedParagraph ?? movedHeading;

      if (movedFragment) {
        pageIndex += 1;
        currentPageLineStartIndex = movedFragment.startLineIndex;
        pageHeightPx = movedFragment.pageHeightPx;
        lineTopPx = movedFragment.nextTopPx;
      } else {
        pageIndex += 1;
        pageHeightPx = 0;
        lineTopPx = 0;
        currentPageLineStartIndex = lines.length;
      }
    }

    lines.push({
      ...line,
      index,
      pageIndex,
      topPx: lineTopPx,
    });
    pageHeightPx += line.heightPx;
    lineTopPx += line.heightPx;
  });

  return lines;
}

function moveLineConstrainedParagraphToNextPage(
  lines: NvdLineFragment[],
  lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>,
  blockLayouts: readonly NvdBlockLayout[],
  currentPageLineStartIndex: number,
  currentPageIndex: number,
  currentSeedIndex: number,
  contentHeightPx: number,
) {
  const currentLine = lineSeeds[currentSeedIndex];
  const currentBlockLayout = blockLayouts[currentLine.paragraphIndex] ?? getDefaultBlockLayout();
  const orphanLineCount = currentBlockLayout.orphanLineCount;
  const widowLineCount = currentBlockLayout.widowLineCount;

  if (orphanLineCount <= 1 && widowLineCount <= 1) {
    return null;
  }

  let paragraphStartSeedIndex = currentSeedIndex;
  while (
    paragraphStartSeedIndex > 0 &&
    lineSeeds[paragraphStartSeedIndex - 1].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphStartSeedIndex -= 1;
  }

  if (paragraphStartSeedIndex === currentSeedIndex) {
    return null;
  }

  let paragraphEndSeedIndex = currentSeedIndex + 1;
  while (
    paragraphEndSeedIndex < lineSeeds.length &&
    lineSeeds[paragraphEndSeedIndex].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphEndSeedIndex += 1;
  }

  const linesAlreadyOnCurrentPage = currentSeedIndex - paragraphStartSeedIndex;
  const linesRemainingIncludingOverflow = paragraphEndSeedIndex - currentSeedIndex;
  const violatesOrphan = linesAlreadyOnCurrentPage < orphanLineCount;
  const violatesWidow = linesRemainingIncludingOverflow < widowLineCount;

  if (!violatesOrphan && !violatesWidow) {
    return null;
  }

  const paragraphHeightPx = lineSeeds
    .slice(paragraphStartSeedIndex, paragraphEndSeedIndex)
    .reduce((heightPx, line) => heightPx + line.heightPx, 0);

  if (paragraphHeightPx > contentHeightPx) {
    return null;
  }

  let paragraphStartLineIndex = lines.length - 1;
  while (
    paragraphStartLineIndex >= currentPageLineStartIndex &&
    lines[paragraphStartLineIndex].pageIndex === currentPageIndex &&
    lines[paragraphStartLineIndex].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphStartLineIndex -= 1;
  }
  paragraphStartLineIndex += 1;

  if (paragraphStartLineIndex >= lines.length) {
    return null;
  }

  const paragraphLines = lines.slice(paragraphStartLineIndex);
  let nextTopPx = 0;

  paragraphLines.forEach((line) => {
    line.pageIndex = currentPageIndex + 1;
    line.topPx = nextTopPx;
    nextTopPx += line.heightPx;
  });

  return {
    nextTopPx,
    pageHeightPx: paragraphLines.reduce((heightPx, line) => heightPx + line.heightPx, 0),
    startLineIndex: paragraphStartLineIndex,
  };
}

function moveKeptParagraphToNextPage(
  lines: NvdLineFragment[],
  lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>,
  blockLayouts: readonly NvdBlockLayout[],
  currentPageLineStartIndex: number,
  currentPageIndex: number,
  currentSeedIndex: number,
  contentHeightPx: number,
) {
  const currentLine = lineSeeds[currentSeedIndex];
  const currentBlockLayout = blockLayouts[currentLine.paragraphIndex] ?? getDefaultBlockLayout();

  if (!currentBlockLayout.keepLinesTogether) {
    return null;
  }

  let paragraphStartSeedIndex = currentSeedIndex;
  while (
    paragraphStartSeedIndex > 0 &&
    lineSeeds[paragraphStartSeedIndex - 1].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphStartSeedIndex -= 1;
  }

  if (paragraphStartSeedIndex === currentSeedIndex) {
    return null;
  }

  let paragraphEndSeedIndex = currentSeedIndex + 1;
  while (
    paragraphEndSeedIndex < lineSeeds.length &&
    lineSeeds[paragraphEndSeedIndex].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphEndSeedIndex += 1;
  }

  const paragraphHeightPx = lineSeeds
    .slice(paragraphStartSeedIndex, paragraphEndSeedIndex)
    .reduce((heightPx, line) => heightPx + line.heightPx, 0);

  if (paragraphHeightPx > contentHeightPx) {
    return null;
  }

  let paragraphStartLineIndex = lines.length - 1;
  while (
    paragraphStartLineIndex >= currentPageLineStartIndex &&
    lines[paragraphStartLineIndex].pageIndex === currentPageIndex &&
    lines[paragraphStartLineIndex].paragraphIndex === currentLine.paragraphIndex
  ) {
    paragraphStartLineIndex -= 1;
  }
  paragraphStartLineIndex += 1;

  if (paragraphStartLineIndex >= lines.length) {
    return null;
  }

  const keptLines = lines.slice(paragraphStartLineIndex);
  let nextTopPx = 0;

  keptLines.forEach((line) => {
    line.pageIndex = currentPageIndex + 1;
    line.topPx = nextTopPx;
    nextTopPx += line.heightPx;
  });

  return {
    nextTopPx,
    pageHeightPx: keptLines.reduce((heightPx, line) => heightPx + line.heightPx, 0),
    startLineIndex: paragraphStartLineIndex,
  };
}

function moveTrailingHeadingWithNextParagraph(
  lines: NvdLineFragment[],
  blockLayouts: readonly NvdBlockLayout[],
  currentPageLineStartIndex: number,
  currentPageIndex: number,
  contentHeightPx: number,
  nextParagraphFirstLineHeightPx: number,
) {
  if (lines.length <= currentPageLineStartIndex) {
    return null;
  }

  const lastLine = lines[lines.length - 1];

  if (lastLine.pageIndex !== currentPageIndex) {
    return null;
  }

  const trailingParagraphIndex = lastLine.paragraphIndex;
  const trailingBlockLayout = blockLayouts[trailingParagraphIndex] ?? getDefaultBlockLayout();

  if (!trailingBlockLayout.keepWithNext) {
    return null;
  }

  let headingStartLineIndex = lines.length - 1;

  while (
    headingStartLineIndex > currentPageLineStartIndex &&
    lines[headingStartLineIndex - 1].pageIndex === currentPageIndex &&
    lines[headingStartLineIndex - 1].paragraphIndex === trailingParagraphIndex
  ) {
    headingStartLineIndex -= 1;
  }

  const headingLines = lines.slice(headingStartLineIndex);
  const headingHeightPx = headingLines.reduce((heightPx, line) => heightPx + line.heightPx, 0);

  if (headingHeightPx + nextParagraphFirstLineHeightPx > contentHeightPx) {
    return null;
  }

  let nextTopPx = 0;

  headingLines.forEach((line) => {
    line.pageIndex = currentPageIndex + 1;
    line.topPx = nextTopPx;
    nextTopPx += line.heightPx;
  });

  return {
    nextTopPx,
    pageHeightPx: headingHeightPx,
    startLineIndex: headingStartLineIndex,
  };
}

function createPageFragments(
  normalizedRuns: NvdTextRun[],
  text: string,
  lines: NvdLineFragment[],
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
) {
  const pages: NvdPageFragment[] = [];
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  let pageStartLineIndex = 0;

  if (lines.length === 0) {
    pages.push(createEmptyPageFragment(text));
    return pages;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const isPageBoundary = !nextLine || nextLine.pageIndex !== line.pageIndex;

    if (!isPageBoundary) {
      continue;
    }

    pages.push(
      createPageFragment(
        normalizedRuns,
        text,
        lines,
        blockLayouts,
        pageStartLineIndex,
        index + 1,
        pages.length,
        pageLayoutPx.contentHeightPx,
      ),
    );
    pageStartLineIndex = index + 1;
  }

  return pages;
}

function createEmptyPageFragment(text: string): NvdPageFragment {
  return {
    contentBottomPx: 0,
    contentHeightPx: 0,
    contentTopPx: 0,
    end: text.length,
    index: 0,
    lineEndIndex: 0,
    lineStartIndex: 0,
    lines: [],
    paragraphFragments: [],
    paragraphIndexes: [0],
    runs: [],
    start: 0,
    text,
  };
}

function createPageFragment(
  normalizedRuns: NvdTextRun[],
  text: string,
  lines: NvdLineFragment[],
  blockLayouts: readonly NvdBlockLayout[],
  startLineIndex: number,
  endLineIndex: number,
  pageIndex: number,
  contentHeightPx: number,
) {
  const pageLines = lines.slice(startLineIndex, endLineIndex);
  const start = pageLines[0]?.start ?? text.length;
  const end = pageLines[pageLines.length - 1]?.end ?? text.length;
  const measuredContentHeightPx = pageLines.reduce((heightPx, line) => heightPx + line.heightPx, 0);

  return {
    contentBottomPx: measuredContentHeightPx,
    contentHeightPx: measuredContentHeightPx,
    contentTopPx: 0,
    end,
    index: pageIndex,
    lineEndIndex: endLineIndex,
    lineStartIndex: startLineIndex,
    lines: pageLines,
    paragraphFragments: createParagraphFragments(
      normalizedRuns,
      text,
      pageLines,
      blockLayouts,
      startLineIndex,
      pageIndex,
    ),
    paragraphIndexes: getNvdParagraphIndexesForRange(text, start, end),
    runs: sliceNvdTextRuns(normalizedRuns, start, end),
    start,
    text: text.slice(start, end),
  } satisfies NvdPageFragment;
}

function createParagraphFragments(
  normalizedRuns: NvdTextRun[],
  text: string,
  pageLines: NvdLineFragment[],
  blockLayouts: readonly NvdBlockLayout[],
  pageStartLineIndex: number,
  pageIndex: number,
) {
  const fragments: NvdParagraphFragment[] = [];
  let fragmentStart = 0;

  while (fragmentStart < pageLines.length) {
    const paragraphIndex = pageLines[fragmentStart].paragraphIndex;
    let fragmentEnd = fragmentStart + 1;

    while (
      fragmentEnd < pageLines.length &&
      pageLines[fragmentEnd].paragraphIndex === paragraphIndex
    ) {
      fragmentEnd += 1;
    }

    const fragmentLines = pageLines.slice(fragmentStart, fragmentEnd);
    const start = fragmentLines[0]?.start ?? text.length;
    const end = fragmentLines[fragmentLines.length - 1]?.end ?? text.length;
    const blockLayout = blockLayouts[paragraphIndex] ?? getDefaultBlockLayout();

    fragments.push({
      end,
      heightPx: fragmentLines.reduce((heightPx, line) => heightPx + line.heightPx, 0),
      kind: blockLayout.kind,
      lineEndIndex: pageStartLineIndex + fragmentEnd,
      lineStartIndex: pageStartLineIndex + fragmentStart,
      pageIndex,
      paragraphIndex,
      runs: sliceNvdTextRuns(normalizedRuns, start, end),
      spaceAfterPt: blockLayout.spaceAfterPt,
      spaceBeforePt: blockLayout.spaceBeforePt,
      start,
      text: text.slice(start, end),
      textAlign: blockLayout.textAlign,
      topPx: fragmentLines[0]?.topPx ?? 0,
    });

    fragmentStart = fragmentEnd;
  }

  return fragments;
}

function getNvdParagraphIndexesForRange(text: string, start: number, end: number) {
  const firstParagraphIndex = countLineBreaks(text.slice(0, start));
  const paragraphCount = countLineBreaks(text.slice(start, end)) + 1;

  return Array.from({ length: paragraphCount }, (_, index) => firstParagraphIndex + index);
}

function getDefaultBlockLayout(): NvdBlockLayout {
  return {
    kind: "p",
    keepLinesTogether: false,
    keepWithNext: false,
    lineHeight: 1,
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

function findVisualLineEnd(
  text: string,
  start: number,
  positionedRuns: PositionedNvdTextRun[],
  contentWidthPx: number,
) {
  const newlineIndex = text.indexOf("\n", start);
  const logicalLineEnd = newlineIndex === -1 ? text.length : newlineIndex;

  if (logicalLineEnd === start) {
    return Math.min(text.length, start + 1);
  }

  if (measureTextRangeWidth(start, logicalLineEnd, positionedRuns) <= contentWidthPx) {
    return newlineIndex === -1 ? logicalLineEnd : logicalLineEnd + 1;
  }

  let low = start + 1;
  let high = logicalLineEnd;
  let fittingEnd = low;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const width = measureTextRangeWidth(start, middle, positionedRuns);

    if (width <= contentWidthPx) {
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

function measureTextRangeWidthForRuns(
  start: number,
  end: number,
  positionedRuns: PositionedNvdTextRun[],
) {
  return measureTextRangeWidth(start, end, positionedRuns);
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
  const measurableText = text.replace(/\n/g, "").replace(/\t/g, "    ");
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
