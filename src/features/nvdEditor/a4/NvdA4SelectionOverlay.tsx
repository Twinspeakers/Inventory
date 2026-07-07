import type { NvdPageLayout } from "../../inventoryProject";
import { NVD_A4_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import {
  getNvdCaretGeometry,
  getNvdSelectionGeometry,
  type NvdDocumentLayoutSnapshot,
} from "../layout/nvdPageLayoutEngine";
import type { NvdTextSelection } from "../core/nvdRichText";

export function NvdA4SelectionOverlay({
  layout,
  pageLayout,
  selection,
}: {
  layout: NvdDocumentLayoutSnapshot;
  pageLayout: NvdPageLayout;
  selection: NvdTextSelection | null;
}) {
  if (!selection) {
    return null;
  }

  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const hasRange = selection.end > selection.start;
  const caret = !hasRange ? getNvdCaretGeometry(layout, selection.start) : null;
  const rects = hasRange ? getNvdSelectionGeometry(layout, selection.start, selection.end) : [];

  return (
    <div className="nvd-a4-selection-overlay" aria-hidden="true">
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
