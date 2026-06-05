import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  FilePlus2,
  FolderOpen,
  FolderSearch,
  GalleryHorizontal,
  LayoutGrid,
  ListFilter,
  Maximize2,
  Search,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import { AudioCardActions, isWaveAudioAsset } from "../../sceneReaders/audioReader";
import type { OpenedNvdDocument } from "../inventoryProject";
import { AssetThumbnail } from "../sceneViewer";

type AssetShelfAssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type LibraryView = "all" | "inbox" | "inventory-files" | "inventory-documents" | "inventory-vectors";
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
  { icon: GalleryHorizontal, label: "Medium icons", mode: "large" },
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
  onAssetSearchQueryChange,
  onAssetSortDirectionChange,
  onAssetSortKeyChange,
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
  onAssetSearchQueryChange: (query: string) => void;
  onAssetSortDirectionChange: (direction: SortDirection) => void;
  onAssetSortKeyChange: (sortKey: AssetSortKey) => void;
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
                <div className="mt-1 space-y-1">
                  {assets.map((asset) => (
                    <AssetDetailsRow
                      asset={asset}
                      gridStyle={detailsGridStyle}
                      key={asset.id}
                      nvdDocument={nvdDocument}
                      onOpenContextMenu={onOpenAssetContextMenu}
                      onSelectAsset={onSelectAsset}
                      selected={asset.id === selectedAsset?.id}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={getAssetGridClassName(viewMode)}>
                {assets.map((asset) => (
                  <AssetCard
                    asset={asset}
                    key={asset.id}
                    mode={viewMode}
                    nvdDocument={nvdDocument}
                    onOpenContextMenu={onOpenAssetContextMenu}
                    onPlayAudio={onPlayAudio}
                    onSelectAsset={onSelectAsset}
                    selected={asset.id === selectedAsset?.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !collapsed ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
          <div className="max-w-md rounded-sm border border-line bg-surface p-6 text-center shadow-soft">
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

function AssetCard<TAsset extends AssetShelfAsset>({
  asset,
  mode,
  nvdDocument,
  onOpenContextMenu,
  onPlayAudio,
  onSelectAsset,
  selected,
}: {
  asset: TAsset;
  mode: Exclude<AssetViewMode, "details">;
  nvdDocument: OpenedNvdDocument | null;
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

  const audioActions = isWaveAudioAsset(asset) ? (
    <AudioCardActions asset={asset} onPlayAudio={onPlayAudio} />
  ) : null;

  if (mode === "extra-large") {
    return (
      <div
        className={`asset-card asset-card-extra text-left ${selected ? "asset-card-selected" : ""}`}
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onContextMenu={(event) => onOpenContextMenu(asset, event)}
        onKeyDown={handleKeyDown}
      >
        <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
        {audioActions}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 text-white" style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.95)" }}>
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
        onClick={handleSelect}
        onContextMenu={(event) => onOpenContextMenu(asset, event)}
        onKeyDown={handleKeyDown}
      >
        <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
        {audioActions}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2.5 py-2 text-center text-white" style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.95)" }}>
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
      onClick={handleSelect}
      onContextMenu={(event) => onOpenContextMenu(asset, event)}
      onKeyDown={handleKeyDown}
    >
      <AssetThumbnail asset={asset} nvdDocument={nvdDocument} />
      {audioActions}
    </div>
  );
}

function AssetDetailsRow<TAsset extends AssetShelfAsset>({
  asset,
  gridStyle,
  nvdDocument,
  onOpenContextMenu,
  onSelectAsset,
  selected,
}: {
  asset: TAsset;
  gridStyle: CSSProperties;
  nvdDocument: OpenedNvdDocument | null;
  onOpenContextMenu: (asset: TAsset, event: ReactMouseEvent<HTMLElement>) => void;
  onSelectAsset: (id: number) => void;
  selected: boolean;
}) {
  return (
    <button
      className={`asset-details-row ${selected ? "asset-details-row-selected" : ""}`}
      style={gridStyle}
      onClick={() => onSelectAsset(asset.id)}
      onContextMenu={(event) => onOpenContextMenu(asset, event)}
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

function isPrimaryPointer(event: ReactPointerEvent<HTMLElement>) {
  return event.isPrimary && event.button === 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
