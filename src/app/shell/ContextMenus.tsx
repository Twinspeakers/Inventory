import { useEffect } from "react";
import { ArrowDown, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { AssetPlacementSuggestion } from "../appTypes";

export type LibraryNodeContextMenuState = {
  assetPlacementSuggestions?: AssetPlacementSuggestion[];
  x: number;
  y: number;
  assetId?: number;
  assetParentFolderId?: string | null;
  assetParentPathLabels?: string[];
  canRemoveFromNode?: boolean;
  folderId?: string | null;
  isInventoryDocument?: boolean;
  label: string;
  target: "asset" | "folder";
};

export type SourceFolderContextMenuState = {
  x: number;
  y: number;
  sourceId: string;
  label: string;
  path: string;
};

export function LibraryNodeContextMenu({
  menu,
  onAddChild,
  onAcceptPlacementSuggestion,
  onDelete,
  onOpenNewNode,
  onRemoveFromNode,
  onRename,
  onClose,
}: {
  menu: LibraryNodeContextMenuState;
  onAddChild: () => void;
  onAcceptPlacementSuggestion: (suggestion: AssetPlacementSuggestion) => void;
  onDelete: () => void;
  onOpenNewNode: () => void;
  onRemoveFromNode: () => void;
  onRename: () => void;
  onClose: () => void;
}) {
  const left = typeof window === "undefined" ? menu.x : Math.min(menu.x, window.innerWidth - 220);
  const canAddToLibrary = menu.target === "asset" && !menu.isInventoryDocument;
  const canRemoveFromNode = menu.target === "asset" && Boolean(menu.canRemoveFromNode);
  const assetPlacementSuggestions = menu.assetPlacementSuggestions ?? [];
  const existingPlacementSuggestions = assetPlacementSuggestions.filter((suggestion) => suggestion.target === "existing").slice(0, 3);
  const menuHeight = menu.target === "folder" && menu.folderId ? 160 : canAddToLibrary || canRemoveFromNode ? 196 : menu.isInventoryDocument ? 136 : 96;
  const top = typeof window === "undefined" ? menu.y : Math.min(menu.y, window.innerHeight - menuHeight);
  const shouldOpenSubmenuUpward = typeof window === "undefined" ? false : top > window.innerHeight - 240;
  const parentPathLabels = stripRootLabel(menu.assetParentPathLabels ?? []);

  function stripRootLabel(path: string[]) {
    return path[0] === "Library" || path[0] === "Master" ? path.slice(1) : path;
  }

  function getSuggestionLabel(path: string[]) {
    const withoutRoot = stripRootLabel(path);

    if (parentPathLabels.length === 0) {
      return withoutRoot.join(" / ");
    }

    let sharedPrefixLength = 0;

    while (
      sharedPrefixLength < parentPathLabels.length &&
      sharedPrefixLength < withoutRoot.length &&
      parentPathLabels[sharedPrefixLength] === withoutRoot[sharedPrefixLength]
    ) {
      sharedPrefixLength += 1;
    }

    const relativePath = withoutRoot.slice(sharedPrefixLength);
    return (relativePath.length > 0 ? relativePath : withoutRoot).join(" / ");
  }

  function getConfidenceLabel(confidence: AssetPlacementSuggestion["confidence"]) {
    switch (confidence) {
      case "high":
        return "Strong";
      case "medium":
        return "Likely";
      case "low":
      default:
        return "Loose";
    }
  }

  function getConfidenceClassName(confidence: AssetPlacementSuggestion["confidence"]) {
    switch (confidence) {
      case "high":
        return "border-emerald-500/40 bg-emerald-500/12 text-emerald-200";
      case "medium":
        return "border-sky-500/40 bg-sky-500/12 text-sky-100";
      case "low":
      default:
        return "border-line bg-canvas text-muted";
    }
  }

  useEffect(() => {
    function handleClose() {
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="library-context-menu"
      style={{ left, top }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase text-muted">
        {menu.label}
      </div>
      {menu.target === "folder" ? (
        <>
          <button className="library-context-menu-item" type="button" onClick={onAddChild}>
            <Plus size={14} aria-hidden="true" />
            <span>Add Child Node</span>
          </button>
          {menu.folderId ? (
            <>
              <button className="library-context-menu-item" type="button" onClick={onRename}>
                <Pencil size={14} aria-hidden="true" />
                <span>Rename</span>
              </button>
              <button className="library-context-menu-item library-context-menu-item-danger" type="button" onClick={onDelete}>
                <Trash2 size={14} aria-hidden="true" />
                <span>Delete</span>
              </button>
            </>
          ) : null}
        </>
      ) : (
        <>
          {canAddToLibrary ? (
            <div className="relative">
              <button className="library-context-menu-item" type="button">
                <Plus size={14} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span>Add To</span>
                  <ChevronRight size={13} aria-hidden="true" />
                </span>
              </button>
              <div
                className={`library-context-submenu ${shouldOpenSubmenuUpward ? "library-context-submenu-upward" : "library-context-submenu-downward"}`}
              >
                {existingPlacementSuggestions.length > 0 ? (
                  existingPlacementSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.target}:${suggestion.folderId ?? suggestion.parentFolderId ?? "root"}:${suggestion.path.join("/")}`}
                      className="library-context-menu-item"
                      type="button"
                      onClick={() => onAcceptPlacementSuggestion(suggestion)}
                      title={suggestion.reason}
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{getSuggestionLabel(suggestion.path)}</span>
                        <span
                          className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getConfidenceClassName(
                            suggestion.confidence,
                          )}`}
                        >
                          {getConfidenceLabel(suggestion.confidence)}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="library-context-menu-empty">No suggested nodes</div>
                )}
                <button
                  className="library-context-menu-item"
                  type="button"
                  onClick={onOpenNewNode}
                >
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">Add New Node...</span>
                    <Plus size={13} aria-hidden="true" />
                  </span>
                </button>
              </div>
            </div>
          ) : null}
          <button className="library-context-menu-item" type="button" onClick={onRename}>
            <Pencil size={14} aria-hidden="true" />
            <span>{menu.isInventoryDocument ? "Rename Document..." : "Rename"}</span>
          </button>
          {canRemoveFromNode ? (
            <button className="library-context-menu-item" type="button" onClick={onRemoveFromNode}>
              <ArrowDown size={14} aria-hidden="true" />
              <span>Demote</span>
            </button>
          ) : null}
          {menu.isInventoryDocument ? (
            <button className="library-context-menu-item library-context-menu-item-danger" type="button" onClick={onDelete}>
              <Trash2 size={14} aria-hidden="true" />
              <span>Delete Document</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

export function SourceFolderContextMenu({
  menu,
  onClose,
  onRefresh,
  onRemove,
}: {
  menu: SourceFolderContextMenuState;
  onClose: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}) {
  const left = typeof window === "undefined" ? menu.x : Math.min(menu.x, window.innerWidth - 220);
  const top = typeof window === "undefined" ? menu.y : Math.min(menu.y, window.innerHeight - 128);

  useEffect(() => {
    function handleClose() {
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="library-context-menu"
      style={{ left, top }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase text-muted" title={menu.path}>
        {menu.label}
      </div>
      <button className="library-context-menu-item" type="button" onClick={onRefresh}>
        <RefreshCw size={14} aria-hidden="true" />
        <span>Refresh</span>
      </button>
      <button className="library-context-menu-item library-context-menu-item-danger" type="button" onClick={onRemove}>
        <Trash2 size={14} aria-hidden="true" />
        <span>Remove</span>
      </button>
    </div>
  );
}
