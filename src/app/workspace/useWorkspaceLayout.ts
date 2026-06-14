import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  COLLAPSED_SIDE_PANE_WIDTH,
  DEFAULT_LEFT_PANE_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  DEFAULT_SOURCE_SECTION_HEIGHT,
  MAX_LEFT_PANE_WIDTH,
  MAX_RIGHT_PANE_WIDTH,
  MAX_SOURCE_SECTION_HEIGHT,
  MIN_LEFT_PANE_WIDTH,
  MIN_MAIN_PANE_WIDTH,
  MIN_RIGHT_PANE_WIDTH,
  MIN_SOURCE_SECTION_HEIGHT,
  clamp,
  getWorkspaceGridWidth,
  isPrimaryPointer,
  layoutResizeEndEvent,
  layoutStorageKeys,
  readStoredBoolean,
  readStoredNumber,
  readStoredOptionalNumber,
  removeStoredNumber,
  storeNumber,
  storeString,
} from "../workspace/appLayout";
import {
  MIN_ASSET_SHELF_HEIGHT,
  MIN_PREVIEW_STAGE_HEIGHT,
} from "../../features/assetShelf";

export function useWorkspaceLayout(workspaceGridRef: RefObject<HTMLDivElement | null>) {
  const [leftPaneWidth, setLeftPaneWidth] = useState(() =>
    readStoredNumber(layoutStorageKeys.leftPaneWidth, DEFAULT_LEFT_PANE_WIDTH, MIN_LEFT_PANE_WIDTH, MAX_LEFT_PANE_WIDTH),
  );
  const [rightPaneWidth, setRightPaneWidth] = useState(() =>
    readStoredNumber(layoutStorageKeys.rightPaneWidth, DEFAULT_RIGHT_PANE_WIDTH, MIN_RIGHT_PANE_WIDTH, MAX_RIGHT_PANE_WIDTH),
  );
  const [leftPaneCollapsed, setLeftPaneCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.leftPaneCollapsed, false));
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.rightPaneCollapsed, false));
  const [assetShelfHeight, setAssetShelfHeight] = useState(() => readStoredOptionalNumber(layoutStorageKeys.assetShelfHeight, MIN_ASSET_SHELF_HEIGHT));
  const [assetShelfCollapsed, setAssetShelfCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.assetShelfCollapsed, false));
  const [sourceSectionHeight, setSourceSectionHeight] = useState(() =>
    readStoredNumber(layoutStorageKeys.sourceSectionHeight, DEFAULT_SOURCE_SECTION_HEIGHT, MIN_SOURCE_SECTION_HEIGHT, MAX_SOURCE_SECTION_HEIGHT),
  );
  const [sourceSectionCollapsed, setSourceSectionCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.sourceSectionCollapsed, false));

  const workspaceGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `${leftPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : leftPaneWidth}px minmax(${MIN_MAIN_PANE_WIDTH}px, 1fr) ${
        rightPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : rightPaneWidth
      }px`,
    }),
    [leftPaneCollapsed, leftPaneWidth, rightPaneCollapsed, rightPaneWidth],
  );

  useEffect(() => {
    storeNumber(layoutStorageKeys.leftPaneWidth, leftPaneWidth);
  }, [leftPaneWidth]);

  useEffect(() => {
    storeString(layoutStorageKeys.leftPaneCollapsed, leftPaneCollapsed ? "true" : "false");
  }, [leftPaneCollapsed]);

  useEffect(() => {
    storeNumber(layoutStorageKeys.rightPaneWidth, rightPaneWidth);
  }, [rightPaneWidth]);

  useEffect(() => {
    storeString(layoutStorageKeys.rightPaneCollapsed, rightPaneCollapsed ? "true" : "false");
  }, [rightPaneCollapsed]);

  useEffect(() => {
    storeNumber(layoutStorageKeys.sourceSectionHeight, sourceSectionHeight);
  }, [sourceSectionHeight]);

  useEffect(() => {
    storeString(layoutStorageKeys.sourceSectionCollapsed, sourceSectionCollapsed ? "true" : "false");
  }, [sourceSectionCollapsed]);

  useEffect(() => {
    if (assetShelfHeight !== null) {
      storeNumber(layoutStorageKeys.assetShelfHeight, assetShelfHeight);
    }
  }, [assetShelfHeight]);

  useEffect(() => {
    storeString(layoutStorageKeys.assetShelfCollapsed, assetShelfCollapsed ? "true" : "false");
  }, [assetShelfCollapsed]);

  function startLeftPaneResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event) || leftPaneCollapsed) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = leftPaneWidth;
    const workspaceWidth = getWorkspaceGridWidth(workspaceGridRef.current);
    const rightGridWidth = rightPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : rightPaneWidth;
    const maxWidth = Math.max(
      MIN_LEFT_PANE_WIDTH,
      Math.min(MAX_LEFT_PANE_WIDTH, workspaceWidth - rightGridWidth - MIN_MAIN_PANE_WIDTH),
    );

    document.body.classList.add("is-resizing-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLeftPaneWidth(clamp(startWidth + moveEvent.clientX - startX, MIN_LEFT_PANE_WIDTH, maxWidth));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-pane");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function startRightPaneResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event) || rightPaneCollapsed) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = rightPaneWidth;
    const workspaceWidth = getWorkspaceGridWidth(workspaceGridRef.current);
    const leftGridWidth = leftPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : leftPaneWidth;
    const maxWidth = Math.max(
      MIN_RIGHT_PANE_WIDTH,
      Math.min(MAX_RIGHT_PANE_WIDTH, workspaceWidth - leftGridWidth - MIN_MAIN_PANE_WIDTH),
    );

    document.body.classList.add("is-resizing-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setRightPaneWidth(clamp(startWidth - (moveEvent.clientX - startX), MIN_RIGHT_PANE_WIDTH, maxWidth));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-pane");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function startAssetShelfResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event) || assetShelfCollapsed) {
      return;
    }

    event.preventDefault();

    const shelfElement = event.currentTarget.closest("section");
    const workspaceElement = shelfElement?.parentElement;
    const workspaceHeight = workspaceElement?.getBoundingClientRect().height ?? window.innerHeight;
    const startY = event.clientY;
    const startHeight = shelfElement?.getBoundingClientRect().height ?? assetShelfHeight ?? 320;
    const maxHeight = Math.max(MIN_ASSET_SHELF_HEIGHT, workspaceHeight - MIN_PREVIEW_STAGE_HEIGHT);

    document.body.classList.add("is-resizing-row");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setAssetShelfHeight(clamp(startHeight - (moveEvent.clientY - startY), MIN_ASSET_SHELF_HEIGHT, maxHeight));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-row");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function resetAssetShelfHeight() {
    setAssetShelfHeight(null);
    removeStoredNumber(layoutStorageKeys.assetShelfHeight);
  }

  function toggleAssetShelfCollapsed() {
    setAssetShelfCollapsed((collapsed) => !collapsed);
  }

  function startSourceSectionResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();

    const startY = event.clientY;
    const startHeight = sourceSectionHeight;
    document.body.classList.add("is-resizing-row");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSourceSectionHeight(clamp(startHeight - (moveEvent.clientY - startY), MIN_SOURCE_SECTION_HEIGHT, MAX_SOURCE_SECTION_HEIGHT));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-row");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  return {
    assetShelfCollapsed,
    assetShelfHeight,
    leftPaneCollapsed,
    rightPaneCollapsed,
    sourceSectionCollapsed,
    sourceSectionHeight,
    setLeftPaneCollapsed,
    setLeftPaneWidth,
    setRightPaneCollapsed,
    setRightPaneWidth,
    setSourceSectionCollapsed,
    startAssetShelfResize,
    startLeftPaneResize,
    startRightPaneResize,
    startSourceSectionResize,
    resetAssetShelfHeight,
    toggleAssetShelfCollapsed,
    workspaceGridStyle,
  };
}

