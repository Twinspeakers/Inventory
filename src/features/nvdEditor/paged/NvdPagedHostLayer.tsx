import { useEffect, useRef } from "react";
import { NVD_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdPageLayout } from "../../inventoryProject";
import {
  findNvdEmbedFragmentAtPagePoint,
  getNvdInsertionGeometry,
  getNvdInsertionIndexAtPagePoint,
  getNvdOffsetAtPagePoint,
  type NvdDocumentLayoutSnapshot,
  type NvdPageFragment,
} from "../layout/nvdPageLayoutEngine";
import type { NvdTextSelection } from "../document/nvdRichText";
import {
  createNvdInsertionDocumentSelection,
  type NvdDocumentSelection,
} from "../document/nvdDocumentSelection";

export function NvdPagedHostLayer({
  layout,
  onDocumentSelectionRequest,
  onPointerInteractionStart,
  onTextSelectionRequest,
  pageLayout,
  pages,
}: {
  layout: NvdDocumentLayoutSnapshot;
  onDocumentSelectionRequest: (selection: NvdDocumentSelection) => void;
  onPointerInteractionStart?: () => void;
  onTextSelectionRequest: (selection: NvdTextSelection) => void;
  pageLayout: NvdPageLayout;
  pages: readonly NvdPageFragment[];
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const dragAnimationTimestampRef = useRef<number | null>(null);
  const dragAnchorOffsetRef = useRef<number | null>(null);
  const dragPointerRef = useRef<{
    clientX: number;
    clientY: number;
    hostElement: HTMLDivElement;
    pointerId: number;
    scrollElement: HTMLElement | null;
  } | null>(null);

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, []);

  function getSelectionFromPointerEvent(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ): NvdTextSelection | NvdDocumentSelection {
    const bounds = element.getBoundingClientRect();
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const pageIndex = findPageIndexForLocalPoint(localY);
    const pageTopPx =
      pageIndex * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) + pageLayoutPx.marginTopPx;
    const leftPx = localX - pageLayoutPx.marginLeftPx;
    const topPx = localY - pageTopPx;
    const page = pages[pageIndex];
    const embedFragment = findNvdEmbedFragmentAtPagePoint(layout, pageIndex, leftPx, topPx);

    if (embedFragment) {
      return {
        blockId: embedFragment.blockId,
        kind: "block",
      };
    }

    const insertionIndex = getNvdInsertionIndexAtPagePoint(layout, pageIndex, topPx);
    const insertionGeometry = getNvdInsertionGeometry(layout, insertionIndex);

    if (!page || page.lines.length === 0 || Math.abs(topPx - insertionGeometry.topPx) <= 12) {
      return createNvdInsertionDocumentSelection(insertionIndex);
    }

    const offset = getNvdOffsetAtPagePoint(layout, pageIndex, leftPx, topPx);
    const anchorOffset = dragAnchorOffsetRef.current ?? offset;

    return {
      end: Math.max(anchorOffset, offset),
      start: Math.min(anchorOffset, offset),
    } satisfies NvdTextSelection;
  }

  function getTextSelectionFromPointerEvent(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ) {
    const bounds = element.getBoundingClientRect();
    const localX = clientX - bounds.left;
    const localY = clientY - bounds.top;
    const pageIndex = findPageIndexForLocalPoint(localY);
    const pageTopPx =
      pageIndex * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) + pageLayoutPx.marginTopPx;
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
    const pageSpanPx = pageLayoutPx.heightPx + NVD_PAGE_GAP_PX;
    const roughIndex = Math.floor(localY / pageSpanPx);
    return Math.min(Math.max(roughIndex, 0), Math.max(0, pages.length - 1));
  }

  function stopAutoScroll() {
    if (dragAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
    dragAnimationTimestampRef.current = null;
  }

  function stopTextDrag(hostElement?: HTMLDivElement | null, pointerId?: number) {
    stopAutoScroll();
    dragAnchorOffsetRef.current = null;
    dragPointerRef.current = null;

    if (hostElement && pointerId !== undefined && hostElement.hasPointerCapture(pointerId)) {
      hostElement.releasePointerCapture(pointerId);
    }
  }

  function updateTextSelectionFromDrag() {
    const dragPointer = dragPointerRef.current;

    if (!dragPointer || dragAnchorOffsetRef.current === null) {
      return;
    }

    onTextSelectionRequest(
      getTextSelectionFromPointerEvent(
        dragPointer.clientX,
        dragPointer.clientY,
        dragPointer.hostElement,
      ),
    );
  }

  function getAutoScrollVelocityPxPerSecond(
    clientY: number,
    scrollElement: HTMLElement,
  ) {
    const bounds = scrollElement.getBoundingClientRect();
    const edgeThresholdPx = Math.max(36, Math.min(96, bounds.height * 0.12));
    const maxVelocityPxPerSecond = 1400;

    if (clientY < bounds.top + edgeThresholdPx) {
      const intensity = Math.min(1, (bounds.top + edgeThresholdPx - clientY) / edgeThresholdPx);
      return -maxVelocityPxPerSecond * intensity * intensity;
    }

    if (clientY > bounds.bottom - edgeThresholdPx) {
      const intensity = Math.min(1, (clientY - (bounds.bottom - edgeThresholdPx)) / edgeThresholdPx);
      return maxVelocityPxPerSecond * intensity * intensity;
    }

    return 0;
  }

  function tickAutoScroll(timestamp: number) {
    const dragPointer = dragPointerRef.current;

    if (!dragPointer || dragAnchorOffsetRef.current === null || !dragPointer.scrollElement) {
      stopAutoScroll();
      return;
    }

    const deltaMs =
      dragAnimationTimestampRef.current === null
        ? 16
        : Math.min(32, timestamp - dragAnimationTimestampRef.current);
    dragAnimationTimestampRef.current = timestamp;

    const velocityPxPerSecond = getAutoScrollVelocityPxPerSecond(
      dragPointer.clientY,
      dragPointer.scrollElement,
    );

    if (velocityPxPerSecond === 0) {
      stopAutoScroll();
      return;
    }

    const previousScrollTop = dragPointer.scrollElement.scrollTop;
    const nextScrollTop = Math.max(
      0,
      Math.min(
        dragPointer.scrollElement.scrollHeight - dragPointer.scrollElement.clientHeight,
        previousScrollTop + (velocityPxPerSecond * deltaMs) / 1000,
      ),
    );

    dragPointer.scrollElement.scrollTop = nextScrollTop;
    updateTextSelectionFromDrag();

    if (nextScrollTop === previousScrollTop) {
      stopAutoScroll();
      return;
    }

    dragAnimationFrameRef.current = window.requestAnimationFrame(tickAutoScroll);
  }

  function syncAutoScroll() {
    const dragPointer = dragPointerRef.current;

    if (!dragPointer || dragAnchorOffsetRef.current === null || !dragPointer.scrollElement) {
      stopAutoScroll();
      return;
    }

    if (getAutoScrollVelocityPxPerSecond(dragPointer.clientY, dragPointer.scrollElement) === 0) {
      stopAutoScroll();
      return;
    }

    if (dragAnimationFrameRef.current !== null) {
      return;
    }

    dragAnimationTimestampRef.current = null;
    dragAnimationFrameRef.current = window.requestAnimationFrame(tickAutoScroll);
  }

  return (
    <div
      className="nvd-paged-host-layer"
      onPointerDown={(event) => {
        onPointerInteractionStart?.();
        const selection = getSelectionFromPointerEvent(
          event.clientX,
          event.clientY,
          event.currentTarget,
        );
        if ("kind" in selection) {
          dragAnchorOffsetRef.current = null;
          onDocumentSelectionRequest(selection);
          event.preventDefault();
          return;
        }

        dragAnchorOffsetRef.current = selection.start;
        dragPointerRef.current = {
          clientX: event.clientX,
          clientY: event.clientY,
          hostElement: event.currentTarget,
          pointerId: event.pointerId,
          scrollElement: event.currentTarget.closest(".nvd-editor-stage"),
        };
        onTextSelectionRequest(selection);
        event.currentTarget.setPointerCapture(event.pointerId);
        syncAutoScroll();
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (
          dragAnchorOffsetRef.current === null ||
          !(event.buttons & 1) ||
          dragPointerRef.current?.pointerId !== event.pointerId
        ) {
          return;
        }

        dragPointerRef.current = {
          ...dragPointerRef.current,
          clientX: event.clientX,
          clientY: event.clientY,
          hostElement: event.currentTarget,
        };
        updateTextSelectionFromDrag();
        syncAutoScroll();
        event.preventDefault();
      }}
      onPointerUp={(event) => {
        stopTextDrag(event.currentTarget, event.pointerId);
        event.preventDefault();
      }}
      onPointerCancel={(event) => {
        stopTextDrag(event.currentTarget, event.pointerId);
        event.preventDefault();
      }}
    >
      {pages.map((page) => (
        <div
          className="nvd-paged-host"
          key={page.index}
          style={{
            height: `${pageLayoutPx.contentHeightPx}px`,
            left: `${pageLayoutPx.marginLeftPx}px`,
            top: `${page.index * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) + pageLayoutPx.marginTopPx}px`,
            width: `${pageLayoutPx.contentWidthPx}px`,
          }}
        />
      ))}
    </div>
  );
}
