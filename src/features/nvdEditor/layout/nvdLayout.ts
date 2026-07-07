import type { NvdDocument, NvdLayoutMode, NvdPageLayout, NvdTextRun } from "../../inventoryProject";
import { DEFAULT_NVD_LINE_HEIGHT, getNvdLineHeight } from "../primitives/nvdLineHeight";
import { DEFAULT_NVD_PAGE_LAYOUT, getNvdPageLayout, getNvdPageLayoutPx } from "./nvdPageLayout";
import { getNvdParagraphSpacingPt } from "../primitives/nvdParagraphSpacing";
import { getNvdDocumentText, type NvdBlockLayout } from "../document/nvdRichText";
import {
  layoutNvdDocument,
  layoutNvdText,
  layoutNvdTextRuns,
  type NvdTextPage,
} from "./nvdPageLayoutEngine";
export type { NvdTextPage } from "./nvdPageLayoutEngine";
export { layoutNvdDocument, layoutNvdText, layoutNvdTextRuns } from "./nvdPageLayoutEngine";

export const DEFAULT_NVD_LAYOUT_MODE: NvdLayoutMode = "a4";
export const NVD_A4_PAGE_GAP_PX = 20;
export const NVD_TEXT_LINE_HEIGHT = DEFAULT_NVD_LINE_HEIGHT;

export const NVD_A4_PAGE_WIDTH_PX = getNvdPageLayoutPx(DEFAULT_NVD_PAGE_LAYOUT).widthPx;
export const NVD_A4_PAGE_HEIGHT_PX = getNvdPageLayoutPx(DEFAULT_NVD_PAGE_LAYOUT).heightPx;
export const NVD_A4_PAGE_MARGIN_X_PX = getNvdPageLayoutPx(DEFAULT_NVD_PAGE_LAYOUT).marginLeftPx;
export const NVD_A4_PAGE_MARGIN_Y_PX = getNvdPageLayoutPx(DEFAULT_NVD_PAGE_LAYOUT).marginTopPx;
export const NVD_A4_CONTENT_HEIGHT_PX = getNvdPageLayoutPx(DEFAULT_NVD_PAGE_LAYOUT).contentHeightPx;

export type NvdPageBreak = {
  heightPx: number;
  offset: number;
};

export { getNvdDocumentText };

export function getNvdLayoutMode(layoutMode: NvdLayoutMode | string | null | undefined): NvdLayoutMode {
  return layoutMode === "pageless" || layoutMode === "a4" ? layoutMode : DEFAULT_NVD_LAYOUT_MODE;
}

export function paginateNvdDocument(
  document: Pick<NvdDocument, "blocks" | "fontFamily" | "fontSize" | "styles" | "pageLayout">,
) {
  return layoutNvdDocument(document).pages;
}

export function paginateNvdText(
  text: string,
  fontFamily?: string | null,
  fontSize?: string | number | null,
): NvdTextPage[] {
  return layoutNvdText(text, fontFamily, fontSize).pages;
}

export function paginateNvdTextRuns(
  runs: NvdTextRun[],
  defaultFontFamily?: string | null,
  defaultFontSize?: string | number | null,
  blockLayouts: readonly NvdBlockLayout[] = [],
  pageLayout?: Partial<NvdPageLayout> | null,
): NvdTextPage[] {
  return layoutNvdTextRuns(
    runs,
    defaultFontFamily,
    defaultFontSize,
    blockLayouts,
    pageLayout,
  ).pages;
}

export function getNvdA4PageBreaks(
  pages: readonly NvdTextPage[],
  pageLayout?: Partial<NvdPageLayout> | null,
) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);

  return pages.slice(0, -1).map((page) => ({
    heightPx:
      pageLayoutPx.contentHeightPx -
      page.contentHeightPx +
      pageLayoutPx.marginTopPx +
      pageLayoutPx.marginBottomPx +
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

function getLineHeightPx(fontSizePt: number, lineHeight: number | undefined) {
  return fontSizePt * (4 / 3) * getNvdLineHeight(lineHeight);
}

function getParagraphSpacingPx(spacingPt: number | undefined) {
  return getNvdParagraphSpacingPt(spacingPt) * (4 / 3);
}
