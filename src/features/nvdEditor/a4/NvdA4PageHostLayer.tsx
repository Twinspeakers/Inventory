import { useRef } from "react";
import { NVD_A4_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdPageLayout } from "../../inventoryProject";
import {
  getNvdOffsetAtPagePoint,
  type NvdDocumentLayoutSnapshot,
  type NvdPageFragment,
} from "../layout/nvdPageLayoutEngine";
import type { NvdTextSelection } from "../document/nvdRichText";

export function NvdA4PageHostLayer({
  layout,
  onPointerInteractionStart,
  onSelectionRequest,
  pageLayout,
  pages,
}: {
  layout: NvdDocumentLayoutSnapshot;
  onPointerInteractionStart?: () => void;
  onSelectionRequest: (selection: NvdTextSelection) => void;
  pageLayout: NvdPageLayout;
  pages: readonly NvdPageFragment[];
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const dragAnchorOffsetRef = useRef<number | null>(null);

  function getSelectionFromPointerEvent(clientX: number, clientY: number, element: HTMLDivElement) {
    const bounds = element.getBoundingClientRect();
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const pageIndex = findPageIndexForLocalPoint(localY);
    const pageTopPx =
      pageIndex * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX) + pageLayoutPx.marginTopPx;
    const leftPx = localX - pageLayoutPx.marginLeftPx;
    const topPx = localY - pageTopPx;
    const offset = getNvdOffsetAtPagePoint(layout, pageIndex, leftPx, topPx);
    const anchorOffset = dragAnchorOffsetRef.current ?? offset;

    return {
      end: Math.max(anchorOffset, offset),
      start: Math.min(anchorOffset, offset),
    } satisfies NvdTextSelection;
  }

  function findPageIndexForLocalPoint(localY: number) {
    const pageSpanPx = pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX;
    const roughIndex = Math.floor(localY / pageSpanPx);
    return Math.min(Math.max(roughIndex, 0), Math.max(0, pages.length - 1));
  }

  return (
    <div
      className="nvd-a4-page-host-layer"
      onPointerDown={(event) => {
        onPointerInteractionStart?.();
        const selection = getSelectionFromPointerEvent(
          event.clientX,
          event.clientY,
          event.currentTarget,
        );
        dragAnchorOffsetRef.current = selection.start;
        onSelectionRequest(selection);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (dragAnchorOffsetRef.current === null || !(event.buttons & 1)) {
          return;
        }

        onSelectionRequest(
          getSelectionFromPointerEvent(
            event.clientX,
            event.clientY,
            event.currentTarget,
          ),
        );
        event.preventDefault();
      }}
      onPointerUp={(event) => {
        dragAnchorOffsetRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        event.preventDefault();
      }}
    >
      {pages.map((page) => (
        <div
          className="nvd-a4-page-host"
          key={page.index}
          style={{
            height: `${pageLayoutPx.contentHeightPx}px`,
            left: `${pageLayoutPx.marginLeftPx}px`,
            top: `${page.index * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX) + pageLayoutPx.marginTopPx}px`,
            width: `${pageLayoutPx.contentWidthPx}px`,
          }}
        />
      ))}
    </div>
  );
}
