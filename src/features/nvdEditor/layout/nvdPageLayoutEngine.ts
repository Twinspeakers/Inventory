import type {
  NvdBlock,
  NvdDocument,
  NvdPageLayout,
  NvdPageObject,
  NvdTextRun,
} from "../../inventoryProject";
import { getNvdFontCssStack } from "../fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "../primitives/nvdFontSize";
import { getNvdLineHeight } from "../primitives/nvdLineHeight";
import { getNvdPageLayout, getNvdPageLayoutPx } from "./nvdPageLayout";
import { getNvdParagraphSpacingPt } from "../primitives/nvdParagraphSpacing";
import {
  getNvdDocumentStyleDefinitions,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "../document/nvdStyles";
import {
  getNvdDocumentBlockLayouts,
  getNvdDocumentRuns,
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextBlock,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  normalizeNvdTextRuns,
  sliceNvdTextRuns,
  type NvdBlockLayout,
} from "../document/nvdRichText";
import { getNvdPageObjectBounds } from "../document/nvdPageObjectModel";

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

type NvdResolvedTextStyle = {
  bold: boolean;
  fontFamily: string;
  fontSizePt: number;
  italic: boolean;
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
  baselineOffsetPx: number;
  end: number;
  heightPx: number;
  index: number;
  isFirstParagraphLine: boolean;
  isLastParagraphLine: boolean;
  leftPx: number;
  pageIndex: number;
  paragraphIndex: number;
  start: number;
  textHeightPx: number;
  textTopOffsetPx: number;
  topPx: number;
  widthPx: number;
};

export type NvdParagraphFragment = {
  blockIndex: number;
  end: number;
  heightPx: number;
  kind: NvdBlockLayout["kind"];
  lineHeight: number;
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

export type NvdEmbedFragment = {
  alignment: "left" | "center" | "right";
  assetKind: string;
  assetName: string;
  assetPath: string;
  blockId: string;
  blockIndex: number;
  caption?: string;
  displayMode: "fit" | "actual" | "custom";
  heightPx: number;
  leftPx: number;
  mediaHeightPx: number;
  mediaWidthPx: number;
  pageIndex: number;
  sourceDocumentKind?: string;
  topPx: number;
  widthPx: number;
};

export type NvdPageFragment = NvdTextPage & {
  contentBottomPx: number;
  contentTopPx: number;
  embedFragments: NvdEmbedFragment[];
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
  pageObjects: readonly NvdPageObject[];
  pages: NvdPageFragment[];
  runs: NvdTextRun[];
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>;
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

export type NvdBlockSelectionGeometry = {
  blockId: string;
  heightPx: number;
  leftPx: number;
  pageIndex: number;
  topPx: number;
  widthPx: number;
};

export type NvdInsertionGeometry = {
  blockIndex: number;
  pageIndex: number;
  topPx: number;
  widthPx: number;
};

export function layoutNvdDocument(
  document: Pick<
    NvdDocument,
    "blocks" | "fontFamily" | "fontSize" | "styles" | "pageLayout" | "pageObjects"
  >,
) {
  const styleDefinitions = getNvdDocumentStyleDefinitions(document.styles);
  const paragraphStyle = styleDefinitions.p;
  const normalizedRuns = getNvdDocumentRuns(document);
  const blockLayouts = getNvdDocumentBlockLayouts(document);

  if (!document.blocks.some((block) => block.kind === "embed")) {
    return layoutNvdTextRuns(
      normalizedRuns,
      paragraphStyle.fontFamily,
      paragraphStyle.fontSizePt,
      blockLayouts,
      document.pageLayout,
      styleDefinitions,
      getNvdTextBlockIndexes(document.blocks),
      document.pageObjects ?? [],
    );
  }

  return layoutNvdMixedDocument(
    document.blocks,
    paragraphStyle.fontFamily,
    paragraphStyle.fontSizePt,
    normalizedRuns,
    blockLayouts,
    document.pageLayout,
    styleDefinitions,
    document.pageObjects ?? [],
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
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
  textBlockIndexes: readonly number[] = [],
  pageObjects: readonly NvdPageObject[] = [],
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
    styleDefinitions,
    textBlockIndexes,
    pageObjects,
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
    normalizedDefaultFontFamily,
    normalizedDefaultFontSizePt,
    blockLayouts,
    normalizedPageLayout,
    styleDefinitions,
    pageObjects,
  );
  const pages = createPageFragments(
    normalizedRuns,
    text,
    lines,
    blockLayouts,
    normalizedPageLayout,
    textBlockIndexes,
  );
  const layoutSnapshot = {
    blockLayouts,
    defaultFontFamily: normalizedDefaultFontFamily,
    defaultFontSizePt: normalizedDefaultFontSizePt,
    pageLayout: normalizedPageLayout,
    pageObjects,
    pages,
    runs: normalizedRuns,
    styleDefinitions,
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
    const fallbackStyle = getFallbackParagraphTextStyle(
      0,
      layout.blockLayouts,
      layout.defaultFontFamily,
      layout.defaultFontSizePt,
      layout.styleDefinitions,
    );
    const metrics = getTextStyleMetrics(
      fallbackStyle.fontFamily,
      fallbackStyle.fontSizePt,
      fallbackStyle.bold,
      fallbackStyle.italic,
    );
    const textHeightPx = metrics.ascentPx + metrics.descentPx;

    return {
      heightPx: textHeightPx,
      leftPx: 0,
      lineIndex: 0,
      pageIndex: page.index,
      paragraphIndex: 0,
      topPx: getLineTextTopPx(line, blockLayout, layout.defaultFontSizePt),
    } satisfies NvdCaretGeometry;
  }

  const clampedOffset = clampNumber(offset, line.start, line.end);
  const positionedRuns = positionNvdTextRuns(
    layout.runs,
    layout.defaultFontFamily || undefined,
    layout.defaultFontSizePt,
  );
  const leftPx = measureTextRangeWidthForRuns(
    line.start,
    Math.min(clampedOffset, line.end),
    positionedRuns,
  );
  const blockLayout = layout.blockLayouts[line.paragraphIndex] ?? getDefaultBlockLayout();
  const fallbackStyle = getFallbackParagraphTextStyle(
    line.paragraphIndex,
    layout.blockLayouts,
    layout.defaultFontFamily,
    layout.defaultFontSizePt,
    layout.styleDefinitions,
  );
  const caretStyle = resolveCaretTextStyleAtOffset(clampedOffset, line, positionedRuns, fallbackStyle);
  const caretMetrics = getTextStyleMetrics(
    caretStyle.fontFamily,
    caretStyle.fontSizePt,
    caretStyle.bold,
    caretStyle.italic,
  );
  const baselinePx = getLineBaselinePx(line, blockLayout, layout.defaultFontSizePt);
  const topPx = Math.max(getLineTextTopPx(line, blockLayout, layout.defaultFontSizePt), baselinePx - caretMetrics.ascentPx);

  return {
    heightPx: Math.max(1, caretMetrics.ascentPx + caretMetrics.descentPx),
    leftPx: line.leftPx + leftPx,
    lineIndex: line.index,
    pageIndex: page.index,
    paragraphIndex: line.paragraphIndex,
    topPx,
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
      const blockLayout = layout.blockLayouts[line.paragraphIndex] ?? getDefaultBlockLayout();

      if (rightPx <= leftPx) {
        return;
      }

      rects.push({
        heightPx: getLineTextHeightPx(line, blockLayout, layout.defaultFontSizePt),
        leftPx: line.leftPx + leftPx,
        lineIndex: line.index,
        pageIndex: page.index,
        topPx: getLineTextTopPx(line, blockLayout, layout.defaultFontSizePt),
        widthPx: rightPx - leftPx,
      });
    });
  });

  return rects;
}

export function getNvdBlockSelectionGeometry(
  layout: NvdDocumentLayoutSnapshot,
  blockId: string,
) {
  for (const page of layout.pages) {
    const embedFragment = page.embedFragments.find((fragment) => fragment.blockId === blockId);

    if (embedFragment) {
      return {
        blockId,
        heightPx: embedFragment.heightPx,
        leftPx: embedFragment.leftPx,
        pageIndex: embedFragment.pageIndex,
        topPx: embedFragment.topPx,
        widthPx: embedFragment.widthPx,
      } satisfies NvdBlockSelectionGeometry;
    }
  }

  return null;
}

export function getNvdInsertionGeometry(
  layout: NvdDocumentLayoutSnapshot,
  blockIndex: number,
) {
  const orderedFragments = getOrderedBlockFragments(layout);
  const pageLayoutPx = getNvdPageLayoutPx(layout.pageLayout);

  if (orderedFragments.length === 0) {
    return {
      blockIndex: Math.max(0, Math.floor(blockIndex)),
      pageIndex: 0,
      topPx: 0,
      widthPx: pageLayoutPx.contentWidthPx,
    } satisfies NvdInsertionGeometry;
  }

  const clampedBlockIndex = clampNumber(
    Math.floor(blockIndex),
    0,
    orderedFragments[orderedFragments.length - 1].blockIndex + 1,
  );
  const nextFragment = orderedFragments.find((fragment) => fragment.blockIndex >= clampedBlockIndex);

  if (nextFragment) {
    return {
      blockIndex: clampedBlockIndex,
      pageIndex: nextFragment.pageIndex,
      topPx: nextFragment.topPx,
      widthPx: pageLayoutPx.contentWidthPx,
    } satisfies NvdInsertionGeometry;
  }

  const lastFragment = orderedFragments[orderedFragments.length - 1];
  return {
    blockIndex: clampedBlockIndex,
    pageIndex: lastFragment.pageIndex,
    topPx: lastFragment.topPx + lastFragment.heightPx,
    widthPx: pageLayoutPx.contentWidthPx,
  } satisfies NvdInsertionGeometry;
}

export function getNvdInsertionIndexAtPagePoint(
  layout: NvdDocumentLayoutSnapshot,
  pageIndex: number,
  topPx: number,
) {
  const orderedFragments = getOrderedBlockFragments(layout);

  if (orderedFragments.length === 0) {
    return 0;
  }

  const pageFragments = orderedFragments.filter((fragment) => fragment.pageIndex === pageIndex);

  if (pageFragments.length === 0) {
    const previousFragment = [...orderedFragments]
      .reverse()
      .find((fragment) => fragment.pageIndex < pageIndex);

    if (previousFragment) {
      return previousFragment.blockIndex + 1;
    }

    return orderedFragments[0].blockIndex;
  }

  for (const fragment of pageFragments) {
    if (topPx < fragment.topPx + fragment.heightPx / 2) {
      return fragment.blockIndex;
    }
  }

  return pageFragments[pageFragments.length - 1].blockIndex + 1;
}

export function findNvdEmbedFragmentAtPagePoint(
  layout: NvdDocumentLayoutSnapshot,
  pageIndex: number,
  leftPx: number,
  topPx: number,
) {
  const page = layout.pages[pageIndex];

  if (!page) {
    return null;
  }

  return (
    page.embedFragments.find(
      (fragment) =>
        leftPx >= fragment.leftPx &&
        leftPx <= fragment.leftPx + fragment.widthPx &&
        topPx >= fragment.topPx &&
        topPx <= fragment.topPx + fragment.heightPx,
    ) ?? null
  );
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
  const localLeftPx = leftPx - targetLine.leftPx;

  if (localLeftPx <= 0) {
    return targetLine.start;
  }

  const totalLineWidthPx = measureTextRangeWidthForRuns(
    targetLine.start,
    lineContentEnd,
    positionedRuns,
  );

  if (localLeftPx >= totalLineWidthPx) {
    return lineContentEnd;
  }

  let low = targetLine.start;
  let high = lineContentEnd;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const widthPx = measureTextRangeWidthForRuns(targetLine.start, middle, positionedRuns);

    if (widthPx < localLeftPx) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const previousOffset = Math.max(targetLine.start, low - 1);
  const previousWidthPx = measureTextRangeWidthForRuns(targetLine.start, previousOffset, positionedRuns);
  const currentWidthPx = measureTextRangeWidthForRuns(targetLine.start, low, positionedRuns);

  return Math.abs(localLeftPx - previousWidthPx) <= Math.abs(currentWidthPx - localLeftPx)
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

type NvdEmbedLayoutSeed = Omit<NvdEmbedFragment, "pageIndex" | "topPx"> & {
  anchorOffset: number;
};

type NvdMixedTextBlockSeed = {
  anchorOffset: number;
  blockIndex: number;
  blockLayout: NvdBlockLayout;
  firstUnitHeightPx: number;
  kind: "text";
  lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>;
  textBlockIndex: number;
  totalHeightPx: number;
};

type NvdMixedEmbedBlockSeed = {
  anchorOffset: number;
  blockIndex: number;
  firstUnitHeightPx: number;
  kind: "embed";
  seed: NvdEmbedLayoutSeed;
  totalHeightPx: number;
};

type NvdMixedBlockSeed = NvdMixedTextBlockSeed | NvdMixedEmbedBlockSeed;

type NvdPagePlacementCursor = {
  nextLineIndex: number;
  pageHeightPx: number;
  pageIndex: number;
  topPx: number;
};

function layoutNvdMixedDocument(
  blocks: readonly NvdBlock[],
  defaultFontFamily: string | null | undefined,
  defaultFontSize: string | number | null | undefined,
  runs: NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout?: Partial<NvdPageLayout> | null,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
  pageObjects: readonly NvdPageObject[] = [],
) {
  const normalizedRuns = normalizeNvdTextRuns(runs);
  const normalizedDefaultFontSizePt = getNvdFontSizePt(defaultFontSize);
  const normalizedPageLayout = getNvdPageLayout(pageLayout);
  const normalizedDefaultFontFamily = defaultFontFamily ?? "";
  const cacheKey = JSON.stringify([
    "mixed",
    normalizedDefaultFontFamily,
    normalizedDefaultFontSizePt,
    blocks,
    blockLayouts,
    normalizedPageLayout,
    styleDefinitions,
  ]);
  const cachedLayout = nvdLayoutCache.get(cacheKey);

  if (cachedLayout) {
    nvdLayoutCache.delete(cacheKey);
    nvdLayoutCache.set(cacheKey, cachedLayout);
    return cachedLayout;
  }

  const text = getNvdTextRunsText(normalizedRuns);
  const { embedFragments, lines, pageAnchorOffsets } = createMixedBlockFragments(
    blocks,
    normalizedDefaultFontFamily,
    normalizedDefaultFontSizePt,
    blockLayouts,
    normalizedPageLayout,
    styleDefinitions,
  );
  const pages = createMixedPageFragments(
    normalizedRuns,
    text,
    lines,
    embedFragments,
    blockLayouts,
    normalizedPageLayout,
    pageAnchorOffsets,
    getNvdTextBlockIndexes(blocks),
  );
  const layoutSnapshot = {
    blockLayouts,
    defaultFontFamily: normalizedDefaultFontFamily,
    defaultFontSizePt: normalizedDefaultFontSizePt,
    pageLayout: normalizedPageLayout,
    pageObjects,
    pages,
    runs: normalizedRuns,
    styleDefinitions,
    text,
  } satisfies NvdDocumentLayoutSnapshot;

  nvdLayoutCache.set(cacheKey, layoutSnapshot);

  if (nvdLayoutCache.size > NVD_LAYOUT_CACHE_SIZE) {
    nvdLayoutCache.delete(nvdLayoutCache.keys().next().value as string);
  }

  return layoutSnapshot;
}

function createMixedBlockFragments(
  blocks: readonly NvdBlock[],
  defaultFontFamily: string,
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const blockSeeds = createMixedBlockSeeds(
    blocks,
    defaultFontFamily,
    defaultFontSizePt,
    blockLayouts,
    pageLayout,
    styleDefinitions,
  );
  const embedFragments: NvdEmbedFragment[] = [];
  const lines: NvdLineFragment[] = [];
  const pageAnchorOffsets = new Map<number, number>();
  let cursor: NvdPagePlacementCursor = {
    nextLineIndex: 0,
    pageHeightPx: 0,
    pageIndex: 0,
    topPx: 0,
  };

  pageAnchorOffsets.set(0, 0);

  blockSeeds.forEach((blockSeed, blockSeedIndex) => {
    const nextMinHeightPx =
      blockSeed.kind === "text" &&
      blockLayouts[blockSeed.textBlockIndex]?.keepWithNext
        ? blockSeeds[blockSeedIndex + 1]?.firstUnitHeightPx ?? 0
        : 0;

    if (blockSeed.kind === "text") {
      cursor = placeMixedTextBlockOnPages(
        blockSeed,
        cursor,
        lines,
        pageAnchorOffsets,
        pageLayoutPx.contentHeightPx,
        nextMinHeightPx,
      );
      return;
    }

    cursor = placeMixedEmbedBlockOnPages(
      blockSeed,
      cursor,
      embedFragments,
      pageAnchorOffsets,
      pageLayoutPx.contentHeightPx,
    );
  });

  return {
    embedFragments,
    lines,
    pageAnchorOffsets,
  };
}

function createMixedBlockSeeds(
  blocks: readonly NvdBlock[],
  defaultFontFamily: string,
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
) {
  const textBlockCount = blocks.filter((block) => block.kind !== "embed").length;
  const blockSeeds: NvdMixedBlockSeed[] = [];
  let textBlockIndex = 0;
  let textOffset = 0;

  blocks.forEach((block, blockIndex) => {
    if (!isNvdTextBlock(block)) {
      const seed = createEmbedLayoutSeed(
        block,
        blockIndex,
        textOffset,
        defaultFontFamily,
        defaultFontSizePt,
        pageLayout,
      );

      blockSeeds.push({
        anchorOffset: textOffset,
        blockIndex,
        firstUnitHeightPx: seed.heightPx,
        kind: "embed",
        seed,
        totalHeightPx: seed.heightPx,
      });
      return;
    }

    const blockLayout = blockLayouts[textBlockIndex] ?? getDefaultBlockLayout();
    const hasTrailingParagraphBreak = textBlockIndex < textBlockCount - 1;
    const lineSeeds = createLineSeedsForMixedTextBlock(
      block.text,
      hasTrailingParagraphBreak,
      textOffset,
      textBlockIndex,
      blockLayout,
      defaultFontFamily,
      defaultFontSizePt,
      pageLayout,
      styleDefinitions,
    );

    blockSeeds.push({
      anchorOffset: textOffset,
      blockIndex,
      blockLayout,
      firstUnitHeightPx: lineSeeds[0]?.heightPx ?? 0,
      kind: "text",
      lineSeeds,
      textBlockIndex,
      totalHeightPx: lineSeeds.reduce((heightPx, line) => heightPx + line.heightPx, 0),
    });

    textOffset += block.text.length + (hasTrailingParagraphBreak ? 1 : 0);
    textBlockIndex += 1;
  });

  return blockSeeds;
}

function createLineSeedsForMixedTextBlock(
  blockText: string,
  hasTrailingParagraphBreak: boolean,
  startOffset: number,
  textBlockIndex: number,
  blockLayout: NvdBlockLayout,
  defaultFontFamily: string,
  defaultFontSizePt: number,
  pageLayout: NvdPageLayout,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
) {
  const text = `${blockText}${hasTrailingParagraphBreak ? "\n" : ""}`;
  const positionedRuns = positionNvdTextRuns(
    text ? [{ text }] : [],
    defaultFontFamily || undefined,
    defaultFontSizePt,
  );
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const fallbackStyle = getFallbackParagraphTextStyle(
    0,
    [blockLayout],
    defaultFontFamily,
    defaultFontSizePt,
    styleDefinitions,
  );

  if (!text) {
    const lineMetrics = measureTextRangeLineMetrics(
      0,
      0,
      positionedRuns,
      fallbackStyle,
      blockLayout.lineHeight,
    );

    return [
      {
        baselineOffsetPx: getParagraphSpacingPx(blockLayout.spaceBeforePt) + lineMetrics.baselineOffsetPx,
        end: startOffset,
        heightPx:
          lineMetrics.lineHeightPx +
          getParagraphSpacingPx(blockLayout.spaceBeforePt) +
          getParagraphSpacingPx(blockLayout.spaceAfterPt),
        isFirstParagraphLine: true,
        isLastParagraphLine: true,
        leftPx: 0,
        paragraphIndex: textBlockIndex,
        start: startOffset,
        textHeightPx: lineMetrics.textHeightPx,
        textTopOffsetPx: getParagraphSpacingPx(blockLayout.spaceBeforePt) + lineMetrics.textTopOffsetPx,
        widthPx: pageLayoutPx.contentWidthPx,
      },
    ] satisfies Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>;
  }

  const lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">> = [];
  let localPosition = 0;

  while (localPosition < text.length) {
    const nextPosition = findVisualLineEnd(
      text,
      localPosition,
      positionedRuns,
      pageLayoutPx.contentWidthPx,
    );
    const localEnd = Math.max(nextPosition, localPosition + 1);
    const isFirstParagraphLine = localPosition === 0;
    const isLastParagraphLine = localEnd === text.length;
    const beforeSpacePx = isFirstParagraphLine ? getParagraphSpacingPx(blockLayout.spaceBeforePt) : 0;
    const afterSpacePx = isLastParagraphLine ? getParagraphSpacingPx(blockLayout.spaceAfterPt) : 0;
    const lineMetrics = measureTextRangeLineMetrics(
      localPosition,
      localEnd,
      positionedRuns,
      fallbackStyle,
      blockLayout.lineHeight,
    );

    lineSeeds.push({
      baselineOffsetPx: beforeSpacePx + lineMetrics.baselineOffsetPx,
      end: startOffset + localEnd,
      heightPx: lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx,
      isFirstParagraphLine,
      isLastParagraphLine,
      leftPx: 0,
      paragraphIndex: textBlockIndex,
      start: startOffset + localPosition,
      textHeightPx: lineMetrics.textHeightPx,
      textTopOffsetPx: beforeSpacePx + lineMetrics.textTopOffsetPx,
      widthPx: pageLayoutPx.contentWidthPx,
    });

    localPosition = localEnd;
  }

  return lineSeeds;
}

function createEmbedLayoutSeed(
  block: Extract<NvdBlock, { kind: "embed" }>,
  blockIndex: number,
  anchorOffset: number,
  defaultFontFamily: string,
  defaultFontSizePt: number,
  pageLayout: NvdPageLayout,
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const embed = block.embed;
  const widthPx = resolveEmbedWidthPx(embed.widthPx, embed.displayMode, pageLayoutPx.contentWidthPx);
  const captionHeightPx = embed.caption
    ? measureEmbedCaptionHeightPx(embed.caption, widthPx, defaultFontFamily, Math.max(10, defaultFontSizePt - 1))
    : 0;
  const captionGapPx = embed.caption ? 8 : 0;
  const maxMediaHeightPx = Math.max(80, pageLayoutPx.contentHeightPx - captionHeightPx - captionGapPx);
  const requestedHeightPx =
    embed.heightPx ??
    Math.min(
      maxMediaHeightPx,
      Math.max(168, widthPx * (embed.displayMode === "actual" ? 0.7 : 0.62)),
    );
  const mediaHeightPx = clampNumber(requestedHeightPx, 80, maxMediaHeightPx);
  const heightPx = mediaHeightPx + captionGapPx + captionHeightPx;

  return {
    alignment: embed.alignment ?? "center",
    anchorOffset,
    assetKind: embed.assetKind,
    assetName: embed.assetName,
    assetPath: embed.assetPath,
    blockId: block.id,
    blockIndex,
    ...(embed.caption ? { caption: embed.caption } : {}),
    displayMode: embed.displayMode ?? "fit",
    heightPx,
    leftPx: resolveEmbedLeftPx(embed.alignment, pageLayoutPx.contentWidthPx, widthPx),
    mediaHeightPx,
    mediaWidthPx: widthPx,
    ...(embed.sourceDocumentKind ? { sourceDocumentKind: embed.sourceDocumentKind } : {}),
    widthPx,
  } satisfies NvdEmbedLayoutSeed;
}

function placeMixedTextBlockOnPages(
  blockSeed: NvdMixedTextBlockSeed,
  initialCursor: NvdPagePlacementCursor,
  lines: NvdLineFragment[],
  pageAnchorOffsets: Map<number, number>,
  contentHeightPx: number,
  nextMinHeightPx: number,
) {
  const orphanLineCount = Math.max(1, blockSeed.blockLayout.orphanLineCount);
  const widowLineCount = Math.max(1, blockSeed.blockLayout.widowLineCount);
  const lineSeeds = blockSeed.lineSeeds;

  if (lineSeeds.length === 0) {
    return initialCursor;
  }

  let cursor = initialCursor;
  let seedIndex = 0;
  const paragraphAnchorOffset = blockSeed.anchorOffset;
  const canMoveWholeBlockToNextPage = blockSeed.totalHeightPx <= contentHeightPx;

  ensurePageAnchorOffset(pageAnchorOffsets, cursor.pageIndex, paragraphAnchorOffset);

  if (
    cursor.pageHeightPx > 0 &&
    canMoveWholeBlockToNextPage &&
    ((blockSeed.blockLayout.keepLinesTogether &&
      cursor.pageHeightPx + blockSeed.totalHeightPx > contentHeightPx) ||
      (nextMinHeightPx > 0 &&
        blockSeed.totalHeightPx + nextMinHeightPx <= contentHeightPx &&
        cursor.pageHeightPx + blockSeed.totalHeightPx + nextMinHeightPx > contentHeightPx))
  ) {
    cursor = advanceMixedLayoutPage(cursor, paragraphAnchorOffset, pageAnchorOffsets);
  }

  while (seedIndex < lineSeeds.length) {
    ensurePageAnchorOffset(pageAnchorOffsets, cursor.pageIndex, lineSeeds[seedIndex].start);

    const remainingLineSeeds = lineSeeds.slice(seedIndex);
    const availableHeightPx = Math.max(0, contentHeightPx - cursor.pageHeightPx);
    let fitCount = countFittingLineSeeds(remainingLineSeeds, availableHeightPx);

    if (fitCount === 0 && cursor.pageHeightPx > 0) {
      cursor = advanceMixedLayoutPage(cursor, remainingLineSeeds[0].start, pageAnchorOffsets);
      continue;
    }

    if (fitCount === 0) {
      fitCount = 1;
    }

    if (fitCount < remainingLineSeeds.length) {
      const fullPageFitCount = countFittingLineSeeds(remainingLineSeeds, contentHeightPx);
      const linesRemainingAfterSplit = remainingLineSeeds.length - fitCount;

      if (
        cursor.pageHeightPx > 0 &&
        fitCount < orphanLineCount &&
        fullPageFitCount > fitCount
      ) {
        cursor = advanceMixedLayoutPage(cursor, remainingLineSeeds[0].start, pageAnchorOffsets);
        continue;
      }

      if (linesRemainingAfterSplit < widowLineCount) {
        const adjustedFitCount = remainingLineSeeds.length - widowLineCount;

        if (
          adjustedFitCount > 0 &&
          adjustedFitCount >= orphanLineCount &&
          measureLineSeedHeights(remainingLineSeeds, adjustedFitCount) <= availableHeightPx
        ) {
          fitCount = adjustedFitCount;
        } else if (cursor.pageHeightPx > 0 && fullPageFitCount > fitCount) {
          cursor = advanceMixedLayoutPage(cursor, remainingLineSeeds[0].start, pageAnchorOffsets);
          continue;
        }
      }
    }

    const placeCount = Math.min(remainingLineSeeds.length, Math.max(1, fitCount));

    for (let index = 0; index < placeCount; index += 1) {
      const lineSeed = remainingLineSeeds[index];
      lines.push({
        ...lineSeed,
        index: cursor.nextLineIndex,
        pageIndex: cursor.pageIndex,
        topPx: cursor.topPx,
      });
      cursor = {
        nextLineIndex: cursor.nextLineIndex + 1,
        pageHeightPx: cursor.pageHeightPx + lineSeed.heightPx,
        pageIndex: cursor.pageIndex,
        topPx: cursor.topPx + lineSeed.heightPx,
      };
    }

    seedIndex += placeCount;

    if (seedIndex < lineSeeds.length) {
      cursor = advanceMixedLayoutPage(cursor, lineSeeds[seedIndex].start, pageAnchorOffsets);
    }
  }

  return cursor;
}

function placeMixedEmbedBlockOnPages(
  blockSeed: NvdMixedEmbedBlockSeed,
  initialCursor: NvdPagePlacementCursor,
  embedFragments: NvdEmbedFragment[],
  pageAnchorOffsets: Map<number, number>,
  contentHeightPx: number,
) {
  let cursor = initialCursor;

  ensurePageAnchorOffset(pageAnchorOffsets, cursor.pageIndex, blockSeed.anchorOffset);

  if (
    cursor.pageHeightPx > 0 &&
    cursor.pageHeightPx + blockSeed.seed.heightPx > contentHeightPx
  ) {
    cursor = advanceMixedLayoutPage(cursor, blockSeed.anchorOffset, pageAnchorOffsets);
  }

  ensurePageAnchorOffset(pageAnchorOffsets, cursor.pageIndex, blockSeed.anchorOffset);

  embedFragments.push({
    ...blockSeed.seed,
    pageIndex: cursor.pageIndex,
    topPx: cursor.topPx,
  });

  return {
    ...cursor,
    pageHeightPx: cursor.pageHeightPx + blockSeed.seed.heightPx,
    topPx: cursor.topPx + blockSeed.seed.heightPx,
  };
}

function advanceMixedLayoutPage(
  cursor: NvdPagePlacementCursor,
  anchorOffset: number,
  pageAnchorOffsets: Map<number, number>,
) {
  const nextCursor = {
    ...cursor,
    pageHeightPx: 0,
    pageIndex: cursor.pageIndex + 1,
    topPx: 0,
  } satisfies NvdPagePlacementCursor;

  ensurePageAnchorOffset(pageAnchorOffsets, nextCursor.pageIndex, anchorOffset);
  return nextCursor;
}

function ensurePageAnchorOffset(
  pageAnchorOffsets: Map<number, number>,
  pageIndex: number,
  anchorOffset: number,
) {
  if (!pageAnchorOffsets.has(pageIndex)) {
    pageAnchorOffsets.set(pageIndex, anchorOffset);
  }
}

function countFittingLineSeeds(
  lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>,
  availableHeightPx: number,
) {
  let heightPx = 0;
  let count = 0;

  for (const lineSeed of lineSeeds) {
    if (count > 0 && heightPx + lineSeed.heightPx > availableHeightPx) {
      break;
    }

    if (count === 0 && lineSeed.heightPx > availableHeightPx && availableHeightPx > 0) {
      return 0;
    }

    heightPx += lineSeed.heightPx;
    count += 1;
  }

  return count;
}

function measureLineSeedHeights(
  lineSeeds: Array<Omit<NvdLineFragment, "index" | "pageIndex" | "topPx">>,
  count: number,
) {
  return lineSeeds.slice(0, count).reduce((heightPx, lineSeed) => heightPx + lineSeed.heightPx, 0);
}

type NvdWrapExclusion = {
  bottomPx: number;
  leftPx: number;
  pageIndex: number;
  rightPx: number;
  topPx: number;
};

type NvdWrappedLineBox = {
  leftPx: number;
  pageIndex: number;
  topPx: number;
  widthPx: number;
};

function createLineFragments(
  text: string,
  positionedRuns: PositionedNvdTextRun[],
  defaultFontFamily: string,
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
  pageObjects: readonly NvdPageObject[] = [],
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const wrapExclusions = getWrappedPageObjectExclusions(pageObjects, pageLayoutPx);

  if (!text) {
    const fallbackStyle = getFallbackParagraphTextStyle(
      0,
      blockLayouts,
      defaultFontFamily,
      defaultFontSizePt,
      styleDefinitions,
    );
    const lineMetrics = measureTextRangeLineMetrics(
      0,
      0,
      positionedRuns,
      fallbackStyle,
      blockLayouts[0]?.lineHeight,
    );
    return [
      {
        baselineOffsetPx:
          getParagraphSpacingPx(blockLayouts[0]?.spaceBeforePt) + lineMetrics.baselineOffsetPx,
        end: 0,
        heightPx:
          lineMetrics.lineHeightPx +
          getParagraphSpacingPx(blockLayouts[0]?.spaceBeforePt) +
          getParagraphSpacingPx(blockLayouts[0]?.spaceAfterPt),
        index: 0,
        isFirstParagraphLine: true,
        isLastParagraphLine: true,
        leftPx: 0,
        pageIndex: 0,
        paragraphIndex: 0,
        start: 0,
        textHeightPx: lineMetrics.textHeightPx,
        textTopOffsetPx:
          getParagraphSpacingPx(blockLayouts[0]?.spaceBeforePt) + lineMetrics.textTopOffsetPx,
        topPx: 0,
        widthPx: pageLayoutPx.contentWidthPx,
      },
    ] satisfies NvdLineFragment[];
  }

  if (wrapExclusions.length > 0) {
    return createWrappedLineFragments(
      text,
      positionedRuns,
      defaultFontFamily,
      defaultFontSizePt,
      blockLayouts,
      pageLayout,
      styleDefinitions,
      wrapExclusions,
    );
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
    const beforeSpacePx = isFirstParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceBeforePt) : 0;
    const afterSpacePx = isLastParagraphLine ? getParagraphSpacingPx(blockLayout?.spaceAfterPt) : 0;
    const fallbackStyle = getFallbackParagraphTextStyle(
      paragraphIndex,
      blockLayouts,
      defaultFontFamily,
      defaultFontSizePt,
      styleDefinitions,
    );
    const lineMetrics = measureTextRangeLineMetrics(
      position,
      end,
      positionedRuns,
      fallbackStyle,
      blockLayout?.lineHeight,
    );
    lineSeeds.push({
      baselineOffsetPx: beforeSpacePx + lineMetrics.baselineOffsetPx,
      end,
      heightPx: lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx,
      isFirstParagraphLine,
      isLastParagraphLine,
      leftPx: 0,
      paragraphIndex,
      start: position,
      textHeightPx: lineMetrics.textHeightPx,
      textTopOffsetPx: beforeSpacePx + lineMetrics.textTopOffsetPx,
      widthPx: pageLayoutPx.contentWidthPx,
    });
    if (text.slice(position, end).endsWith("\n")) {
      paragraphIndex += 1;
    }
    position = end;
  }

  if (text.endsWith("\n")) {
    const blockLayout = blockLayouts[paragraphIndex];
    const beforeSpacePx = getParagraphSpacingPx(blockLayout?.spaceBeforePt);
    const afterSpacePx = getParagraphSpacingPx(blockLayout?.spaceAfterPt);
    const fallbackStyle = getFallbackParagraphTextStyle(
      paragraphIndex,
      blockLayouts,
      defaultFontFamily,
      defaultFontSizePt,
      styleDefinitions,
    );
    const lineMetrics = measureTextRangeLineMetrics(
      text.length,
      text.length,
      positionedRuns,
      fallbackStyle,
      blockLayout?.lineHeight,
    );
    lineSeeds.push({
      baselineOffsetPx: beforeSpacePx + lineMetrics.baselineOffsetPx,
      end: text.length,
      heightPx: lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx,
      isFirstParagraphLine: true,
      isLastParagraphLine: true,
      leftPx: 0,
      paragraphIndex,
      start: text.length,
      textHeightPx: lineMetrics.textHeightPx,
      textTopOffsetPx: beforeSpacePx + lineMetrics.textTopOffsetPx,
      widthPx: pageLayoutPx.contentWidthPx,
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

function createWrappedLineFragments(
  text: string,
  positionedRuns: PositionedNvdTextRun[],
  defaultFontFamily: string,
  defaultFontSizePt: number,
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition> | undefined,
  wrapExclusions: readonly NvdWrapExclusion[],
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const lines: NvdLineFragment[] = [];
  let position = 0;
  let paragraphIndex = 0;
  let pageIndex = 0;
  let topPx = 0;

  while (position < text.length) {
    const blockLayout = blockLayouts[paragraphIndex];
    const isFirstParagraphLine = position === 0 || text[position - 1] === "\n";
    const fallbackStyle = getFallbackParagraphTextStyle(
      paragraphIndex,
      blockLayouts,
      defaultFontFamily,
      defaultFontSizePt,
      styleDefinitions,
    );
    const beforeSpacePx = isFirstParagraphLine
      ? getParagraphSpacingPx(blockLayout?.spaceBeforePt)
      : 0;
    let previewHeightPx = measureTextRangeLineMetrics(
      position,
      Math.min(text.length, position + 1),
      positionedRuns,
      fallbackStyle,
      blockLayout?.lineHeight,
    ).lineHeightPx + beforeSpacePx;
    let lineBox = resolveWrappedLineBox(
      pageIndex,
      topPx,
      previewHeightPx,
      pageLayoutPx,
      wrapExclusions,
    );

    if (lineBox.pageIndex !== pageIndex || lineBox.topPx !== topPx) {
      pageIndex = lineBox.pageIndex;
      topPx = lineBox.topPx;
      continue;
    }

    let nextPosition = findVisualLineEnd(text, position, positionedRuns, lineBox.widthPx);
    let end = Math.max(nextPosition, position + 1);
    let isLastParagraphLine = end === text.length || text[end - 1] === "\n";
    let afterSpacePx = isLastParagraphLine
      ? getParagraphSpacingPx(blockLayout?.spaceAfterPt)
      : 0;
    let lineMetrics = measureTextRangeLineMetrics(
      position,
      end,
      positionedRuns,
      fallbackStyle,
      blockLayout?.lineHeight,
    );
    let lineHeightPx = lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const resolvedLineBox = resolveWrappedLineBox(
        pageIndex,
        topPx,
        lineHeightPx,
        pageLayoutPx,
        wrapExclusions,
      );

      if (
        resolvedLineBox.pageIndex !== pageIndex ||
        resolvedLineBox.topPx !== topPx
      ) {
        pageIndex = resolvedLineBox.pageIndex;
        topPx = resolvedLineBox.topPx;
        lineBox = resolvedLineBox;
        nextPosition = findVisualLineEnd(text, position, positionedRuns, lineBox.widthPx);
        end = Math.max(nextPosition, position + 1);
        isLastParagraphLine = end === text.length || text[end - 1] === "\n";
        afterSpacePx = isLastParagraphLine
          ? getParagraphSpacingPx(blockLayout?.spaceAfterPt)
          : 0;
        lineMetrics = measureTextRangeLineMetrics(
          position,
          end,
          positionedRuns,
          fallbackStyle,
          blockLayout?.lineHeight,
        );
        lineHeightPx = lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx;
        continue;
      }

      if (resolvedLineBox.widthPx !== lineBox.widthPx || resolvedLineBox.leftPx !== lineBox.leftPx) {
        lineBox = resolvedLineBox;
        nextPosition = findVisualLineEnd(text, position, positionedRuns, lineBox.widthPx);
        end = Math.max(nextPosition, position + 1);
        isLastParagraphLine = end === text.length || text[end - 1] === "\n";
        afterSpacePx = isLastParagraphLine
          ? getParagraphSpacingPx(blockLayout?.spaceAfterPt)
          : 0;
        lineMetrics = measureTextRangeLineMetrics(
          position,
          end,
          positionedRuns,
          fallbackStyle,
          blockLayout?.lineHeight,
        );
        lineHeightPx = lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx;
        continue;
      }

      break;
    }

    if (topPx + lineHeightPx > pageLayoutPx.contentHeightPx) {
      pageIndex += 1;
      topPx = 0;
      continue;
    }

    lines.push({
      baselineOffsetPx: beforeSpacePx + lineMetrics.baselineOffsetPx,
      end,
      heightPx: lineHeightPx,
      index: lines.length,
      isFirstParagraphLine,
      isLastParagraphLine,
      leftPx: lineBox.leftPx,
      pageIndex,
      paragraphIndex,
      start: position,
      textHeightPx: lineMetrics.textHeightPx,
      textTopOffsetPx: beforeSpacePx + lineMetrics.textTopOffsetPx,
      topPx,
      widthPx: lineBox.widthPx,
    });

    if (text.slice(position, end).endsWith("\n")) {
      paragraphIndex += 1;
    }

    position = end;
    topPx += lineHeightPx;
  }

  if (text.endsWith("\n")) {
    const blockLayout = blockLayouts[paragraphIndex];
    const fallbackStyle = getFallbackParagraphTextStyle(
      paragraphIndex,
      blockLayouts,
      defaultFontFamily,
      defaultFontSizePt,
      styleDefinitions,
    );
    const beforeSpacePx = getParagraphSpacingPx(blockLayout?.spaceBeforePt);
    const afterSpacePx = getParagraphSpacingPx(blockLayout?.spaceAfterPt);
    const lineMetrics = measureTextRangeLineMetrics(
      text.length,
      text.length,
      positionedRuns,
      fallbackStyle,
      blockLayout?.lineHeight,
    );
    const lineHeightPx = lineMetrics.lineHeightPx + beforeSpacePx + afterSpacePx;
    const lineBox = resolveWrappedLineBox(
      pageIndex,
      topPx,
      lineHeightPx,
      pageLayoutPx,
      wrapExclusions,
    );

    lines.push({
      baselineOffsetPx: beforeSpacePx + lineMetrics.baselineOffsetPx,
      end: text.length,
      heightPx: lineHeightPx,
      index: lines.length,
      isFirstParagraphLine: true,
      isLastParagraphLine: true,
      leftPx: lineBox.leftPx,
      pageIndex: lineBox.pageIndex,
      paragraphIndex,
      start: text.length,
      textHeightPx: lineMetrics.textHeightPx,
      textTopOffsetPx: beforeSpacePx + lineMetrics.textTopOffsetPx,
      topPx: lineBox.topPx,
      widthPx: lineBox.widthPx,
    });
  }

  return lines;
}

function getWrappedPageObjectExclusions(
  pageObjects: readonly NvdPageObject[],
  pageLayoutPx: ReturnType<typeof getNvdPageLayoutPx>,
) {
  return pageObjects
    .filter(
      (pageObject) =>
        pageObject.wrapMode === "rectangle" &&
        (pageObject.zMode ?? "in-front-of-text") !== "behind-text" &&
        pageObject.widthPx > 0 &&
        pageObject.heightPx > 0,
    )
    .map((pageObject) => {
      const paddingPx = Math.max(0, Math.floor(pageObject.wrapPaddingPx ?? 0));
      const bounds = getNvdPageObjectBounds(pageObject);

      return {
        bottomPx: Math.min(
          pageLayoutPx.contentHeightPx,
          bounds.bottomPx + paddingPx,
        ),
        leftPx: Math.max(0, bounds.leftPx - paddingPx),
        pageIndex: pageObject.pageIndex,
        rightPx: Math.min(
          pageLayoutPx.contentWidthPx,
          bounds.rightPx + paddingPx,
        ),
        topPx: Math.max(0, bounds.topPx - paddingPx),
      } satisfies NvdWrapExclusion;
    });
}

function resolveWrappedLineBox(
  initialPageIndex: number,
  initialTopPx: number,
  lineHeightPx: number,
  pageLayoutPx: ReturnType<typeof getNvdPageLayoutPx>,
  wrapExclusions: readonly NvdWrapExclusion[],
): NvdWrappedLineBox {
  let pageIndex = initialPageIndex;
  let topPx = initialTopPx;

  while (true) {
    if (topPx + lineHeightPx > pageLayoutPx.contentHeightPx) {
      pageIndex += 1;
      topPx = 0;
      continue;
    }

    const overlappingExclusions = wrapExclusions.filter(
      (exclusion) =>
        exclusion.pageIndex === pageIndex &&
        topPx < exclusion.bottomPx &&
        topPx + lineHeightPx > exclusion.topPx,
    );

    if (overlappingExclusions.length === 0) {
      return {
        leftPx: 0,
        pageIndex,
        topPx,
        widthPx: pageLayoutPx.contentWidthPx,
      };
    }

    const blockedSegments = overlappingExclusions
      .map((exclusion) => ({
        end: clampNumber(exclusion.rightPx, 0, pageLayoutPx.contentWidthPx),
        start: clampNumber(exclusion.leftPx, 0, pageLayoutPx.contentWidthPx),
      }))
      .sort((left, right) => left.start - right.start);
    const openSegments: Array<{ end: number; start: number }> = [];
    let cursorPx = 0;

    blockedSegments.forEach((segment) => {
      if (segment.start > cursorPx) {
        openSegments.push({ end: segment.start, start: cursorPx });
      }

      cursorPx = Math.max(cursorPx, segment.end);
    });

    if (cursorPx < pageLayoutPx.contentWidthPx) {
      openSegments.push({ end: pageLayoutPx.contentWidthPx, start: cursorPx });
    }

    const bestSegment = openSegments
      .map((segment) => ({
        ...segment,
        widthPx: segment.end - segment.start,
      }))
      .sort((left, right) =>
        right.widthPx === left.widthPx
          ? left.start - right.start
          : right.widthPx - left.widthPx,
      )[0];

    if (bestSegment && bestSegment.widthPx > 0) {
      return {
        leftPx: bestSegment.start,
        pageIndex,
        topPx,
        widthPx: bestSegment.widthPx,
      };
    }

    topPx = Math.max(...overlappingExclusions.map((exclusion) => exclusion.bottomPx));
  }
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
  textBlockIndexes: readonly number[],
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
        textBlockIndexes,
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
    embedFragments: [],
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
  textBlockIndexes: readonly number[],
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
    embedFragments: [],
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
      textBlockIndexes,
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
  textBlockIndexes: readonly number[],
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
      blockIndex: textBlockIndexes[paragraphIndex] ?? paragraphIndex,
      end,
      heightPx: fragmentLines.reduce((heightPx, line) => heightPx + line.heightPx, 0),
      kind: blockLayout.kind,
      lineHeight: blockLayout.lineHeight,
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

function createMixedPageFragments(
  normalizedRuns: NvdTextRun[],
  text: string,
  lines: NvdLineFragment[],
  embedFragments: NvdEmbedFragment[],
  blockLayouts: readonly NvdBlockLayout[],
  pageLayout: NvdPageLayout,
  pageAnchorOffsets: Map<number, number>,
  textBlockIndexes: readonly number[],
) {
  const totalPageCount =
    Math.max(
      1,
      ...lines.map((line) => line.pageIndex + 1),
      ...embedFragments.map((fragment) => fragment.pageIndex + 1),
    );
  const pages: NvdPageFragment[] = [];

  for (let pageIndex = 0; pageIndex < totalPageCount; pageIndex += 1) {
    const pageLines = lines.filter((line) => line.pageIndex === pageIndex);
    const pageEmbeds = embedFragments.filter((fragment) => fragment.pageIndex === pageIndex);
    const start = pageLines[0]?.start ?? pageAnchorOffsets.get(pageIndex) ?? 0;
    const end = pageLines[pageLines.length - 1]?.end ?? start;
    const contentBottomPx = Math.max(
      0,
      ...pageLines.map((line) => line.topPx + line.heightPx),
      ...pageEmbeds.map((fragment) => fragment.topPx + fragment.heightPx),
    );
    const lineStartIndex = pageLines[0]?.index ?? lines.find((line) => line.pageIndex > pageIndex)?.index ?? lines.length;
    const lineEndIndex = pageLines.length > 0 ? pageLines[pageLines.length - 1].index + 1 : lineStartIndex;

    pages.push({
      contentBottomPx,
      contentHeightPx: contentBottomPx,
      contentTopPx: 0,
      end,
      embedFragments: pageEmbeds,
      index: pageIndex,
      lineEndIndex,
      lineStartIndex,
      lines: pageLines,
      paragraphFragments:
        pageLines.length > 0
          ? createParagraphFragments(
              normalizedRuns,
              text,
              pageLines,
              blockLayouts,
              pageLines[0]?.index ?? 0,
              pageIndex,
              textBlockIndexes,
            )
          : [],
      paragraphIndexes:
        pageLines.length > 0
          ? getNvdParagraphIndexesForRange(text, start, end)
          : [],
      runs: sliceNvdTextRuns(normalizedRuns, start, end),
      start,
      text: text.slice(start, end),
    });
  }

  return pages;
}

function getNvdParagraphIndexesForRange(text: string, start: number, end: number) {
  const firstParagraphIndex = countLineBreaks(text.slice(0, start));
  const paragraphCount = countLineBreaks(text.slice(start, end)) + 1;

  return Array.from({ length: paragraphCount }, (_, index) => firstParagraphIndex + index);
}

function getOrderedBlockFragments(layout: NvdDocumentLayoutSnapshot) {
  return layout.pages
    .flatMap((page) => [
      ...page.paragraphFragments.map((fragment) => ({
        blockIndex: fragment.blockIndex,
        heightPx: fragment.heightPx,
        pageIndex: fragment.pageIndex,
        topPx: fragment.topPx,
      })),
      ...page.embedFragments.map((fragment) => ({
        blockIndex: fragment.blockIndex,
        heightPx: fragment.heightPx,
        pageIndex: fragment.pageIndex,
        topPx: fragment.topPx,
      })),
    ])
    .sort((left, right) =>
      left.blockIndex === right.blockIndex
        ? left.pageIndex === right.pageIndex
          ? left.topPx - right.topPx
          : left.pageIndex - right.pageIndex
        : left.blockIndex - right.blockIndex,
    );
}

function getNvdTextBlockIndexes(blocks: readonly NvdBlock[]) {
  return blocks.reduce<number[]>((indexes, block, index) => {
    if (block.kind !== "embed") {
      indexes.push(index);
    }

    return indexes;
  }, []);
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

function resolveEmbedWidthPx(
  requestedWidthPx: number | undefined,
  displayMode: "fit" | "actual" | "custom" | undefined,
  contentWidthPx: number,
) {
  const fallbackWidthPx =
    displayMode === "actual"
      ? Math.min(contentWidthPx, 320)
      : displayMode === "custom"
        ? Math.min(contentWidthPx, 420)
        : contentWidthPx;

  return clampNumber(requestedWidthPx ?? fallbackWidthPx, 120, contentWidthPx);
}

function resolveEmbedLeftPx(
  alignment: "left" | "center" | "right" | undefined,
  contentWidthPx: number,
  widthPx: number,
) {
  if (alignment === "left") {
    return 0;
  }

  if (alignment === "right") {
    return Math.max(0, contentWidthPx - widthPx);
  }

  return Math.max(0, (contentWidthPx - widthPx) / 2);
}

function measureEmbedCaptionHeightPx(
  caption: string,
  widthPx: number,
  fontFamily: string,
  fontSizePt: number,
) {
  const trimmedCaption = caption.trim();

  if (!trimmedCaption) {
    return 0;
  }

  const words = trimmedCaption.split(/\s+/u);
  let lineCount = 1;
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidthPx = measureTextWidth(
      candidate,
      getNvdFontCssStack(fontFamily),
      fontSizePt,
      false,
      0,
      false,
    );

    if (currentLine && candidateWidthPx > widthPx) {
      lineCount += 1;
      currentLine = word;
      return;
    }

    currentLine = candidate;
  });

  return lineCount * getLineHeightPx(fontSizePt, 1.2);
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

function measureTextRangeLineMetrics(
  start: number,
  end: number,
  positionedRuns: PositionedNvdTextRun[],
  fallbackStyle: NvdResolvedTextStyle,
  lineHeight: number | undefined,
) {
  let maxFontSizePt = fallbackStyle.fontSizePt;
  let maxAscentPx = 0;
  let maxDescentPx = 0;
  let hasRun = false;

  for (const run of positionedRuns) {
    if (run.end <= start || run.start >= end) {
      continue;
    }

    hasRun = true;
    maxFontSizePt = Math.max(maxFontSizePt, run.fontSizePt);
    const metrics = getTextStyleMetrics(run.fontFamily, run.fontSizePt, run.bold, run.italic);
    maxAscentPx = Math.max(maxAscentPx, metrics.ascentPx);
    maxDescentPx = Math.max(maxDescentPx, metrics.descentPx);
  }

  if (!hasRun) {
    const metrics = getTextStyleMetrics(
      fallbackStyle.fontFamily,
      fallbackStyle.fontSizePt,
      fallbackStyle.bold,
      fallbackStyle.italic,
    );
    maxAscentPx = metrics.ascentPx;
    maxDescentPx = metrics.descentPx;
  }

  const lineHeightPx = getLineHeightPx(maxFontSizePt, lineHeight);
  const textHeightPx = Math.max(1, maxAscentPx + maxDescentPx);
  const leadingPx = Math.max(0, lineHeightPx - textHeightPx);
  const leadingTopPx =
    textHeightPx > 0
      ? leadingPx * (maxAscentPx / textHeightPx)
      : leadingPx / 2;

  return {
    baselineOffsetPx: leadingTopPx + maxAscentPx,
    lineHeightPx,
    textHeightPx,
    textTopOffsetPx: leadingTopPx,
  };
}

function getLineHeightPx(fontSizePt: number, lineHeight: number | undefined) {
  return getNvdFontSizePx(fontSizePt) * getNvdLineHeight(lineHeight);
}

function getLineTextTopPx(
  line: NvdLineFragment | null | undefined,
  blockLayout: NvdBlockLayout | undefined,
  defaultFontSizePt: number,
) {
  if (!line) {
    return 0;
  }

  return line.topPx + line.textTopOffsetPx;
}

function getLineTextHeightPx(
  line: NvdLineFragment,
  blockLayout: NvdBlockLayout | undefined,
  defaultFontSizePt: number,
) {
  return line.textHeightPx;
}

function getLineBaselinePx(
  line: NvdLineFragment,
  blockLayout: NvdBlockLayout | undefined,
  defaultFontSizePt: number,
) {
  return line.topPx + line.baselineOffsetPx;
}

function getParagraphSpacingPx(spacingPt: number | undefined) {
  return getNvdParagraphSpacingPt(spacingPt) * (4 / 3);
}

const nvdTextMetricsCache = new Map<string, { ascentPx: number; descentPx: number }>();

function getTextStyleMetrics(
  fontFamily: string,
  fontSizePt: number,
  bold: boolean,
  italic: boolean,
) {
  const cacheKey = JSON.stringify([fontFamily, fontSizePt, bold, italic]);
  const cachedMetrics = nvdTextMetricsCache.get(cacheKey);

  if (cachedMetrics) {
    return cachedMetrics;
  }

  const fontCssStack = getNvdFontCssStack(fontFamily);
  const fontSizePx = getNvdFontSizePx(fontSizePt);
  const context = getTextMeasurementContext();

  if (!context) {
    const fallbackMetrics = {
      ascentPx: fontSizePx * 0.8,
      descentPx: fontSizePx * 0.2,
    };
    nvdTextMetricsCache.set(cacheKey, fallbackMetrics);
    return fallbackMetrics;
  }

  context.font = `${italic ? "italic " : ""}${bold ? "700 " : ""}${fontSizePx}px ${fontCssStack}`;
  const metrics = context.measureText("Hg");
  const ascentPx =
    Number.isFinite(metrics.actualBoundingBoxAscent) && metrics.actualBoundingBoxAscent > 0
      ? metrics.actualBoundingBoxAscent
      : fontSizePx * 0.8;
  const descentPx =
    Number.isFinite(metrics.actualBoundingBoxDescent) && metrics.actualBoundingBoxDescent >= 0
      ? metrics.actualBoundingBoxDescent
      : fontSizePx * 0.2;
  const resolvedMetrics = {
    ascentPx,
    descentPx,
  };

  nvdTextMetricsCache.set(cacheKey, resolvedMetrics);
  return resolvedMetrics;
}

function getFallbackParagraphTextStyle(
  paragraphIndex: number,
  blockLayouts: readonly NvdBlockLayout[],
  defaultFontFamily: string,
  defaultFontSizePt: number,
  styleDefinitions?: Record<NvdStyleRole, NvdStyleDefinition>,
): NvdResolvedTextStyle {
  const paragraphRole = blockLayouts[paragraphIndex]?.kind ?? "p";
  const styleDefinition = styleDefinitions?.[paragraphRole];

  return {
    bold: styleDefinition?.bold ?? false,
    fontFamily: styleDefinition?.fontFamily ?? defaultFontFamily,
    fontSizePt: styleDefinition?.fontSizePt ?? defaultFontSizePt,
    italic: styleDefinition?.italic ?? false,
  };
}

function resolveCaretTextStyleAtOffset(
  offset: number,
  line: NvdLineFragment,
  positionedRuns: PositionedNvdTextRun[],
  fallbackStyle: NvdResolvedTextStyle,
): NvdResolvedTextStyle {
  let previousRun: PositionedNvdTextRun | null = null;
  let nextRun: PositionedNvdTextRun | null = null;

  for (const run of positionedRuns) {
    if (run.end <= line.start || run.start >= line.end) {
      continue;
    }

    const localOffset = offset - run.start;
    const currentCharacter = localOffset >= 0 && localOffset < run.text.length ? run.text[localOffset] : null;

    if (
      run.start <= offset &&
      offset < run.end &&
      hasVisibleCaretText(run.text) &&
      currentCharacter !== "\n"
    ) {
      return {
        bold: run.bold,
        fontFamily: run.fontFamily,
        fontSizePt: run.fontSizePt,
        italic: run.italic,
      };
    }

    if (run.end === offset && hasVisibleCaretText(run.text)) {
      previousRun = run;
    } else if (!nextRun && run.start === offset && hasVisibleCaretText(run.text)) {
      nextRun = run;
    }
  }

  const candidateRun = previousRun ?? nextRun;

  if (!candidateRun) {
    return fallbackStyle;
  }

  return {
    bold: candidateRun.bold,
    fontFamily: candidateRun.fontFamily,
    fontSizePt: candidateRun.fontSizePt,
    italic: candidateRun.italic,
  };
}

function hasVisibleCaretText(text: string) {
  return text.replace(/\n/g, "").length > 0;
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
