import { describe, expect, it } from "vitest";
import {
  NVD_A4_CONTENT_HEIGHT_PX,
  NVD_A4_PAGE_GAP_PX,
  NVD_A4_PAGE_MARGIN_Y_PX,
  getNvdA4PageBreaks,
  getNvdLayoutMode,
  paginateNvdTextRuns,
} from "./nvdLayout";
import { DEFAULT_NVD_PAGE_LAYOUT } from "./nvdPageLayout";

describe("NVD A4 pagination", () => {
  it("preserves both supported layout modes while defaulting invalid values to A4", () => {
    expect(getNvdLayoutMode("a4")).toBe("a4");
    expect(getNvdLayoutMode("pageless")).toBe("pageless");
    expect(getNvdLayoutMode("not-a-mode")).toBe("a4");
    expect(getNvdLayoutMode(null)).toBe("a4");
  });

  it("keeps a generated 100-page document contiguous and within page bounds", () => {
    const text = Array.from(
      { length: 4_000 },
      (_, index) => `Line ${index + 1}: Inventory large document pagination regression.`,
    ).join("\n");
    const startedAt = performance.now();
    const pages = paginateNvdTextRuns([{ text }], "Inter", 12);
    const elapsedMs = performance.now() - startedAt;

    expect(pages.length).toBeGreaterThanOrEqual(100);
    expect(elapsedMs).toBeLessThan(2_000);
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1]?.end).toBe(text.length);

    pages.forEach((page, index) => {
      expect(page.contentHeightPx).toBeLessThanOrEqual(NVD_A4_CONTENT_HEIGHT_PX);
      expect(page.text).toBe(text.slice(page.start, page.end));

      if (index > 0) {
        expect(page.start).toBe(pages[index - 1].end);
      }
    });
  });

  it("reuses identical pagination results across editor and Inspector consumers", () => {
    const runs = [{ text: "A shared pagination result.\n".repeat(2_000) }];
    const firstPages = paginateNvdTextRuns(runs, "Inter", 12);
    const secondPages = paginateNvdTextRuns(runs, "Inter", 12);

    expect(secondPages).toBe(firstPages);
  });

  it("uses custom paragraph line spacing when calculating page boundaries", () => {
    const runs = [{ text: "A line of text.\n".repeat(100) }];
    const compactLayouts = Array.from({ length: 101 }, () => ({
      kind: "p" as const,
      lineHeight: 1,
      spaceAfterPt: 0,
      spaceBeforePt: 0,
      textAlign: "left" as const,
    }));
    const spaciousLayouts = compactLayouts.map((layout) => ({ ...layout, lineHeight: 3 }));

    const compactPages = paginateNvdTextRuns(runs, "Inter", 12, compactLayouts);
    const spaciousPages = paginateNvdTextRuns(runs, "Inter", 12, spaciousLayouts);

    expect(spaciousPages.length).toBeGreaterThan(compactPages.length);
  });

  it("uses paragraph space before and after when calculating page boundaries", () => {
    const runs = [{ text: "A paragraph.\n".repeat(100) }];
    const compactLayouts = Array.from({ length: 101 }, () => ({
      kind: "p" as const,
      lineHeight: 1,
      spaceAfterPt: 0,
      spaceBeforePt: 0,
      textAlign: "left" as const,
    }));
    const spacedLayouts = compactLayouts.map((layout) => ({
      ...layout,
      spaceAfterPt: 24,
      spaceBeforePt: 24,
    }));

    expect(paginateNvdTextRuns(runs, "Inter", 12, spacedLayouts).length).toBeGreaterThan(
      paginateNvdTextRuns(runs, "Inter", 12, compactLayouts).length,
    );
  });

  it("wraps expanded character spacing into more A4 pages", () => {
    const text = "Inventory character spacing pagination regression. ".repeat(1_000);
    const normalPages = paginateNvdTextRuns([{ text }], "Inter", 12);
    const expandedPages = paginateNvdTextRuns(
      [{ text, style: { characterSpacingPt: 4 } }],
      "Inter",
      12,
    );

    expect(expandedPages.length).toBeGreaterThan(normalPages.length);
  });

  it("projects each page break using unused content height, margins, and the paper gap", () => {
    const pages = paginateNvdTextRuns(
      [{ text: "Short line\n".repeat(2_000) }],
      "Inter",
      12,
    );
    const pageBreaks = getNvdA4PageBreaks(pages);

    expect(pageBreaks).toHaveLength(pages.length - 1);
    pageBreaks.forEach((pageBreak, index) => {
      expect(pageBreak.offset).toBe(pages[index].end);
      expect(pageBreak.heightPx).toBe(
        NVD_A4_CONTENT_HEIGHT_PX -
          pages[index].contentHeightPx +
          NVD_A4_PAGE_MARGIN_Y_PX * 2 +
          NVD_A4_PAGE_GAP_PX,
      );
    });
  });

  it("uses persisted page geometry instead of fixed A4 content bounds", () => {
    const text = "Inventory layout model regression line.\n".repeat(400);
    const defaultPages = paginateNvdTextRuns([{ text }], "Inter", 12);
    const narrowPages = paginateNvdTextRuns(
      [{ text }],
      "Inter",
      12,
      [],
      {
        ...DEFAULT_NVD_PAGE_LAYOUT,
        marginLeftPt: 144,
        marginRightPt: 144,
      },
    );
    const shortPages = paginateNvdTextRuns(
      [{ text }],
      "Inter",
      12,
      [],
      {
        ...DEFAULT_NVD_PAGE_LAYOUT,
        marginTopPt: 144,
        marginBottomPt: 144,
      },
    );

    expect(narrowPages.length).toBeGreaterThan(defaultPages.length);
    expect(shortPages.length).toBeGreaterThan(defaultPages.length);
  });
});
