import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { NVD_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdPageLayout, NvdPageObject } from "../../inventoryProject";
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
import type { NvdPageObjectToolMode } from "../contracts/NvdEditorController";
import {
  getNvdPageObjectRotationDeg,
  type NvdDraftPageObject,
} from "../document/nvdPageObjectModel";

type NvdPageObjectResizeHandle =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

type NvdPageObjectInteraction =
  | {
      mode: "move";
      objectId: string;
      pageObject: NvdPageObject;
      pointerId: number;
      pointerOffsetX: number;
      pointerOffsetY: number;
    }
  | {
      mode: "resize";
      objectId: string;
      pageObject: NvdPageObject;
      pointerId: number;
      resizeHandle: NvdPageObjectResizeHandle;
      startLocalX: number;
      startLocalY: number;
    }
  | {
      mode: "rotate";
      objectId: string;
      pageObject: NvdPageObject;
      pointerId: number;
      startPointerAngleDeg: number;
      startRotationDeg: number;
    };

type NvdSnapGuide = {
  axis: "x" | "y";
  lengthPx: number;
  positionPx: number;
  startPx: number;
};

type NvdPageObjectHit = {
  mode: "move" | "resize" | "rotate";
  pageObject: NvdPageObject;
  resizeHandle: NvdPageObjectResizeHandle | null;
};

type NvdPagePoint = {
  pageIndex: number;
  xPx: number;
  yPx: number;
};

const NVD_PAGE_OBJECT_MIN_SIZE_PX = 24;
const NVD_PAGE_OBJECT_SNAP_DISTANCE_PX = 8;
const NVD_PAGE_OBJECT_ROTATION_SNAP_DEG = 15;
const NVD_PAGE_OBJECT_ROTATION_SNAP_THRESHOLD_DEG = 4;
const NVD_PAGE_OBJECT_ROTATION_HANDLE_OFFSET_PX = 36;
const NVD_PAGE_OBJECT_ROTATION_HANDLE_RADIUS_PX = 8;

export function NvdPagedHostLayer({
  draftPageObject,
  layout,
  onDocumentSelectionRequest,
  onDraftPageObjectChange,
  onPageObjectPreviewChange,
  onPageObjectSelectionRequest,
  onPageObjectTransformCancel,
  onPageObjectTransformCommit,
  onPointerInteractionStart,
  onTextSelectionRequest,
  pageObjects,
  pageObjectToolMode,
  pageLayout,
  pages,
  selectedPageObjectId,
}: {
  draftPageObject: NvdDraftPageObject | null;
  layout: NvdDocumentLayoutSnapshot;
  onDocumentSelectionRequest: (selection: NvdDocumentSelection) => void;
  onDraftPageObjectChange: (draft: NvdDraftPageObject | null) => void;
  onPageObjectPreviewChange: (objectId: string, pageObject: NvdPageObject) => void;
  onPageObjectSelectionRequest: (objectId: string) => void;
  onPageObjectTransformCancel: () => void;
  onPageObjectTransformCommit: (objectId: string, pageObject: NvdPageObject) => void;
  onPointerInteractionStart?: () => void;
  onTextSelectionRequest: (selection: NvdTextSelection) => void;
  pageObjects: readonly NvdPageObject[];
  pageObjectToolMode: NvdPageObjectToolMode;
  pageLayout: NvdPageLayout;
  pages: readonly NvdPageFragment[];
  selectedPageObjectId: string | null;
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
  const draftDragRef = useRef<{
    pageIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const pageObjectInteractionRef = useRef<NvdPageObjectInteraction | null>(null);
  const [pointerCursor, setPointerCursor] = useState("auto");
  const [snapGuides, setSnapGuides] = useState<NvdSnapGuide[]>([]);

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

  function stopDraftDrag(hostElement?: HTMLDivElement | null, pointerId?: number) {
    draftDragRef.current = null;

    if (hostElement && pointerId !== undefined && hostElement.hasPointerCapture(pointerId)) {
      hostElement.releasePointerCapture(pointerId);
    }
  }

  function stopPageObjectInteraction(
    hostElement?: HTMLDivElement | null,
    pointerId?: number,
  ) {
    pageObjectInteractionRef.current = null;
    setSnapGuides([]);

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

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function getLocalPoint(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ) {
    const bounds = element.getBoundingClientRect();
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  }

  function getPagePointForLocalPoint(
    localPoint: { x: number; y: number },
    pageIndex: number,
  ): NvdPagePoint {
    return {
      pageIndex,
      xPx: localPoint.x - pageLayoutPx.marginLeftPx,
      yPx: localPoint.y - getPageContentTopPx(pageIndex),
    };
  }

  function getClampedDraftPoint(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
    pageIndex?: number,
  ) {
    const localPoint = getLocalPoint(clientX, clientY, element);
    const resolvedPageIndex = pageIndex ?? findPageIndexForLocalPoint(localPoint.y);
    const pagePoint = getPagePointForLocalPoint(localPoint, resolvedPageIndex);

    return {
      pageIndex: resolvedPageIndex,
      xPx: clamp(pagePoint.xPx, 0, pageLayoutPx.contentWidthPx),
      yPx: clamp(pagePoint.yPx, 0, pageLayoutPx.contentHeightPx),
    };
  }

  function getPageContentTopPx(pageIndex: number) {
    return pageIndex * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) + pageLayoutPx.marginTopPx;
  }

  function getPageObjectDocumentTopPx(pageObject: NvdPageObject) {
    return getPageContentTopPx(pageObject.pageIndex) + pageObject.yPx;
  }

  function getPageObjectCenterLocalPoint(pageObject: NvdPageObject) {
    return {
      x: pageLayoutPx.marginLeftPx + pageObject.xPx + pageObject.widthPx / 2,
      y: getPageObjectDocumentTopPx(pageObject) + pageObject.heightPx / 2,
    };
  }

  function resolvePagePositionForDocumentTop(
    documentTopPx: number,
    objectHeightPx: number,
  ) {
    const maximumTopByPage = pages.map((_, pageIndex) => ({
      maxTopPx:
        getPageContentTopPx(pageIndex) +
        Math.max(0, pageLayoutPx.contentHeightPx - objectHeightPx),
      minTopPx: getPageContentTopPx(pageIndex),
      pageIndex,
    }));

    if (maximumTopByPage.length === 0) {
      return {
        pageIndex: 0,
        yPx: 0,
      };
    }

    let bestMatch = maximumTopByPage[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of maximumTopByPage) {
      const clampedTopPx = clamp(documentTopPx, candidate.minTopPx, candidate.maxTopPx);
      const distance = Math.abs(documentTopPx - clampedTopPx);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }

    const resolvedTopPx = clamp(
      documentTopPx,
      bestMatch.minTopPx,
      bestMatch.maxTopPx,
    );

    return {
      pageIndex: bestMatch.pageIndex,
      yPx: resolvedTopPx - getPageContentTopPx(bestMatch.pageIndex),
    };
  }

  function getPageObjectLocalPoint(pageObject: NvdPageObject, pagePoint: NvdPagePoint) {
    const rotationDeg = getNvdPageObjectRotationDeg(pageObject);

    if (rotationDeg === 0) {
      return {
        xPx: pagePoint.xPx - pageObject.xPx,
        yPx: pagePoint.yPx - pageObject.yPx,
      };
    }

    const radians = (rotationDeg * Math.PI) / 180;
    const dx = pagePoint.xPx - (pageObject.xPx + pageObject.widthPx / 2);
    const dy = pagePoint.yPx - (pageObject.yPx + pageObject.heightPx / 2);

    return {
      xPx:
        dx * Math.cos(radians) +
        dy * Math.sin(radians) +
        pageObject.widthPx / 2,
      yPx:
        -dx * Math.sin(radians) +
        dy * Math.cos(radians) +
        pageObject.heightPx / 2,
    };
  }

  function isPointInsidePageObject(
    pageObject: NvdPageObject,
    pagePoint: NvdPagePoint,
  ) {
    const localPoint = getPageObjectLocalPoint(pageObject, pagePoint);

    return (
      localPoint.xPx >= 0 &&
      localPoint.xPx <= pageObject.widthPx &&
      localPoint.yPx >= 0 &&
      localPoint.yPx <= pageObject.heightPx
    );
  }

  function isPointOnRotationHandle(
    pageObject: NvdPageObject,
    pagePoint: NvdPagePoint,
  ) {
    const localPoint = getPageObjectLocalPoint(pageObject, pagePoint);

    return (
      Math.abs(localPoint.xPx - pageObject.widthPx / 2) <= NVD_PAGE_OBJECT_ROTATION_HANDLE_RADIUS_PX &&
      Math.abs(localPoint.yPx + NVD_PAGE_OBJECT_ROTATION_HANDLE_OFFSET_PX) <= NVD_PAGE_OBJECT_ROTATION_HANDLE_RADIUS_PX
    );
  }

  function getResizeHandleAtPoint(
    pageObject: NvdPageObject,
    pagePoint: NvdPagePoint,
  ): NvdPageObjectResizeHandle | null {
    const localPoint = getPageObjectLocalPoint(pageObject, pagePoint);
    const thresholdPx = 10;
    const nearLeft = Math.abs(localPoint.xPx) <= thresholdPx;
    const nearRight = Math.abs(localPoint.xPx - pageObject.widthPx) <= thresholdPx;
    const nearTop = Math.abs(localPoint.yPx) <= thresholdPx;
    const nearBottom = Math.abs(localPoint.yPx - pageObject.heightPx) <= thresholdPx;
    const withinHorizontalBand =
      localPoint.xPx >= -thresholdPx &&
      localPoint.xPx <= pageObject.widthPx + thresholdPx;
    const withinVerticalBand =
      localPoint.yPx >= -thresholdPx &&
      localPoint.yPx <= pageObject.heightPx + thresholdPx;

    if (nearTop && nearLeft) return "nw";
    if (nearTop && nearRight) return "ne";
    if (nearBottom && nearRight) return "se";
    if (nearBottom && nearLeft) return "sw";
    if (nearTop && withinHorizontalBand) return "n";
    if (nearBottom && withinHorizontalBand) return "s";
    if (nearRight && withinVerticalBand) return "e";
    if (nearLeft && withinVerticalBand) return "w";

    return null;
  }

  function findPageObjectHit(localPoint: { x: number; y: number }): NvdPageObjectHit | null {
    for (let index = pageObjects.length - 1; index >= 0; index -= 1) {
      const pageObject = pageObjects[index];
      const pagePoint = getPagePointForLocalPoint(localPoint, pageObject.pageIndex);

      if (
        pageObject.id === selectedPageObjectId &&
        isPointOnRotationHandle(pageObject, pagePoint)
      ) {
        return {
          mode: "rotate",
          pageObject,
          resizeHandle: null,
        };
      }

      const resizeHandle =
        pageObject.id === selectedPageObjectId
          ? getResizeHandleAtPoint(pageObject, pagePoint)
          : null;

      if (resizeHandle) {
        return {
          mode: "resize",
          pageObject,
          resizeHandle,
        };
      }

      if (isPointInsidePageObject(pageObject, pagePoint)) {
        return {
          mode: "move",
          pageObject,
          resizeHandle: null,
        };
      }
    }

    return null;
  }

  function getCursorForResizeHandle(handle: NvdPageObjectResizeHandle | null) {
    if (handle === "n" || handle === "s") return "ns-resize";
    if (handle === "e" || handle === "w") return "ew-resize";
    if (handle === "ne" || handle === "sw") return "nesw-resize";
    if (handle === "nw" || handle === "se") return "nwse-resize";
    return "move";
  }

  function resolvePageObjectCursor(localPoint: { x: number; y: number }) {
    const hit = findPageObjectHit(localPoint);

    if (!hit) {
      return "auto";
    }

    if (hit.mode === "rotate") {
      return "crosshair";
    }

    if (hit.mode === "resize") {
      return getCursorForResizeHandle(hit.resizeHandle);
    }

    return "move";
  }

  function updatePointerCursor(nextCursor: string) {
    setPointerCursor((currentCursor) =>
      currentCursor === nextCursor ? currentCursor : nextCursor,
    );
  }

  function buildSnapGuide(
    axis: "x" | "y",
    pageIndex: number,
    targetPx: number,
  ): NvdSnapGuide {
    if (axis === "x") {
      return {
        axis: "x",
        lengthPx: pageLayoutPx.contentHeightPx,
        positionPx: pageLayoutPx.marginLeftPx + targetPx,
        startPx: getPageContentTopPx(pageIndex),
      };
    }

    return {
      axis: "y",
      lengthPx: pageLayoutPx.contentWidthPx,
      positionPx: getPageContentTopPx(pageIndex) + targetPx,
      startPx: pageLayoutPx.marginLeftPx,
    };
  }

  function resolveSnapAdjustment(
    candidates: readonly number[],
    targets: readonly number[],
  ) {
    let bestDelta = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestTarget = 0;

    for (const candidate of candidates) {
      for (const target of targets) {
        const delta = target - candidate;
        const distance = Math.abs(delta);

        if (
          distance <= NVD_PAGE_OBJECT_SNAP_DISTANCE_PX &&
          distance < bestDistance
        ) {
          bestDelta = delta;
          bestDistance = distance;
          bestTarget = target;
        }
      }
    }

    if (!Number.isFinite(bestDistance)) {
      return null;
    }

    return {
      delta: bestDelta,
      targetPx: bestTarget,
    };
  }

  function applyMoveSnapping(
    pageObject: NvdPageObject,
    xPx: number,
    yPx: number,
    pageIndex: number,
    disableSnap: boolean,
  ) {
    let nextXPx = xPx;
    let nextYPx = yPx;
    const guides: NvdSnapGuide[] = [];

    if (disableSnap) {
      return {
        guides,
        xPx: nextXPx,
        yPx: nextYPx,
      };
    }

    const horizontalTargets = [0, pageLayoutPx.contentWidthPx / 2, pageLayoutPx.contentWidthPx];
    const verticalTargets = [0, pageLayoutPx.contentHeightPx / 2, pageLayoutPx.contentHeightPx];
    const horizontalSnap = resolveSnapAdjustment(
      [
        nextXPx,
        nextXPx + pageObject.widthPx / 2,
        nextXPx + pageObject.widthPx,
      ],
      horizontalTargets,
    );

    if (horizontalSnap) {
      nextXPx = clamp(
        nextXPx + horizontalSnap.delta,
        0,
        Math.max(0, pageLayoutPx.contentWidthPx - pageObject.widthPx),
      );
      guides.push(buildSnapGuide("x", pageIndex, horizontalSnap.targetPx));
    }

    const verticalSnap = resolveSnapAdjustment(
      [
        nextYPx,
        nextYPx + pageObject.heightPx / 2,
        nextYPx + pageObject.heightPx,
      ],
      verticalTargets,
    );

    if (verticalSnap) {
      nextYPx = clamp(
        nextYPx + verticalSnap.delta,
        0,
        Math.max(0, pageLayoutPx.contentHeightPx - pageObject.heightPx),
      );
      guides.push(buildSnapGuide("y", pageIndex, verticalSnap.targetPx));
    }

    return {
      guides,
      xPx: nextXPx,
      yPx: nextYPx,
    };
  }

  function snapRotationDeg(rotationDeg: number, disableSnap: boolean) {
    if (disableSnap) {
      return normalizeRotationDeg(rotationDeg);
    }

    const normalizedRotationDeg = normalizeRotationDeg(rotationDeg);
    const snappedRotationDeg =
      Math.round(normalizedRotationDeg / NVD_PAGE_OBJECT_ROTATION_SNAP_DEG) *
      NVD_PAGE_OBJECT_ROTATION_SNAP_DEG;

    if (
      Math.abs(normalizeRotationDeg(normalizedRotationDeg - snappedRotationDeg)) <=
      NVD_PAGE_OBJECT_ROTATION_SNAP_THRESHOLD_DEG
    ) {
      return normalizeRotationDeg(snappedRotationDeg);
    }

    return normalizedRotationDeg;
  }

  function updatePageObjectFromPointerEvent(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const interaction = pageObjectInteractionRef.current;

    if (!interaction) {
      return null;
    }

    if (interaction.mode === "move") {
      const localPoint = getLocalPoint(event.clientX, event.clientY, event.currentTarget);
      const proposedDocumentTopPx = localPoint.y - interaction.pointerOffsetY;
      const resolvedPosition = resolvePagePositionForDocumentTop(
        proposedDocumentTopPx,
        interaction.pageObject.heightPx,
      );
      const proposedXPx = clamp(
        localPoint.x - pageLayoutPx.marginLeftPx - interaction.pointerOffsetX,
        0,
        Math.max(0, pageLayoutPx.contentWidthPx - interaction.pageObject.widthPx),
      );
      const snappedMove = applyMoveSnapping(
        interaction.pageObject,
        proposedXPx,
        resolvedPosition.yPx,
        resolvedPosition.pageIndex,
        event.altKey,
      );

      setSnapGuides(snappedMove.guides);

      return {
        ...interaction.pageObject,
        pageIndex: resolvedPosition.pageIndex,
        xPx: snappedMove.xPx,
        yPx: snappedMove.yPx,
      } satisfies NvdPageObject;
    }

    if (interaction.mode === "rotate") {
      const centerPoint = getPageObjectCenterLocalPoint(interaction.pageObject);
      const pointerPoint = getLocalPoint(event.clientX, event.clientY, event.currentTarget);
      const currentPointerAngleDeg =
        (Math.atan2(pointerPoint.y - centerPoint.y, pointerPoint.x - centerPoint.x) * 180) /
        Math.PI;
      const nextRotationDeg = snapRotationDeg(
        interaction.startRotationDeg +
          (currentPointerAngleDeg - interaction.startPointerAngleDeg),
        event.altKey,
      );

      setSnapGuides([]);

      return {
        ...interaction.pageObject,
        rotationDeg: nextRotationDeg,
      } satisfies NvdPageObject;
    }

    const currentPoint = getClampedDraftPoint(
      event.clientX,
      event.clientY,
      event.currentTarget,
      interaction.pageObject.pageIndex,
    );
    const currentLocalPoint = getPageObjectLocalPoint(interaction.pageObject, currentPoint);
    const deltaX = currentLocalPoint.xPx - interaction.startLocalX;
    const deltaY = currentLocalPoint.yPx - interaction.startLocalY;
    let leftPx = interaction.pageObject.xPx;
    let topPx = interaction.pageObject.yPx;
    let rightPx = interaction.pageObject.xPx + interaction.pageObject.widthPx;
    let bottomPx = interaction.pageObject.yPx + interaction.pageObject.heightPx;

    if (interaction.resizeHandle.includes("w")) {
      leftPx = clamp(leftPx + deltaX, 0, rightPx - NVD_PAGE_OBJECT_MIN_SIZE_PX);
    }

    if (interaction.resizeHandle.includes("e")) {
      rightPx = clamp(
        rightPx + deltaX,
        leftPx + NVD_PAGE_OBJECT_MIN_SIZE_PX,
        pageLayoutPx.contentWidthPx,
      );
    }

    if (interaction.resizeHandle.includes("n")) {
      topPx = clamp(topPx + deltaY, 0, bottomPx - NVD_PAGE_OBJECT_MIN_SIZE_PX);
    }

    if (interaction.resizeHandle.includes("s")) {
      bottomPx = clamp(
        bottomPx + deltaY,
        topPx + NVD_PAGE_OBJECT_MIN_SIZE_PX,
        pageLayoutPx.contentHeightPx,
      );
    }

    const guides: NvdSnapGuide[] = [];

    if (!event.altKey) {
      const horizontalTargets = [0, pageLayoutPx.contentWidthPx / 2, pageLayoutPx.contentWidthPx];
      const verticalTargets = [0, pageLayoutPx.contentHeightPx / 2, pageLayoutPx.contentHeightPx];

      if (interaction.resizeHandle.includes("w")) {
        const snap = resolveSnapAdjustment([leftPx], horizontalTargets);

        if (snap) {
          leftPx = clamp(
            leftPx + snap.delta,
            0,
            rightPx - NVD_PAGE_OBJECT_MIN_SIZE_PX,
          );
          guides.push(buildSnapGuide("x", interaction.pageObject.pageIndex, snap.targetPx));
        }
      }

      if (interaction.resizeHandle.includes("e")) {
        const snap = resolveSnapAdjustment([rightPx], horizontalTargets);

        if (snap) {
          rightPx = clamp(
            rightPx + snap.delta,
            leftPx + NVD_PAGE_OBJECT_MIN_SIZE_PX,
            pageLayoutPx.contentWidthPx,
          );
          guides.push(buildSnapGuide("x", interaction.pageObject.pageIndex, snap.targetPx));
        }
      }

      if (interaction.resizeHandle.includes("n")) {
        const snap = resolveSnapAdjustment([topPx], verticalTargets);

        if (snap) {
          topPx = clamp(
            topPx + snap.delta,
            0,
            bottomPx - NVD_PAGE_OBJECT_MIN_SIZE_PX,
          );
          guides.push(buildSnapGuide("y", interaction.pageObject.pageIndex, snap.targetPx));
        }
      }

      if (interaction.resizeHandle.includes("s")) {
        const snap = resolveSnapAdjustment([bottomPx], verticalTargets);

        if (snap) {
          bottomPx = clamp(
            bottomPx + snap.delta,
            topPx + NVD_PAGE_OBJECT_MIN_SIZE_PX,
            pageLayoutPx.contentHeightPx,
          );
          guides.push(buildSnapGuide("y", interaction.pageObject.pageIndex, snap.targetPx));
        }
      }
    }

    setSnapGuides(guides);

    return {
      ...interaction.pageObject,
      heightPx: Math.max(NVD_PAGE_OBJECT_MIN_SIZE_PX, bottomPx - topPx),
      widthPx: Math.max(NVD_PAGE_OBJECT_MIN_SIZE_PX, rightPx - leftPx),
      xPx: leftPx,
      yPx: topPx,
    } satisfies NvdPageObject;
  }

  function updateDraftFromPointerEvent(
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ) {
    const draftDrag = draftDragRef.current;

    if (!draftDrag) {
      return;
    }

    const currentPoint = getClampedDraftPoint(
      clientX,
      clientY,
      element,
      draftDrag.pageIndex,
    );
    onDraftPageObjectChange({
      heightPx: Math.abs(currentPoint.yPx - draftDrag.startY),
      pageIndex: draftDrag.pageIndex,
      widthPx: Math.abs(currentPoint.xPx - draftDrag.startX),
      xPx: Math.min(draftDrag.startX, currentPoint.xPx),
      yPx: Math.min(draftDrag.startY, currentPoint.yPx),
    });
  }

  return (
    <div
      className="nvd-paged-host-layer"
      style={{ cursor: pageObjectToolMode === "frame" ? "crosshair" : pointerCursor }}
      onPointerDown={(event) => {
        const pointerPoint = getClampedDraftPoint(
          event.clientX,
          event.clientY,
          event.currentTarget,
        );
        const localPoint = getLocalPoint(event.clientX, event.clientY, event.currentTarget);
        const pageObjectHit = findPageObjectHit(localPoint);

        if (pageObjectToolMode === "frame") {
          if (pageObjectHit) {
            onDraftPageObjectChange(null);
            onPageObjectSelectionRequest(pageObjectHit.pageObject.id);
            event.preventDefault();
            return;
          }

          draftDragRef.current = {
            pageIndex: pointerPoint.pageIndex,
            pointerId: event.pointerId,
            startX: pointerPoint.xPx,
            startY: pointerPoint.yPx,
          };
          onDraftPageObjectChange({
            heightPx: 0,
            pageIndex: pointerPoint.pageIndex,
            widthPx: 0,
            xPx: pointerPoint.xPx,
            yPx: pointerPoint.yPx,
          });
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
          return;
        }

        if (pageObjectHit) {
          if (pageObjectHit.mode === "rotate") {
            const centerPoint = getPageObjectCenterLocalPoint(pageObjectHit.pageObject);
            pageObjectInteractionRef.current = {
              mode: "rotate",
              objectId: pageObjectHit.pageObject.id,
              pageObject: pageObjectHit.pageObject,
              pointerId: event.pointerId,
              startPointerAngleDeg:
                (Math.atan2(localPoint.y - centerPoint.y, localPoint.x - centerPoint.x) * 180) /
                Math.PI,
              startRotationDeg: getNvdPageObjectRotationDeg(pageObjectHit.pageObject),
            };
            setSnapGuides([]);
            onDraftPageObjectChange(null);
            onPageObjectSelectionRequest(pageObjectHit.pageObject.id);
            updatePointerCursor("crosshair");
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            return;
          }

          if (pageObjectHit.mode === "resize" && pageObjectHit.resizeHandle) {
            const pagePoint = getPagePointForLocalPoint(localPoint, pageObjectHit.pageObject.pageIndex);
            const localObjectPoint = getPageObjectLocalPoint(pageObjectHit.pageObject, pagePoint);

            pageObjectInteractionRef.current = {
              mode: "resize",
              objectId: pageObjectHit.pageObject.id,
              pageObject: pageObjectHit.pageObject,
              pointerId: event.pointerId,
              resizeHandle: pageObjectHit.resizeHandle,
              startLocalX: localObjectPoint.xPx,
              startLocalY: localObjectPoint.yPx,
            };
            setSnapGuides([]);
            onDraftPageObjectChange(null);
            onPageObjectSelectionRequest(pageObjectHit.pageObject.id);
            updatePointerCursor(getCursorForResizeHandle(pageObjectHit.resizeHandle));
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            return;
          }

          pageObjectInteractionRef.current = {
            mode: "move",
            objectId: pageObjectHit.pageObject.id,
            pageObject: pageObjectHit.pageObject,
            pointerId: event.pointerId,
            pointerOffsetX:
              localPoint.x - (pageLayoutPx.marginLeftPx + pageObjectHit.pageObject.xPx),
            pointerOffsetY:
              localPoint.y - getPageObjectDocumentTopPx(pageObjectHit.pageObject),
          };
          setSnapGuides([]);
          onDraftPageObjectChange(null);
          onPageObjectSelectionRequest(pageObjectHit.pageObject.id);
          updatePointerCursor("move");
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
          return;
        }

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
        if (pageObjectInteractionRef.current?.pointerId === event.pointerId) {
          const nextPageObject = updatePageObjectFromPointerEvent(event);

          if (nextPageObject) {
            onPageObjectPreviewChange(nextPageObject.id, nextPageObject);
          }

          event.preventDefault();
          return;
        }

        if (draftDragRef.current?.pointerId === event.pointerId) {
          if (!(event.buttons & 1)) {
            stopDraftDrag(event.currentTarget, event.pointerId);
            return;
          }

          updateDraftFromPointerEvent(event.clientX, event.clientY, event.currentTarget);
          event.preventDefault();
          return;
        }

        if (!(event.buttons & 1)) {
          if (pageObjectToolMode === "frame") {
            updatePointerCursor("crosshair");
            return;
          }

          const hoverLocalPoint = getLocalPoint(
            event.clientX,
            event.clientY,
            event.currentTarget,
          );
          updatePointerCursor(resolvePageObjectCursor(hoverLocalPoint));
        }

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
        if (pageObjectInteractionRef.current?.pointerId === event.pointerId) {
          const nextPageObject = updatePageObjectFromPointerEvent(event);

          if (nextPageObject) {
            onPageObjectTransformCommit(nextPageObject.id, nextPageObject);
          } else {
            onPageObjectTransformCancel();
          }

          stopPageObjectInteraction(event.currentTarget, event.pointerId);
          updatePointerCursor("auto");
          event.preventDefault();
          return;
        }

        if (draftDragRef.current?.pointerId === event.pointerId) {
          const draft = draftPageObject;
          if (draft && (draft.widthPx < 8 || draft.heightPx < 8)) {
            onDraftPageObjectChange(null);
          }
          stopDraftDrag(event.currentTarget, event.pointerId);
          event.preventDefault();
          return;
        }

        stopTextDrag(event.currentTarget, event.pointerId);
        event.preventDefault();
      }}
      onPointerCancel={(event) => {
        if (pageObjectInteractionRef.current?.pointerId === event.pointerId) {
          onPageObjectTransformCancel();
          stopPageObjectInteraction(event.currentTarget, event.pointerId);
          updatePointerCursor("auto");
          event.preventDefault();
          return;
        }

        if (draftDragRef.current?.pointerId === event.pointerId) {
          onDraftPageObjectChange(null);
          stopDraftDrag(event.currentTarget, event.pointerId);
          event.preventDefault();
          return;
        }

        stopTextDrag(event.currentTarget, event.pointerId);
        event.preventDefault();
      }}
      onPointerLeave={() => {
        if (
          !pageObjectInteractionRef.current &&
          !draftDragRef.current &&
          dragAnchorOffsetRef.current === null
        ) {
          updatePointerCursor("auto");
        }
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
      {snapGuides.map((guide, index) => (
        <span
          className={`nvd-paged-snap-guide nvd-paged-snap-guide-${guide.axis}`}
          key={`${guide.axis}-${guide.positionPx}-${guide.startPx}-${index}`}
          style={
            guide.axis === "x"
              ? {
                  height: `${guide.lengthPx}px`,
                  left: `${guide.positionPx}px`,
                  top: `${guide.startPx}px`,
                }
              : {
                  left: `${guide.startPx}px`,
                  top: `${guide.positionPx}px`,
                  width: `${guide.lengthPx}px`,
                }
          }
        />
      ))}
    </div>
  );
}

function normalizeRotationDeg(value: number) {
  const normalizedValue = ((value % 360) + 360) % 360;
  return normalizedValue > 180 ? normalizedValue - 360 : normalizedValue;
}
