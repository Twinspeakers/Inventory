import { describe, expect, it } from "vitest";
import { DEFAULT_NVD_PAGE_LAYOUT } from "./nvdPageLayout";
import type { NvdBlockLayout } from "../document/nvdRichText";
import { DEFAULT_NVD_STYLE_DEFINITIONS } from "../document/nvdStyles";
import {
  findNvdEmbedFragmentAtPagePoint,
  findNvdLineFragmentForOffset,
  findNvdPageFragmentForOffset,
  findNvdParagraphFragmentForOffset,
  getNvdBlockSelectionGeometry,
  getNvdCaretGeometry,
  getNvdOffsetAtPagePoint,
  getNvdSelectionGeometry,
  layoutNvdDocument,
  layoutNvdTextRuns,
} from "./nvdPageLayoutEngine";

function createLayout(overrides: Partial<NvdBlockLayout> = {}): NvdBlockLayout {
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
    ...overrides,
  };
}

describe("NVD page layout engine", () => {
  it("reuses identical layout snapshots for equivalent inputs", () => {
    const runs = [{ text: "A shared layout result.\n".repeat(2_000) }];
    const firstLayout = layoutNvdTextRuns(runs, "Inter", 12);
    const secondLayout = layoutNvdTextRuns(runs, "Inter", 12);

    expect(secondLayout).toBe(firstLayout);
    expect(secondLayout.pages).toBe(firstLayout.pages);
  });

  it("emits line fragments fully assigned to pages", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "Inventory page fragment regression line.\n".repeat(400) }],
      "Inter",
      12,
    );

    expect(layout.pages.length).toBeGreaterThan(1);
    layout.pages.forEach((page, pageIndex) => {
      expect(page.lines.length).toBeGreaterThan(0);
      page.lines.forEach((line, lineIndex) => {
        expect(line.pageIndex).toBe(pageIndex);
        expect(line.topPx).toBeGreaterThanOrEqual(0);
        if (lineIndex > 0) {
          expect(line.topPx).toBeGreaterThanOrEqual(page.lines[lineIndex - 1].topPx);
        }
      });
    });
  });

  it("emits paragraph fragments grouped within each page", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "First paragraph wraps a bit. ".repeat(30) + "\nSecond paragraph stays separate." }],
      "Inter",
      12,
    );

    layout.pages.forEach((page) => {
      expect(page.paragraphFragments.length).toBeGreaterThan(0);
      page.paragraphFragments.forEach((fragment) => {
        expect(fragment.pageIndex).toBe(page.index);
        expect(fragment.start).toBeGreaterThanOrEqual(page.start);
        expect(fragment.end).toBeLessThanOrEqual(page.end);
        expect(fragment.heightPx).toBeGreaterThan(0);
      });
    });
  });

  it("responds to content-bounds changes through the shared layout snapshot", () => {
    const text = "Inventory layout model regression line that should wrap under narrower content bounds. ".repeat(120);
    const defaultLayout = layoutNvdTextRuns([{ text }], "Inter", 12);
    const narrowLayout = layoutNvdTextRuns(
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

    const defaultLineCount = defaultLayout.pages.reduce((count, page) => count + page.lines.length, 0);
    const narrowLineCount = narrowLayout.pages.reduce((count, page) => count + page.lines.length, 0);

    expect(narrowLineCount).toBeGreaterThan(defaultLineCount);
  });

  it("maps document offsets back to page and paragraph fragments", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "First paragraph.\nSecond paragraph that is longer and wraps. ".repeat(30) }],
      "Inter",
      12,
    );

    const secondPage = layout.pages[1] ?? layout.pages[0];
    const page = findNvdPageFragmentForOffset(layout.pages, secondPage.start);
    const paragraphFragment = findNvdParagraphFragmentForOffset(page, secondPage.start);

    expect(page).toBe(secondPage);
    expect(paragraphFragment).not.toBeNull();
    expect(paragraphFragment?.start).toBeLessThanOrEqual(secondPage.start);
    expect(paragraphFragment?.end).toBeGreaterThanOrEqual(secondPage.start);
  });

  it("computes caret geometry for a document offset within a page fragment", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "Alpha beta gamma\nDelta epsilon" }],
      "Inter",
      12,
    );

    const page = findNvdPageFragmentForOffset(layout.pages, 8);
    const line = findNvdLineFragmentForOffset(page, 8);
    const caret = getNvdCaretGeometry(layout, 8);

    expect(page).not.toBeNull();
    expect(line).not.toBeNull();
    expect(caret).not.toBeNull();
    expect(caret?.pageIndex).toBe(page?.index);
    expect(caret?.lineIndex).toBe(line?.index);
    expect(caret?.leftPx).toBeGreaterThanOrEqual(0);
    expect(caret?.heightPx).toBeGreaterThan(0);
  });

  it("creates a clickable first page and caret geometry for an empty document", () => {
    const layout = layoutNvdTextRuns([], "Inter", 12, [createLayout()]);
    const caret = getNvdCaretGeometry(layout, 0);
    const offset = getNvdOffsetAtPagePoint(layout, 0, 0, 0);

    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0].start).toBe(0);
    expect(layout.pages[0].end).toBe(0);
    expect(caret).not.toBeNull();
    expect(caret?.pageIndex).toBe(0);
    expect(caret?.leftPx).toBe(0);
    expect(caret?.topPx).toBe(0);
    expect(caret?.heightPx).toBeGreaterThan(0);
    expect(offset).toBe(0);
  });

  it("computes selection rectangles across visual lines", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "Alpha beta gamma delta epsilon zeta eta theta" }],
      "Inter",
      12,
      [],
      {
        ...DEFAULT_NVD_PAGE_LAYOUT,
        marginLeftPt: 180,
        marginRightPt: 180,
      },
    );

    const rects = getNvdSelectionGeometry(layout, 2, layout.text.length - 2);

    expect(rects.length).toBeGreaterThan(1);
    rects.forEach((rect) => {
      expect(rect.widthPx).toBeGreaterThan(0);
      expect(rect.heightPx).toBeGreaterThan(0);
    });
  });

  it("keeps caret and selection overlay geometry to text height instead of paragraph spacing", () => {
    const blockLayout = createLayout({
      lineHeight: 1,
      spaceAfterPt: 18,
      spaceBeforePt: 18,
    });
    const layout = layoutNvdTextRuns(
      [{ text: "Alpha" }],
      "Inter",
      12,
      [blockLayout],
    );

    const caret = getNvdCaretGeometry(layout, 0);
    const rects = getNvdSelectionGeometry(layout, 0, 2);

    expect(caret).not.toBeNull();
    expect(caret?.topPx).toBeGreaterThan(0);
    expect(caret?.heightPx).toBeLessThan(layout.pages[0].lines[0].heightPx);
    expect(rects).toHaveLength(1);
    expect(rects[0].topPx).toBe(caret?.topPx);
    expect(rects[0].heightPx).toBe(caret?.heightPx);
  });

  it("matches caret height to the resolved text style at the caret offset", () => {
    const layout = layoutNvdTextRuns(
      [
        { text: "small " },
        { text: "BIG", style: { fontSize: "36pt", fontFamily: "Google Sans Flex", bold: true } },
      ],
      "Inter",
      12,
      [createLayout()],
    );

    const smallCaret = getNvdCaretGeometry(layout, 1);
    const bigCaret = getNvdCaretGeometry(layout, "small ".length + 1);

    expect(smallCaret).not.toBeNull();
    expect(bigCaret).not.toBeNull();
    expect(bigCaret!.heightPx).toBeGreaterThan(smallCaret!.heightPx);
    expect(bigCaret!.topPx).toBeLessThan(smallCaret!.topPx);
  });

  it("uses the paragraph style metrics for an empty styled paragraph caret", () => {
    const headingStyleDefinitions = {
      ...DEFAULT_NVD_STYLE_DEFINITIONS,
      h1: {
        ...DEFAULT_NVD_STYLE_DEFINITIONS.h1,
        fontFamily: "Google Sans Flex",
        fontSizePt: 36,
      },
    };
    const layout = layoutNvdTextRuns(
      [],
      "Inter",
      12,
      [createLayout({ kind: "h1" })],
      undefined,
      headingStyleDefinitions,
    );
    const caret = getNvdCaretGeometry(layout, 0);

    expect(caret).not.toBeNull();
    expect(caret!.heightPx).toBeGreaterThan(24);
  });

  it("keeps a styled caret height at the end of a paragraph before the newline", () => {
    const layout = layoutNvdTextRuns(
      [
        { text: "Heading", style: { fontSize: "36pt", fontFamily: "Google Sans Flex", bold: true } },
        { text: "\n" },
        { text: "Body" },
      ],
      "Inter",
      12,
      [createLayout({ kind: "h1" }), createLayout()],
    );

    const headingMidCaret = getNvdCaretGeometry(layout, 2);
    const headingEndCaret = getNvdCaretGeometry(layout, "Heading".length);

    expect(headingMidCaret).not.toBeNull();
    expect(headingEndCaret).not.toBeNull();
    expect(headingEndCaret!.heightPx).toBe(headingMidCaret!.heightPx);
  });

  it("maps a page-local point back to a document offset", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "Alpha beta\ngamma delta" }],
      "Inter",
      12,
    );

    const firstLineOffset = getNvdOffsetAtPagePoint(layout, 0, 0, 0);
    const secondLineOffset = getNvdOffsetAtPagePoint(layout, 0, 0, 40);

    expect(firstLineOffset).toBe(0);
    expect(secondLineOffset).toBeGreaterThan("Alpha beta\n".length - 1);
  });

  it("moves a trailing heading to the next page with its following paragraph", () => {
    const layout = layoutNvdTextRuns(
      [{ text: "One\nTwo\nThree\nFour\nFive\nHeading\nBody" }],
      "Inter",
      12,
      [
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout({ kind: "h1", keepLinesTogether: true, keepWithNext: true }),
        createLayout(),
      ],
      {
        pageSize: "custom",
        widthPt: 200,
        heightPt: 100,
        marginTopPt: 14,
        marginRightPt: 20,
        marginBottomPt: 14,
        marginLeftPt: 20,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0].text).toBe("One\nTwo\nThree\nFour\nFive\n");
    expect(layout.pages[1].text).toBe("Heading\nBody");
  });

  it("allows a keep-together paragraph to span pages when it no longer fits on a single page", () => {
    const keptParagraph = "This paragraph should stay together and wrap onto multiple visual lines.";
    const layout = layoutNvdTextRuns(
      [{ text: `One\nTwo\nThree\nFour\nFive\n${keptParagraph}` }],
      "Inter",
      12,
      [
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout({ keepLinesTogether: true }),
      ],
      {
        pageSize: "custom",
        widthPt: 90,
        heightPt: 100,
        marginTopPt: 14,
        marginRightPt: 10,
        marginBottomPt: 14,
        marginLeftPt: 10,
      },
    );

    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[0].text).toBe("One\nTwo\nThree\nFour\nFive\nThis ");
    expect(layout.pages[1].text).toContain("paragraph");
    expect(layout.pages[2].text).toBe("multiple visual lines.");
  });

  it("spans a constrained paragraph across additional pages when widow or orphan rules cannot be satisfied on one page", () => {
    const constrainedParagraph = "This paragraph wraps onto several lines when the content width is narrow.";
    const layout = layoutNvdTextRuns(
      [{ text: `One\nTwo\nThree\n${constrainedParagraph}` }],
      "Inter",
      12,
      [
        createLayout(),
        createLayout(),
        createLayout(),
        createLayout({ orphanLineCount: 2, widowLineCount: 2 }),
      ],
      {
        pageSize: "custom",
        widthPt: 90,
        heightPt: 90,
        marginTopPt: 14,
        marginRightPt: 10,
        marginBottomPt: 14,
        marginLeftPt: 10,
      },
    );

    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[0].text).toBe("One\nTwo\nThree\nThis paragraph ");
    expect(layout.pages[1].text).toBe("wraps onto several lines when the content ");
    expect(layout.pages[2].text).toBe("width is narrow.");
  });

  it("lays out embed blocks between text paragraphs and exposes block hit testing", () => {
    const layout = layoutNvdDocument({
      blocks: [
        {
          id: "intro",
          kind: "paragraph",
          text: "Intro paragraph before the image block.",
        },
        {
          id: "embed-1",
          kind: "embed",
          embed: {
            alignment: "center",
            assetId: 4,
            assetKind: "image",
            assetName: "Reference",
            assetPath: "workspace/reference.png",
            caption: "Figure 1",
            displayMode: "custom",
            heightPx: 180,
            widthPx: 240,
          },
        },
        {
          id: "outro",
          kind: "paragraph",
          text: "Outro paragraph after the image block.",
        },
      ],
      fontFamily: "Inter",
      fontSize: "12pt",
      pageLayout: DEFAULT_NVD_PAGE_LAYOUT,
      styles: DEFAULT_NVD_STYLE_DEFINITIONS,
    });

    const page = layout.pages[0];
    const embedFragment = page.embedFragments[0];
    const blockSelection = getNvdBlockSelectionGeometry(layout, "embed-1");
    const hitFragment = findNvdEmbedFragmentAtPagePoint(
      layout,
      page.index,
      embedFragment.leftPx + 12,
      embedFragment.topPx + 12,
    );

    expect(embedFragment).toBeDefined();
    expect(page.lines[0].topPx).toBeLessThan(embedFragment.topPx);
    expect(page.lines[page.lines.length - 1].topPx).toBeGreaterThan(embedFragment.topPx);
    expect(blockSelection).not.toBeNull();
    expect(blockSelection?.widthPx).toBe(embedFragment.widthPx);
    expect(hitFragment?.blockId).toBe("embed-1");
  });

  it("keeps a heading with its following embed when keep-with-next is enabled", () => {
    const layout = layoutNvdDocument({
      blocks: [
        {
          id: "body-a",
          kind: "paragraph",
          text: "One paragraph fills the top of the page a little more than a single word would.",
        },
        {
          id: "body-b",
          kind: "paragraph",
          text: "Two paragraph continues the body content so the heading should not be stranded below it.",
        },
        {
          id: "body-c",
          kind: "paragraph",
          text: "Three paragraph adds enough extra body copy that the heading and embed need to move as a pair.",
        },
        {
          id: "heading",
          keepLinesTogether: true,
          keepWithNext: true,
          kind: "heading",
          text: "Heading",
        },
        {
          id: "embed-2",
          kind: "embed",
          embed: {
            alignment: "center",
            assetId: 9,
            assetKind: "image",
            assetName: "Diagram",
            assetPath: "workspace/diagram.png",
            displayMode: "custom",
            heightPx: 160,
            widthPx: 220,
          },
        },
      ],
      fontFamily: "Inter",
      fontSize: "12pt",
      pageLayout: {
        pageSize: "custom",
        widthPt: 200,
        heightPt: 280,
        marginTopPt: 14,
        marginRightPt: 20,
        marginBottomPt: 14,
        marginLeftPt: 20,
      },
      styles: DEFAULT_NVD_STYLE_DEFINITIONS,
    });

    expect(layout.pages[0].text).toContain("One paragraph");
    expect(layout.pages[0].text).toContain("Two paragraph");
    expect(layout.pages[0].text).toContain("Three paragraph");
    expect(layout.pages[0].embedFragments).toHaveLength(0);
    const headingPage = layout.pages.find((page) => page.text.includes("Heading"));
    const embedPage = layout.pages.find((page) =>
      page.embedFragments.some((fragment) => fragment.blockId === "embed-2"),
    );

    expect(headingPage).toBeDefined();
    expect(embedPage).toBeDefined();
    expect(embedPage?.index).toBe(headingPage?.index);
  });
});
