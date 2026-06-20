import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { Backpack, ChevronDown, ChevronLeft, ChevronRight, FolderSearch, ListTree, Plus } from "lucide-react";
import type { LibraryView } from "../../features/assetShelf";
import type { NvdDocument } from "../../features/inventoryProject";
import { getNvdStyleRole, type NvdStyleRole } from "../../features/nvdEditor";
import type { LeftPaneView, NvdOutlineEntry, SourceFolder, StructureNode } from "../appTypes";

export function LibraryStructure({
  activeView,
  activeNvdOutline,
  canCreateFolder,
  canShowNvdNavigation,
  collapsed,
  editingAssetId,
  editingFolderId,
  nodes,
  onCreateFolder,
  onNavigateNvdBlock,
  onRenameAssetStart,
  onRenameAssetCancel,
  onRenameAssetSubmit,
  onRenameFolderStart,
  onRenameFolderCancel,
  onRenameFolderSubmit,
  onPaneViewChange,
  onResizeStart,
  onResetWidth,
  onSelectAsset,
  onSelectFolder,
  onSelectView,
  onSourceResizeStart,
  onToggleCollapsed,
  onToggleSourceCollapsed,
  onToggleSourceFolder,
  onOpenSourceFolderContextMenu,
  onToggleTreeNode,
  onOpenNodeContextMenu,
  paneView,
  selectedAssetId,
  sourceSectionCollapsed,
  sourceFolders,
  sourceSectionHeight,
}: {
  activeView: LibraryView;
  activeNvdOutline: NvdOutlineEntry[];
  canCreateFolder: boolean;
  canShowNvdNavigation: boolean;
  collapsed: boolean;
  editingAssetId: number | null;
  editingFolderId: string | null;
  nodes: StructureNode[];
  onCreateFolder: () => void;
  onNavigateNvdBlock: (blockIndex: number) => void;
  onRenameAssetStart: (assetId: number) => void;
  onRenameAssetCancel: () => void;
  onRenameAssetSubmit: (assetId: number, name: string) => void;
  onRenameFolderStart: (folderId: string) => void;
  onRenameFolderCancel: () => void;
  onRenameFolderSubmit: (folderId: string, name: string) => void;
  onPaneViewChange: (view: LeftPaneView) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetWidth: () => void;
  onSelectAsset: (assetId: number) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectView: (view: LibraryView) => void;
  onSourceResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  onToggleSourceCollapsed: () => void;
  onToggleSourceFolder: (sourceId: string) => void;
  onOpenSourceFolderContextMenu: (folder: SourceFolder, event: ReactMouseEvent<HTMLElement>) => void;
  onToggleTreeNode: (nodeId: string) => void;
  onOpenNodeContextMenu: (node: StructureNode, event: ReactMouseEvent<HTMLElement>) => void;
  paneView: LeftPaneView;
  selectedAssetId: number | null;
  sourceSectionCollapsed: boolean;
  sourceFolders: SourceFolder[];
  sourceSectionHeight: number;
}) {
  const isLibraryPane = paneView === "library";
  const paneLabel = isLibraryPane ? "Library Structure" : "NVD Navigation";

  if (collapsed) {
    return (
      <aside className="library-panel relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar text-ink">
        <div className="flex min-h-0 flex-1 flex-col items-center border-r border-line px-1 py-2">
          <button
            aria-label={`Expand ${paneLabel.toLowerCase()}`}
            className="dark-icon-button h-8 w-8"
            title={`Expand ${paneLabel.toLowerCase()}`}
            type="button"
            onClick={onToggleCollapsed}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <div
            className="mt-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-normal text-muted"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {isLibraryPane ? "Library" : "NVD Navigation"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="library-panel relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar text-ink">
      <div
        aria-label="Resize library structure"
        aria-orientation="vertical"
        className="pane-resize-handle pane-resize-handle-right"
        onDoubleClick={onResetWidth}
        onPointerDown={onResizeStart}
        role="separator"
        title="Resize library structure. Double-click to reset."
      />
      <div className="flex min-h-0 flex-1 flex-col border-r border-line">
        <div className="flex h-10 shrink-0 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="left-pane-view-switcher" role="tablist" aria-label="Left pane view">
              <button
                aria-label="Library Structure"
                aria-selected={isLibraryPane}
                className={`left-pane-view-button ${isLibraryPane ? "left-pane-view-button-active" : ""}`}
                role="tab"
                title="Library Structure"
                type="button"
                onClick={() => onPaneViewChange("library")}
              >
                <Backpack size={13} aria-hidden="true" />
              </button>
              <button
                aria-label="NVD Navigation"
                aria-selected={!isLibraryPane}
                className={`left-pane-view-button ${!isLibraryPane ? "left-pane-view-button-active" : ""} ${
                  canShowNvdNavigation && isLibraryPane ? "left-pane-view-button-attention" : ""
                }`}
                disabled={!canShowNvdNavigation}
                role="tab"
                title={canShowNvdNavigation ? "NVD Navigation" : "Open the NVD editor to use document navigation"}
                type="button"
                onClick={() => onPaneViewChange("nvd-navigation")}
              >
                <ListTree size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="dark-icon-button" aria-label={`Minimize ${paneLabel.toLowerCase()}`} title={`Minimize ${paneLabel.toLowerCase()}`} type="button" onClick={onToggleCollapsed}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            {isLibraryPane ? (
              <>
                <button className="dark-icon-button" aria-label="Add library node" disabled={!canCreateFolder} title="Add library node" onClick={onCreateFolder}>
                  <Plus size={14} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {isLibraryPane ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
              {nodes.map((node) => (
                <StructureRow
                  activeView={activeView}
                  editingAssetId={editingAssetId}
                  key={node.id}
                  node={node}
                  depth={0}
                  editingFolderId={editingFolderId}
                  onSelectFolder={onSelectFolder}
                  onSelectView={onSelectView}
                  onSelectAsset={onSelectAsset}
                  onRenameAssetStart={onRenameAssetStart}
                  onRenameAssetCancel={onRenameAssetCancel}
                  onRenameAssetSubmit={onRenameAssetSubmit}
                  onRenameFolderStart={onRenameFolderStart}
                  onRenameFolderCancel={onRenameFolderCancel}
                  onRenameFolderSubmit={onRenameFolderSubmit}
                  onToggleNode={onToggleTreeNode}
                  onOpenContextMenu={onOpenNodeContextMenu}
                  selectedAssetId={selectedAssetId}
                />
              ))}
            </div>

            <SourceFoldersPanel
              collapsed={sourceSectionCollapsed}
              height={sourceSectionHeight}
              onResizeStart={onSourceResizeStart}
              onToggleCollapsed={onToggleSourceCollapsed}
              onToggleSourceFolder={onToggleSourceFolder}
              onOpenSourceFolderContextMenu={onOpenSourceFolderContextMenu}
              sourceFolders={sourceFolders}
            />
          </>
        ) : (
          <NvdNavigation
            activeOutline={activeNvdOutline}
            onNavigateBlock={onNavigateNvdBlock}
          />
        )}
      </div>
    </aside>
  );
}

export function getNvdOutline(document: NvdDocument | null): NvdOutlineEntry[] {
  if (!document) {
    return [];
  }

  const outline: NvdOutlineEntry[] = [];
  document.blocks.forEach((block, blockIndex) => {
    const role = getNvdStyleRole(block.kind);
    const text = block.text.trim();

    if (role !== "p" && text) {
      outline.push({
        blockIndex,
        depth: getNvdHeadingDepth(role),
        id: block.id,
        role,
        text,
      });
    }
  });

  return outline;
}

function NvdNavigation({
  activeOutline,
  onNavigateBlock,
}: {
  activeOutline: NvdOutlineEntry[];
  onNavigateBlock: (blockIndex: number) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-muted">Navigation</div>
      {activeOutline.length > 0 ? (
        <div>
          {activeOutline.map((entry) => (
            <button
              className="nvd-outline-row"
              key={entry.id}
              style={{ paddingLeft: `${12 + entry.depth * 12}px` }}
              title={entry.text}
              type="button"
              onClick={() => onNavigateBlock(entry.blockIndex)}
            >
              <span className="nvd-outline-role">{entry.role}</span>
              <span className="truncate">{entry.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-muted">Add text to build the outline.</div>
      )}
    </div>
  );
}

function getNvdHeadingDepth(role: Exclude<NvdStyleRole, "p">) {
  return Number(role.slice(1)) - 1;
}

function SourceFoldersPanel({
  collapsed,
  height,
  onResizeStart,
  onToggleCollapsed,
  onToggleSourceFolder,
  onOpenSourceFolderContextMenu,
  sourceFolders,
}: {
  collapsed: boolean;
  height: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  onToggleSourceFolder: (sourceId: string) => void;
  onOpenSourceFolderContextMenu: (folder: SourceFolder, event: ReactMouseEvent<HTMLElement>) => void;
  sourceFolders: SourceFolder[];
}) {
  const enabledCount = sourceFolders.filter((folder) => folder.enabled).length;

  return (
    <section className="relative flex shrink-0 flex-col border-t border-line" style={{ height: collapsed ? 36 : height }}>
      {!collapsed ? (
        <div
          aria-label="Resize source folders"
          aria-orientation="horizontal"
          className="row-resize-handle"
          onDoubleClick={() => undefined}
          onPointerDown={onResizeStart}
          role="separator"
          title="Resize source folders."
        />
      ) : null}
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-muted">
          <FolderSearch size={13} aria-hidden="true" />
          <span>Source Folders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-[11px] text-muted">
            {enabledCount}/{sourceFolders.length}
          </span>
          <button
            aria-label={collapsed ? "Expand source folders" : "Minimize source folders"}
            className="dark-icon-button h-6 w-6 border-transparent bg-transparent"
            title={collapsed ? "Expand source folders" : "Minimize source folders"}
            onClick={onToggleCollapsed}
          >
            <ChevronDown className={collapsed ? "" : "rotate-180"} size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!collapsed ? <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {sourceFolders.length > 0 ? (
          <div className="overflow-hidden rounded-sm border border-line">
            {sourceFolders.map((folder) => (
              <button
                className={`source-folder-row ${folder.enabled ? "" : "source-folder-row-disabled"}`}
                key={folder.id}
                onClick={() => onToggleSourceFolder(folder.id)}
                onContextMenu={(event) => onOpenSourceFolderContextMenu(folder, event)}
                title={folder.path}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{folder.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="truncate text-[11px] text-muted">
                    {folder.assetIds.length} asset{folder.assetIds.length === 1 ? "" : "s"}
                    {folder.skippedEntries > 0 ? `, ${folder.skippedEntries} skipped` : ""}
                  </span>
                  <span className={`source-folder-toggle ${folder.enabled ? "source-folder-toggle-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-line bg-surface p-2 text-xs leading-relaxed text-muted">No source folders loaded yet.</div>
        )}
      </div> : null}
    </section>
  );
}

function StructureRow({
  activeView,
  depth,
  editingAssetId,
  editingFolderId,
  node,
  onSelectAsset,
  onSelectFolder,
  onSelectView,
  onRenameAssetStart,
  onRenameAssetCancel,
  onRenameAssetSubmit,
  onRenameFolderStart,
  onRenameFolderCancel,
  onRenameFolderSubmit,
  onToggleNode,
  onOpenContextMenu,
  selectedAssetId,
}: {
  activeView: LibraryView;
  depth: number;
  editingAssetId: number | null;
  editingFolderId: string | null;
  node: StructureNode;
  onSelectAsset: (assetId: number) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectView: (view: LibraryView) => void;
  onRenameAssetStart: (assetId: number) => void;
  onRenameAssetCancel: () => void;
  onRenameAssetSubmit: (assetId: number, name: string) => void;
  onRenameFolderStart: (folderId: string) => void;
  onRenameFolderCancel: () => void;
  onRenameFolderSubmit: (folderId: string, name: string) => void;
  onToggleNode: (nodeId: string) => void;
  onOpenContextMenu: (node: StructureNode, event: ReactMouseEvent<HTMLElement>) => void;
  selectedAssetId: number | null;
}) {
  const Icon = node.icon;
  const hasChildren = Boolean(node.children?.length);
  const style = { "--tree-depth": depth } as CSSProperties;
  const isAssetNode = typeof node.assetId === "number";
  const isActive = isAssetNode && selectedAssetId === node.assetId;
  const isLibraryRoot = node.id === "library" || node.id === "inventory-files";
  const isEditingAsset = typeof node.assetId === "number" && editingAssetId === node.assetId;
  const isEditingFolder = Boolean(node.folderId) && editingFolderId === node.folderId;
  const isEditing = isEditingAsset || isEditingFolder;
  const [draftName, setDraftName] = useState(node.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftName(node.label);
      return;
    }

    setDraftName(node.label);
  }, [isEditing, node.label]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();
    const nameLength = input.value.length;
    input.setSelectionRange(nameLength, nameLength);
  }, [isEditing]);

  function handleSelect() {
    if (isEditing) {
      return;
    }

    if (typeof node.assetId === "number") {
      onSelectAsset(node.assetId);
    } else if (node.folderId) {
      onSelectFolder(node.folderId);
    } else if (node.view) {
      onSelectView(node.view);
    } else if (hasChildren) {
      onToggleNode(node.id);
    }
  }

  function handleDoubleClick() {
    if (typeof node.assetId === "number") {
      onRenameAssetStart(node.assetId);
      return;
    }

    if (node.folderId) {
      onRenameFolderStart(node.folderId);
    }
  }

  function commitRename() {
    const trimmedName = draftName.trim();

    if (!trimmedName || trimmedName === node.label) {
      if (isEditingAsset) {
        onRenameAssetCancel();
        return;
      }

      onRenameFolderCancel();
      return;
    }

    if (isEditingAsset && typeof node.assetId === "number") {
      onRenameAssetSubmit(node.assetId, trimmedName);
      return;
    }

    if (node.folderId) {
      onRenameFolderSubmit(node.folderId, trimmedName);
      return;
    }

    onRenameFolderCancel();
  }

  function handleRenameKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftName(node.label);
      if (isEditingAsset) {
        onRenameAssetCancel();
        return;
      }

      onRenameFolderCancel();
    }
  }

  return (
    <div>
      <div
        className={`tree-row ${isLibraryRoot ? "tree-row-library-root" : ""} ${isAssetNode ? "tree-row-file" : ""} ${isActive ? "tree-row-active" : ""}`}
        style={style}
        onContextMenu={(event) => {
          onOpenContextMenu(node, event);
        }}
      >
        {hasChildren ? (
          <button
            aria-label={`${node.open ? "Collapse" : "Expand"} ${node.label}`}
            aria-expanded={node.open}
            className="tree-toggle-button"
            type="button"
            onClick={() => onToggleNode(node.id)}
          >
            {node.open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <button
          aria-expanded={hasChildren ? node.open : undefined}
          className="tree-row-main"
          type="button"
          onDoubleClick={handleDoubleClick}
          onClick={handleSelect}
        >
          {Icon ? <Icon className={isActive ? "text-white" : "text-muted"} size={15} aria-hidden="true" /> : null}
          {isEditing ? (
            <input
              ref={inputRef}
              className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[13px] font-medium text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
              value={draftName}
              onBlur={commitRename}
              onChange={(event) => setDraftName(event.currentTarget.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleRenameKeyDown}
            />
          ) : (
            <span className="truncate">{node.label}</span>
          )}
        </button>
        {!isAssetNode && node.meta ? <span className="tree-meta">{node.meta}</span> : null}
      </div>

      {node.open &&
        node.children?.map((child) => (
          <StructureRow
            activeView={activeView}
            editingAssetId={editingAssetId}
            depth={depth + 1}
            editingFolderId={editingFolderId}
            key={child.id}
            node={child}
            onSelectAsset={onSelectAsset}
            onSelectFolder={onSelectFolder}
            onSelectView={onSelectView}
            onRenameAssetStart={onRenameAssetStart}
            onRenameAssetCancel={onRenameAssetCancel}
            onRenameAssetSubmit={onRenameAssetSubmit}
            onRenameFolderStart={onRenameFolderStart}
            onRenameFolderCancel={onRenameFolderCancel}
            onRenameFolderSubmit={onRenameFolderSubmit}
            onToggleNode={onToggleNode}
            onOpenContextMenu={onOpenContextMenu}
            selectedAssetId={selectedAssetId}
          />
        ))}
    </div>
  );
}
