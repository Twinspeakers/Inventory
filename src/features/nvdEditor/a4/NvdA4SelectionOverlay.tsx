import type { NvdPageLayout } from "../../inventoryProject";
import { NVD_A4_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import {
  getNvdBlockSelectionGeometry,
  getNvdCaretGeometry,
  getNvdSelectionGeometry,
  type NvdDocumentLayoutSnapshot,
} from "../layout/nvdPageLayoutEngine";
import type { NvdDocumentSelection } from "../document/nvdDocumentSelection";
import {
  isNvdBlockDocumentSelection,
  isNvdTextDocumentSelection,
} from "../document/nvdDocumentSelection";

export function NvdA4SelectionOverlay({
  layout,
  pageLayout,
  selection,
}: {
  layout: NvdDocumentLayoutSnapshot;
  pageLayout: NvdPageLayout;
  selection: NvdDocumentSelection | null;
}) {
  if (!selection) {
    return null;
  }

  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const textSelection = isNvdTextDocumentSelection(selection) ? selection.text : null;
  const blockSelection = isNvdBlockDocumentSelection(selection)
    ? getNvdBlockSelectionGeometry(layout, selection.blockId)
    : null;
  const hasRange = textSelection ? textSelection.end > textSelection.start : false;
  const caret =
    textSelection && !hasRange ? getNvdCaretGeometry(layout, textSelection.start) : null;
  const rects =
    textSelection && hasRange
      ? getNvdSelectionGeometry(layout, textSelection.start, textSelection.end)
      : [];

  return (
    <div className="nvd-a4-selection-overlay" aria-hidden="true">
      {blockSelection ? (
        <div
          className="nvd-a4-block-selection-rect"
          style={{
            height: `${blockSelection.heightPx}px`,
            left: `${pageLayoutPx.marginLeftPx + blockSelection.leftPx}px`,
            top: `${blockSelection.pageIndex * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX) + pageLayoutPx.marginTopPx + blockSelection.topPx}px`,
            width: `${blockSelection.widthPx}px`,
          }}
        />
      ) : null}
      {rects.map((rect) => (
        <div
          className="nvd-a4-selection-rect"
          key={`${rect.pageIndex}-${rect.lineIndex}-${rect.leftPx}-${rect.widthPx}`}
          style={{
            height: `${rect.heightPx}px`,
            left: `${pageLayoutPx.marginLeftPx + rect.leftPx}px`,
            top: `${rect.pageIndex * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX) + pageLayoutPx.marginTopPx + rect.topPx}px`,
            width: `${rect.widthPx}px`,
          }}
        />
      ))}
      {caret ? (
        <div
          className="nvd-a4-caret-overlay"
          style={{
            height: `${caret.heightPx}px`,
            left: `${pageLayoutPx.marginLeftPx + caret.leftPx}px`,
            top: `${caret.pageIndex * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX) + pageLayoutPx.marginTopPx + caret.topPx}px`,
          }}
        />
      ) : null}
    </div>
  );
}
