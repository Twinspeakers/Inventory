import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  FilePlus2,
  FolderOpen,
  FolderSearch,
  LayoutGrid,
  ListFilter,
  Maximize2,
  Search,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import { AudioCardActions, isPlayableAudioAsset } from "../../sceneReaders/audioReader";
import type { OpenedNvdDocument } from "../inventoryProject";
import { AssetThumbnail } from "../sceneViewer";

type AssetShelfAssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type LibraryView =
  | "all"
  | "inbox"
  | "library-images"
  | "library-vector"
  | "library-audio"
  | "library-models"
  | "library-documents"
  | "library-archives"
  | "inventory-files"
  | "inventory-documents"
  | "inventory-vectors";
export type AssetSortKey = "name" | "type" | "modified" | "size";
export type SortDirection = "asc" | "desc";
export type AssetViewMode = "extra-large" | "large" | "medium" | "details";
export type DetailsColumnKey = "name" | "type" | "size" | "modified" | "tags";
export type DetailsColumnWidths = Record<DetailsColumnKey, number>;

export type AssetShelfAsset = {
  color: string;
  extension: string;
  id: number;
  modified: string;
  name: string;
  path: string;
  size: string;
  tags: string[];
  type: AssetShelfAssetType;
};

export const MIN_PREVIEW_STAGE_HEIGHT = 300;
export const MIN_ASSET_SHELF_HEIGHT = 180;
export const COLLAPSED_ASSET_SHELF_HEIGHT = 52;

export const detailsColumnKeys: DetailsColumnKey[] = ["name", "type", "size", "modified", "tags"];
const GRID_OVERSCAN_ROWS = 2;
const DETAILS_OVERSCAN_ROWS = 6;
const DETAILS_ROW_HEIGHT = 70;
const DETAILS_ROW_GAP = 4;
const ASSET_POINTER_DRAG_THRESHOLD_PX = 8;

export const defaultDetailsColumnWidths: DetailsColumnWidths = {
  name: 300,
  type: 110,
  size: 120,
  modified: 160,
  tags: 180,
};

export const detailsColumnMinWidths: DetailsColumnWidths = {
  name: 80,
  type: 42,
  size: 52,
  modified: 72,
  tags: 56,
};

export const detailsColumnMaxWidths: DetailsColumnWidths = {
  name: 720,
  type: 260,
  size: 260,
  modified: 320,
  tags: 520,
};

const assetSortOptions: Array<{ key: AssetSortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "modified", label: "Date modified" },
  { key: "size", label: "Size" },
];

const assetViewOptions: Array<{ icon: LucideIcon; label: string; mode: AssetViewMode }> = [
  { icon: Maximize2, label: "Large icons", mode: "extra-large" },
  { icon: LayoutGrid, label: "Small icons", mode: "medium" },
  { icon: TableProperties, label: "Details", mode: "details" },
];

const detailsColumnLabels: Record<DetailsColumnKey, string> = {
  name: "Name",
  type: "Type",
  size: "Size",
  modified: "Date modified",
  tags: "Tags",
};

export function AssetShelf<TAsset extends AssetShelfAsset>({
  activeView,
  activeFolderName,
  assetSortDirection,
  assetSortKey,
  assets,
  assetSearchQuery,
  canOpenFolder,
  collapsed,
  detailsColumnWidths,
  height,
  isScanning,
  nvdDocument,
  canStartAssetPointerDrag,
  onAssetSearchQueryChange,
  onAssetSortDirectionChange,
  onAssetSortKeyChange,
  onAssetPointerDragEnd,
  onAssetPointerDragMove,
  onAssetPointerDragStart,
  onAssetViewModeChange,
  onDetailsColumnWidthChange,
  onCreateNvdDocument,
  onOpenAssetContextMenu,
  onOpenFolder,
  onPlayAudio,
  onResizeStart,
  onResetHeight,
  onSelectAsset,
  onToggleCollapsed,
  selectedAsset,
  statusMessage,
  totalAssetCount,
  viewMode,
}: {
  activeView: LibraryView;
  activeFolderName: string | null;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assets: TAsset[];
  assetSearchQuery: string;
  canOpenFolder: boolean;
  collapsed: boolean;
  detailsColumnWidths: DetailsColumnWidths;
  height: number | null;
  isScanning: boolean;
  nvdDocument: OpenedNvdDocument | null;
  canStartAssetPointerDrag?: (asset: TAsset) => boolean;
  onAssetSearchQueryChange: (query: string) => void;
  onAssetSortDirectionChange: (direction: SortDirection) => void;
  onAssetSortKeyChange: (sortKey: AssetSortKey) => void;
  onAssetPointerDragEnd?: () => void;
  onAssetPointerDragMove?: (position: { clientX: number; clientY: number }) => void;
  onAssetPointerDragStart?: (asset: TAsset, position: { clientX: number; clientY: number }) => void;
  onAssetViewModeChange: (mode: AssetViewMode) => void;
  onDetailsColumnWidthChange: (columnKey: DetailsColumnKey, width: number) => void;
  onCreateNvdDocument: () => void;
  onOpenAssetContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onOpenFolder: () => void;
  onPlayAudio: (asset: TAsset) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetHeight: () => void;
  onSelectAsset: (id: number) => void;
  onToggleCollapsed: () => void;
  selectedAsset: TAsset | null;
  statusMessage: string;
  totalAssetCount: number;
  viewMode: AssetViewMode;
}) {
  const assetPointerGestureRef = useRef<{
    asset: TAsset;
    dragged: boolean;
    pointerId: number;
    teardown: () => void;
  } | null>(null);
  const shelfStyle = collapsed
    ? ({ height: COLLAPSED_ASSET_SHELF_HEIGHT, maxHeight: COLLAPSED_ASSET_SHELF_HEIGHT, minHeight: COLLAPSED_ASSET_SHELF_HEIGHT } satisfies CSSProperties)
    : height !== null
      ? ({ height, maxHeight: `calc(100% - ${MIN_PREVIEW_STAGE_HEIGHT}px)` } satisfies CSSProperties)
      : undefined;
  const SortDirectionIcon = assetSortDirection === "asc" ? ArrowUpAZ : ArrowDownAZ;
  const detailsGridTemplateColumns = detailsColumnKeys.map((key) => `${detailsColumnWidths[key]}px`).join(" ");
  const detailsGridMinWidth =
    detailsColumnKeys.reduce((total, key) => total + detailsColumnWidths[key], 0) + (detailsColumnKeys.length - 1) * 12;
  const detailsGridStyle = {
    gridTemplateColumns: detailsGridTemplateColumns,
  } satisfies CSSProperties;
  const detailsTableStyle = {
    minWidth: detailsGridMinWidth,
  } satisfies CSSProperties;
  const trimmedAssetSearchQuery = assetSearchQuery.trim();
  const isInventoryDocumentsView = activeView === "inventory-documents";
  const assetSummary = trimmedAssetSearchQuery
    ? `${assets.length} of ${totalAssetCount} asset${totalAssetCount === 1 ? "" : "s"} match`
    : assets.length > 0
      ? `${assets.length} asset${assets.length === 1 ? "" : "s"} in this view`
      : statusMessage;

  function startDetailsColumnResize(event: ReactPointerEvent<HTMLDivElement>, columnKey: DetailsColumnKey) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = detailsColumnWidths[columnKey];
    document.body.classList.add("is-resizing-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampNumber(
        startWidth + moveEvent.clientX - startX,
        detailsColumnMinWidths[columnKey],
        detailsColumnMaxWidths[columnKey],
      );
      onDetailsColumnWidthChange(columnKey, nextWidth);
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-pane");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  useEffect(() => {
    return () => {
      assetPointerGestureRef.current?.teardown();
      assetPointerGestureRef.current = null;
    };
  }, []);

  function finishAssetPointerGesture(cancelled: boolean) {
    const gesture = assetPointerGestureRef.current;

    if (!gesture) {
      return;
    }

    assetPointerGestureRef.current = null;
    gesture.teardown();

    if (gesture.dragged) {
      onAssetPointerDragEnd?.();
      return;
    }

    if (!cancelled) {
      onSelectAsset(gesture.asset.id);
    }
  }

  function handleAssetPointerDown(asset: TAsset, event: ReactPointerEvent<HTMLElement>) {
    if (
      !isPrimaryPointer(event) ||
      !canStartAssetPointerDrag?.(asset) ||
      !onAssetPointerDragStart ||
      !onAssetPointerDragMove
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    finishAssetPointerGesture(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const startAssetPointerDrag = onAssetPointerDragStart;
    const moveAssetPointerDrag = onAssetPointerDragMove;
    const thresholdPxSquared = ASSET_POINTER_DRAG_THRESHOLD_PX * ASSET_POINTER_DRAG_THRESHOLD_PX;
    const gesture = {
      asset,
      dragged: false,
      pointerId,
      teardown: () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        window.removeEventListener("blur", handleWindowBlur);
      },
    };

    function handlePointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      if (!gesture.dragged) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (deltaX * deltaX + deltaY * deltaY < thresholdPxSquared) {
          return;
        }

        gesture.dragged = true;
        startAssetPointerDrag(asset, {
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
        });
      }

      moveAssetPointerDrag({
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
      });
    }

    function handlePointerUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) {
        return;
      }

      if (gesture.dragged) {
        moveAssetPointerDrag({
          clientX: upEvent.clientX,
          clientY: upEvent.clientY,
        });
      }

      finishAssetPointerGesture(false);
    }

    function handlePointerCancel(cancelEvent: PointerEvent) {
      if (cancelEvent.pointerId !== pointerId) {
        return;
      }

      finishAssetPointerGesture(true);
    }

    function handleWindowBlur() {
      finishAssetPointerGesture(true);
    }

    assetPointerGestureRef.current = gesture;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleWindowBlur);
  }

  return (
    <section className="relative flex h-[28vh] min-h-[220px] max-h-[380px] shrink-0 flex-col overflow-hidden bg-canvas" style={shelfStyle}>
      {!collapsed ? (
        <div
          aria-label="Resize asset shelf"
          aria-orientation="horizontal"
          className="row-resize-handle"
          onDoubleClick={onResetHeight}
          onPointerDown={onResizeStart}
          role="separator"
          title="Resize asset shelf. Double-click to reset."
        />
      ) : null}
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-[150px] flex-1 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center">
            <InventoryBackpackIcon className="h-6 w-6 text-[rgb(var(--color-brand-lime))]" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{activeFolderName ?? getViewTitle(activeView)}</h2>
            <p className="truncate text-xs text-muted">{assetSummary}</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5">
          {!collapsed ? (
            <>
              <div className="flex shrink-0 items-center gap-1">
                <ListFilter size={14} className="text-muted" aria-hidden="true" />
                <select
                  aria-label="Sort assets by"
                  className="h-7 w-28 rounded-sm border border-line bg-surface px-1.5 text-xs font-medium text-ink outline-none transition hover:border-steel focus:border-steel"
                  value={assetSortKey}
                  onChange={(event) => onAssetSortKeyChange(event.currentTarget.value as AssetSortKey)}
                >
                  {assetSortOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                aria-label={`Sort ${assetSortDirection === "asc" ? "ascending" : "descending"}`}
                className="icon-button asset-shelf-icon-button"
                title={`Sort ${assetSortDirection === "asc" ? "ascending" : "descending"}`}
                onClick={() => onAssetSortDirectionChange(assetSortDirection === "asc" ? "desc" : "asc")}
              >
                <SortDirectionIcon size={15} aria-hidden="true" />
              </button>
              <div className="flex shrink-0 rounded-sm border border-line bg-surface p-0.5">
                {assetViewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      aria-label={option.label}
                      aria-pressed={viewMode === option.mode}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-sm text-ink transition hover:bg-surface-raised ${
                        viewMode === option.mode ? "bg-surface-raised text-ink" : "text-muted"
                      }`}
                      key={option.mode}
                      title={option.label}
                      onClick={() => onAssetViewModeChange(option.mode)}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <label className="relative w-[min(24vw,260px)] min-w-[150px] shrink">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} aria-hidden="true" />
                <input
                  aria-label="Search assets"
                  className="h-7 w-full rounded-sm border border-line bg-surface pl-8 pr-2.5 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                  placeholder="Search assets..."
                  type="search"
                  value={assetSearchQuery}
                  onChange={(event) => onAssetSearchQueryChange(event.currentTarget.value)}
                />
              </label>
            </>
          ) : null}
          <button
            aria-label={collapsed ? "Expand asset shelf" : "Minimize asset shelf"}
            className="icon-button asset-shelf-icon-button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand asset shelf" : "Minimize asset shelf"}
          >
            <ChevronDown className={collapsed ? "" : "rotate-180"} size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!collapsed && assets.length > 0 ? (
        <div className={`min-h-0 flex-1 pl-3 pr-2 pt-3 ${viewMode === "details" ? "pb-1.5" : "pb-6"}`}>
          <div className={`asset-shelf-scroll h-full min-h-0 ${viewMode === "details" ? "overflow-x-auto overflow-y-auto" : "overflow-auto"}`}>
            {viewMode === "details" ? (
              <div style={detailsTableStyle}>
                <div className="asset-details-header" style={detailsGridStyle}>
                  {detailsColumnKeys.map((columnKey) => (
                    <div
                      className="asset-details-header-cell"
                      key={columnKey}
                      onPointerDown={(event) => startDetailsColumnResize(event, columnKey)}
                      title={`Drag to resize ${detailsColumnLabels[columnKey]}`}
                    >
                      <span className="truncate">{detailsColumnLabels[columnKey]}</span>
                      <span className="asset-details-column-grip" aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <VirtualizedDetailsRows
                  assets={assets}
                  canStartAssetPointerDrag={canStartAssetPointerDrag}
                  gridStyle={detailsGridStyle}
                  nvdDocument={nvdDocument}
                  onAssetPointerDown={handleAssetPointerDown}
                  onOpenContextMenu={onOpenAssetContextMenu}
                  onSelectAsset={onSelectAsset}
                  selectedAssetId={selectedAsset?.id ?? null}
                />
              </div>
            ) : (
              <VirtualizedAssetGrid
                assets={assets}
                canStartAssetPointerDrag={canStartAssetPointerDrag}
                mode={viewMode}
                nvdDocument={nvdDocument}
                onAssetPointerDown={handleAssetPointerDown}
                onOpenContextMenu={onOpenAssetContextMenu}
                onPlayAudio={onPlayAudio}
                onSelectAsset={onSelectAsset}
                selectedAssetId={selectedAsset?.id ?? null}
              />
            )}
          </div>
        </div>
      ) : !collapsed ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
          <div className="max-w-md rounded-sm border border-line bg-surface p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-forest text-white">
              {isInventoryDocumentsView ? <FilePlus2 size={24} aria-hidden="true" /> : <FolderSearch size={24} aria-hidden="true" />}
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {isScanning
                ? "Scanning folder..."
                : trimmedAssetSearchQuery
                  ? "No matching assets"
                  : isInventoryDocumentsView
                    ? "No documents yet"
                    : "No assets in this view"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {trimmedAssetSearchQuery
                ? `No assets in this view match "${trimmedAssetSearchQuery}".`
                : isInventoryDocumentsView
                  ? "Create an NVD document to begin writing inside this Inventory."
                : activeFolderName
                ? `Assets will appear here when their tags, name, or placement rules match "${activeFolderName}".`
                : canOpenFolder
                  ? "Use File -> Add Source Folder... to scan supported asset files, then select a structure node on the left to filter the shelf."
                  : "Create or open an Inventory to load source folders."}
            </p>
            {!trimmedAssetSearchQuery && isInventoryDocumentsView ? (
              <button className="primary-button mx-auto mt-5" type="button" onClick={onCreateNvdDocument}>
                <FilePlus2 size={16} aria-hidden="true" />
                <span>New NVD Document</span>
              </button>
            ) : !trimmedAssetSearchQuery && canOpenFolder ? (
              <button className="primary-button mx-auto mt-5" disabled={isScanning} onClick={onOpenFolder}>
                <FolderOpen size={16} aria-hidden="true" />
                <span>{isScanning ? "Scanning" : "Open Folder"}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function VirtualizedAssetGrid<TAsset extends AssetShelfAsset>({
  assets,
  canStartAssetPointerDrag,
  mode,
  nvdDocument,
  onAssetPointerDown,
  onOpenContextMenu,
  onPlayAudio,
  onSelectAsset,
  selectedAssetId,
}: {
  assets: TAsset[];
  canStartAssetPointerDrag?: (asset: TAsset) => boolean;
  mode: Exclude<AssetViewMode, "details">;
  nvdDocument: OpenedNvdDocument | null;
  onAssetPointerDown: (asset: TAsset, event: ReactPointerEvent<HTMLElement>) => void;
  onOpenContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onPlayAudio: (asset: TAsset) => void;
  onSelectAsset: (id: number) => void;
  selectedAssetId: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewport = useElementViewport(scrollRef);
  const layout = getGridVirtualLayout(viewport.width, mode, assets.length);
  const totalRows = Math.max(1, Math.ceil(assets.length / layout.columnCount));
  const visibleRowStart = Math.max(0, Math.floor(viewport.scrollTop / layout.rowHeight) - GRID_OVERSCAN_ROWS);
  const visibleRowEnd = Math.min(
    totalRows,
    Math.ceil((viewport.scrollTop + viewport.height) / layout.rowHeight) + GRID_OVERSCAN_ROWS,
  );
  const startIndex = visibleRowStart * layout.columnCount;
  const endIndex = Math.min(assets.length, visibleRowEnd * layout.columnCount);
  const visibleAssets = assets.slice(startIndex, endIndex);

  return (
    <div className="h-full min-h-0 overflow-auto pr-2.5" ref={scrollRef}>
      <div style={{ height: totalRows * layout.rowHeight, position: "relative" }}>
        <div
          className={getAssetGridClassName(mode)}
          style={{
            left: 0,
            position: "absolute",
            right: 0,
            top: visibleRowStart * layout.rowHeight,
          }}
        >
          {visibleAssets.map((asset) => (
            <AssetCard
              asset={asset}
              canStartAssetPointerDrag={canStartAssetPointerDrag}
              key={asset.id}
              mode={mode}
              nvdDocument={nvdDocument}
              onAssetPointerDown={onAssetPointerDown}
              onOpenContextMenu={onOpenContextMenu}
              onPlayAudio={onPlayAudio}
              onSelectAsset={onSelectAsset}
              selected={asset.id === selectedAssetId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VirtualizedDetailsRows<TAsset extends AssetShelfAsset>({
  assets,
  canStartAssetPointerDrag,
  gridStyle,
  nvdDocument,
  onAssetPointerDown,
  onOpenContextMenu,
  onSelectAsset,
  selectedAssetId,
}: {
  assets: TAsset[];
  canStartAssetPointerDrag?: (asset: TAsset) => boolean;
  gridStyle: CSSProperties;
  nvdDocument: OpenedNvdDocument | null;
  onAssetPointerDown: (asset: TAsset, event: ReactPointerEvent<HTMLElement>) => void;
  onOpenContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onSelectAsset: (id: number) => void;
  selectedAssetId: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewport = useElementViewport(scrollRef);
  const rowStep = DETAILS_ROW_HEIGHT + DETAILS_ROW_GAP;
  const visibleRowStart = Math.max(0, Math.floor(viewport.scrollTop / rowStep) - DETAILS_OVERSCAN_ROWS);
  const visibleRowEnd = Math.min(
    assets.length,
    Math.ceil((viewport.scrollTop + viewport.height) / rowStep) + DETAILS_OVERSCAN_ROWS,
  );
  const visibleAssets = assets.slice(visibleRowStart, visibleRowEnd);
  const totalHeight = Math.max(0, assets.length * rowStep - DETAILS_ROW_GAP);

  return (
    <div className="mt-1 h-full min-h-0 overflow-auto pr-2.5" ref={scrollRef}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            left: 0,
            position: "absolute",
            right: 0,
            top: visibleRowStart * rowStep,
          }}
        >
          <div className="space-y-1">
            {visibleAssets.map((asset) => (
              <AssetDetailsRow
                asset={asset}
                canStartAssetPointerDrag={canStartAssetPointerDrag}
                gridStyle={gridStyle}
                key={asset.id}
                nvdDocument={nvdDocument}
                onAssetPointerDown={onAssetPointerDown}
                onOpenContextMenu={onOpenContextMenu}
                onSelectAsset={onSelectAsset}
                selected={asset.id === selectedAssetId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetCard<TAsset extends AssetShelfAsset>({
  asset,
  canStartAssetPointerDrag,
  mode,
  nvdDocument,
  onAssetPointerDown,
  onOpenContextMenu,
  onPlayAudio,
  onSelectAsset,
  selected,
}: {
  asset: TAsset;
  canStartAssetPointerDrag?: (asset: TAsset) => boolean;
  mode: Exclude<AssetViewMode, "details">;
  nvdDocument: OpenedNvdDocument | null;
  onAssetPointerDown: (asset: TAsset, event: ReactPointerEvent<HTMLElement>) => void;
  onOpenContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onPlayAudio: (asset: TAsset) => void;
  onSelectAsset: (id: number) => void;
  selected: boolean;
}) {
  function handleSelect() {
    onSelectAsset(asset.id);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  }

  const audioActions = isPlayableAudioAsset(asset) ? (
    <AudioCardActions asset={asset} onPlayAudio={onPlayAudio} />
  ) : null;
  const pointerDragEnabled = Boolean(canStartAssetPointerDrag?.(asset));

  if (mode === "extra-large") {
    return (
      <div
        className={`asset-card asset-card-extra text-left ${selected ? "asset-card-selected" : ""}`}
        role="button"
        tabIndex={0}
        onContextMenu={(event) => onOpenContextMenu(asset, event)}
        onKeyDown={handleKeyDown}
        onPointerDown={pointerDragEnabled ? (event) => onAssetPointerDown(asset, event) : undefined}
        onClick={pointerDragEnabled ? undefined : handleSelect}
      >
        <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
        {audioActions}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-2.5 text-white" style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.95)" }}>
          <h3 className="truncate text-sm font-semibold">{asset.name}</h3>
          <p className="mt-0.5 truncate text-xs text-white/75">
            {asset.type} / .{asset.extension} / {asset.size}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <span className="rounded-sm border border-white/25 px-1.5 py-0.5 text-[11px] font-medium text-white/85" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "large") {
    return (
      <div
        className={`asset-card asset-card-large text-center ${selected ? "asset-card-selected" : ""}`}
        role="button"
        tabIndex={0}
        onContextMenu={(event) => onOpenContextMenu(asset, event)}
        onKeyDown={handleKeyDown}
        onPointerDown={pointerDragEnabled ? (event) => onAssetPointerDown(asset, event) : undefined}
        onClick={pointerDragEnabled ? undefined : handleSelect}
      >
        <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
        {audioActions}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-2.5 py-2 text-center text-white" style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.95)" }}>
          <h3 className="truncate text-[13px] font-semibold">{asset.name}</h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`asset-card asset-card-medium text-left ${selected ? "asset-card-selected" : ""}`}
      role="button"
      tabIndex={0}
      onContextMenu={(event) => onOpenContextMenu(asset, event)}
      onKeyDown={handleKeyDown}
      onPointerDown={pointerDragEnabled ? (event) => onAssetPointerDown(asset, event) : undefined}
      onClick={pointerDragEnabled ? undefined : handleSelect}
    >
      <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
      {audioActions}
    </div>
  );
}

function AssetDetailsRow<TAsset extends AssetShelfAsset>({
  asset,
  canStartAssetPointerDrag,
  gridStyle,
  nvdDocument,
  onAssetPointerDown,
  onOpenContextMenu,
  onSelectAsset,
  selected,
}: {
  asset: TAsset;
  canStartAssetPointerDrag?: (asset: TAsset) => boolean;
  gridStyle: CSSProperties;
  nvdDocument: OpenedNvdDocument | null;
  onAssetPointerDown: (asset: TAsset, event: ReactPointerEvent<HTMLElement>) => void;
  onOpenContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onSelectAsset: (id: number) => void;
  selected: boolean;
}) {
  const pointerDragEnabled = Boolean(canStartAssetPointerDrag?.(asset));

  return (
    <button
      className={`asset-details-row ${selected ? "asset-details-row-selected" : ""}`}
      style={gridStyle}
      onClick={pointerDragEnabled ? undefined : () => onSelectAsset(asset.id)}
      onContextMenu={(event) => onOpenContextMenu(asset, event)}
      onPointerDown={pointerDragEnabled ? (event) => onAssetPointerDown(asset, event) : undefined}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-14 shrink-0">
          <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{asset.name}</span>
          <span className="block truncate text-xs text-muted">.{asset.extension}</span>
        </span>
      </span>
      <span className="truncate text-sm text-muted">{asset.type}</span>
      <span className="truncate text-sm text-muted">{asset.size}</span>
      <span className="truncate text-sm text-muted">{asset.modified}</span>
      <span className="flex min-w-0 flex-wrap gap-1">
        {asset.tags.slice(0, 3).map((tag) => (
          <span className="tag-small" key={tag}>
            {tag}
          </span>
        ))}
      </span>
    </button>
  );
}

function InventoryBackpackIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 1024 1024">
      <g fill="currentColor">
        <path d="M512 72c-119 0-198 72-198 181v44h95v-44c0-55 38-90 103-90s103 35 103 90v44h95v-44C710 144 631 72 512 72Z" />
        <path d="M290 276h424c86 0 156 70 156 156v319c0 89-72 161-161 161H285c-89 0-161-72-161-161V442c0-92 75-166 166-166Z" />
        <path d="M176 430c0-32 26-58 58-58h34v271h-34c-32 0-58-26-58-58V430Z" />
        <path d="M756 372h34c32 0 58 26 58 58v155c0 32-26 58-58 58h-34V372Z" />
        <path d="M344 626c0-31 25-56 56-56h224c31 0 56 25 56 56v101c0 31-25 56-56 56H400c-31 0-56-25-56-56V626Z" />
      </g>
    </svg>
  );
}

function getAssetGridClassName(viewMode: AssetViewMode) {
  switch (viewMode) {
    case "extra-large":
      return "asset-grid-extra-large";
    case "large":
      return "asset-grid-large";
    case "medium":
    case "details":
    default:
      return "asset-grid-medium";
  }
}

function getViewTitle(activeView: LibraryView) {
  switch (activeView) {
    case "inventory-files":
      return "Inventory";
    case "inventory-documents":
      return "Write";
    case "inventory-vectors":
      return "Draw";
    case "inbox":
      return "Unsorted Inbox";
    case "all":
    default:
      return "Workspace";
  }
}

function useElementViewport(ref: React.RefObject<HTMLElement | null>) {
  const [viewport, setViewport] = useState({ height: 0, scrollTop: 0, width: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateViewport = () => {
      setViewport({
        height: element.clientHeight,
        scrollTop: element.scrollTop,
        width: element.clientWidth,
      });
    };

    updateViewport();

    const handleScroll = () => {
      setViewport((current) => ({
        ...current,
        scrollTop: element.scrollTop,
      }));
    };

    const resizeObserver = new ResizeObserver(() => {
      updateViewport();
    });

    resizeObserver.observe(element);
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      element.removeEventListener("scroll", handleScroll);
    };
  }, [ref]);

  return viewport;
}

function getGridVirtualLayout(width: number, mode: Exclude<AssetViewMode, "details">, itemCount: number) {
  const minColumnWidth = mode === "extra-large" ? 260 : mode === "large" ? 210 : 150;
  const gap = mode === "extra-large" ? 12 : mode === "large" ? 10 : 8;
  const safeWidth = Math.max(width, minColumnWidth);
  const columnCount = Math.max(1, Math.floor((safeWidth + gap) / (minColumnWidth + gap)));
  const itemWidth = (safeWidth - gap * (columnCount - 1)) / columnCount;
  const rowHeight = itemWidth * 0.75 + 0.5;

  return {
    columnCount: itemCount > 0 ? columnCount : 1,
    rowHeight,
  };
}

function isPrimaryPointer(event: ReactPointerEvent<HTMLElement>) {
  return event.isPrimary && event.button === 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
