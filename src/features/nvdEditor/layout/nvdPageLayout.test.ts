import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_PAGE_LAYOUT,
  NVD_MIN_PAGE_CONTENT_SIZE_PT,
  clampNvdPageLayout,
  getNvdPageContentBoxPt,
  getNvdPageLayout,
  getNvdPageLengthMm,
} from "./nvdPageLayout";

describe("NVD page layout", () => {
  it("defaults missing page layout to the canonical A4 geometry", () => {
    expect(getNvdPageLayout(undefined)).toEqual(DEFAULT_NVD_PAGE_LAYOUT);
  });

  it("clamps invalid margins so the content box never collapses below the minimum size", () => {
    const normalized = clampNvdPageLayout({
      ...DEFAULT_NVD_PAGE_LAYOUT,
      marginLeftPt: 500,
      marginRightPt: 500,
      marginTopPt: 800,
      marginBottomPt: 800,
    });
    const contentBox = getNvdPageContentBoxPt(normalized);

    expect(contentBox.widthPt).toBeGreaterThanOrEqual(NVD_MIN_PAGE_CONTENT_SIZE_PT);
    expect(contentBox.heightPt).toBeGreaterThanOrEqual(NVD_MIN_PAGE_CONTENT_SIZE_PT);
    expect(normalized.marginLeftPt + normalized.marginRightPt).toBeCloseTo(
      normalized.widthPt - NVD_MIN_PAGE_CONTENT_SIZE_PT,
      5,
    );
    expect(normalized.marginTopPt + normalized.marginBottomPt).toBeCloseTo(
      normalized.heightPt - NVD_MIN_PAGE_CONTENT_SIZE_PT,
      5,
    );
  });

  it("converts point lengths to millimeters using physical page units", () => {
    expect(getNvdPageLengthMm(72)).toBeCloseTo(25.4, 5);
  });
});
