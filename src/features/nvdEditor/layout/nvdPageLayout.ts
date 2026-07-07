import type { NvdPageLayout, NvdPageSizePreset } from "../../inventoryProject";

export const NVD_PT_TO_PX = 4 / 3;
export const NVD_PT_PER_INCH = 72;
export const NVD_MM_PER_INCH = 25.4;
export const NVD_PT_TO_MM = NVD_MM_PER_INCH / NVD_PT_PER_INCH;
export const NVD_DEFAULT_PAGE_SIZE: NvdPageSizePreset = "a4";
export const NVD_A4_PAGE_WIDTH_PT = (210 / 25.4) * 72;
export const NVD_A4_PAGE_HEIGHT_PT = (297 / 25.4) * 72;
export const NVD_DEFAULT_PAGE_MARGIN_PT = 72;
export const NVD_MIN_PAGE_CONTENT_SIZE_PT = 36;

export const DEFAULT_NVD_PAGE_LAYOUT: NvdPageLayout = {
  pageSize: NVD_DEFAULT_PAGE_SIZE,
  widthPt: NVD_A4_PAGE_WIDTH_PT,
  heightPt: NVD_A4_PAGE_HEIGHT_PT,
  marginTopPt: NVD_DEFAULT_PAGE_MARGIN_PT,
  marginRightPt: NVD_DEFAULT_PAGE_MARGIN_PT,
  marginBottomPt: NVD_DEFAULT_PAGE_MARGIN_PT,
  marginLeftPt: NVD_DEFAULT_PAGE_MARGIN_PT,
};

export type NvdPageLayoutPx = {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
};

export type NvdPageContentBoxPt = {
  widthPt: number;
  heightPt: number;
};

export function getNvdPageLayout(pageLayout: Partial<NvdPageLayout> | null | undefined): NvdPageLayout {
  const normalizedSize = getNvdPageSizePreset(pageLayout?.pageSize);
  const fallbackLayout = normalizedSize === "a4"
    ? DEFAULT_NVD_PAGE_LAYOUT
    : {
        ...DEFAULT_NVD_PAGE_LAYOUT,
        pageSize: "custom" as const,
      };
  const widthPt = getFinitePageLengthPt(pageLayout?.widthPt, fallbackLayout.widthPt);
  const heightPt = getFinitePageLengthPt(pageLayout?.heightPt, fallbackLayout.heightPt);
  const marginTopPt = getFiniteMarginPt(pageLayout?.marginTopPt, fallbackLayout.marginTopPt);
  const marginRightPt = getFiniteMarginPt(pageLayout?.marginRightPt, fallbackLayout.marginRightPt);
  const marginBottomPt = getFiniteMarginPt(pageLayout?.marginBottomPt, fallbackLayout.marginBottomPt);
  const marginLeftPt = getFiniteMarginPt(pageLayout?.marginLeftPt, fallbackLayout.marginLeftPt);

  return clampNvdPageLayout({
    pageSize: normalizedSize,
    widthPt,
    heightPt,
    marginTopPt,
    marginRightPt,
    marginBottomPt,
    marginLeftPt,
  });
}

export function clampNvdPageLayout(pageLayout: NvdPageLayout): NvdPageLayout {
  const widthPt = getFinitePageLengthPt(pageLayout.widthPt, DEFAULT_NVD_PAGE_LAYOUT.widthPt);
  const heightPt = getFinitePageLengthPt(pageLayout.heightPt, DEFAULT_NVD_PAGE_LAYOUT.heightPt);

  return {
    pageSize: getNvdPageSizePreset(pageLayout.pageSize),
    widthPt,
    heightPt,
    marginTopPt: clampNvdMarginPair(pageLayout.marginTopPt, pageLayout.marginBottomPt, heightPt).start,
    marginRightPt: clampNvdMarginPair(pageLayout.marginRightPt, pageLayout.marginLeftPt, widthPt).start,
    marginBottomPt: clampNvdMarginPair(pageLayout.marginBottomPt, pageLayout.marginTopPt, heightPt).start,
    marginLeftPt: clampNvdMarginPair(pageLayout.marginLeftPt, pageLayout.marginRightPt, widthPt).start,
  };
}

export function getNvdPageLayoutPx(pageLayout: Partial<NvdPageLayout> | null | undefined): NvdPageLayoutPx {
  const normalizedLayout = getNvdPageLayout(pageLayout);
  const widthPx = getNvdPageLengthPx(normalizedLayout.widthPt);
  const heightPx = getNvdPageLengthPx(normalizedLayout.heightPt);
  const marginTopPx = getNvdPageLengthPx(normalizedLayout.marginTopPt);
  const marginRightPx = getNvdPageLengthPx(normalizedLayout.marginRightPt);
  const marginBottomPx = getNvdPageLengthPx(normalizedLayout.marginBottomPt);
  const marginLeftPx = getNvdPageLengthPx(normalizedLayout.marginLeftPt);

  return {
    widthPx,
    heightPx,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    contentWidthPx: Math.max(0, widthPx - marginLeftPx - marginRightPx),
    contentHeightPx: Math.max(0, heightPx - marginTopPx - marginBottomPx),
  };
}

export function getNvdPageLengthPx(lengthPt: number) {
  return getFinitePageLengthPt(lengthPt, 0) * NVD_PT_TO_PX;
}

export function getNvdPageLengthMm(lengthPt: number) {
  return getFinitePageLengthPt(lengthPt, 0) * NVD_PT_TO_MM;
}

export function getNvdPageContentBoxPt(pageLayout: Partial<NvdPageLayout> | null | undefined): NvdPageContentBoxPt {
  const normalizedLayout = getNvdPageLayout(pageLayout);

  return {
    widthPt: Math.max(0, normalizedLayout.widthPt - normalizedLayout.marginLeftPt - normalizedLayout.marginRightPt),
    heightPt: Math.max(0, normalizedLayout.heightPt - normalizedLayout.marginTopPt - normalizedLayout.marginBottomPt),
  };
}

export function getNvdPageSizePreset(pageSize: string | null | undefined): NvdPageSizePreset {
  return pageSize === "custom" ? "custom" : "a4";
}

function clampNvdMarginPair(start: number, end: number, extentPt: number) {
  const safeExtentPt = getFinitePageLengthPt(extentPt, DEFAULT_NVD_PAGE_LAYOUT.widthPt);
  const safeStartPt = getFiniteMarginPt(start, NVD_DEFAULT_PAGE_MARGIN_PT);
  const safeEndPt = getFiniteMarginPt(end, NVD_DEFAULT_PAGE_MARGIN_PT);
  const maxCombinedMarginsPt = Math.max(0, safeExtentPt - NVD_MIN_PAGE_CONTENT_SIZE_PT);

  if (safeStartPt + safeEndPt <= maxCombinedMarginsPt) {
    return {
      start: safeStartPt,
      end: safeEndPt,
    };
  }

  if (safeStartPt === 0 && safeEndPt === 0) {
    return {
      start: 0,
      end: 0,
    };
  }

  const scale = maxCombinedMarginsPt / Math.max(1, safeStartPt + safeEndPt);
  return {
    start: safeStartPt * scale,
    end: safeEndPt * scale,
  };
}

function getFinitePageLengthPt(value: number | null | undefined, fallbackPt: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallbackPt;
}

function getFiniteMarginPt(value: number | null | undefined, fallbackPt: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallbackPt;
}
