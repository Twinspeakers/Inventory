import { useEffect } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

export type LibraryNodeContextMenuState = {
  x: number;
  y: number;
  assetId?: number;
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
  onDelete,
  onRename,
  onClose,
}: {
  menu: LibraryNodeContextMenuState;
  onAddChild: () => void;
  onDelete: () => void;
  onRename: () => void;
  onClose: () => void;
}) {
  const left = typeof window === "undefined" ? menu.x : Math.min(menu.x, window.innerWidth - 220);
  const menuHeight = menu.target === "folder" && menu.folderId ? 160 : menu.isInventoryDocument ? 136 : 96;
  const top = typeof window === "undefined" ? menu.y : Math.min(menu.y, window.innerHeight - menuHeight);

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
          <button className="library-context-menu-item" type="button" onClick={onRename}>
            <Pencil size={14} aria-hidden="true" />
            <span>{menu.isInventoryDocument ? "Rename Document..." : "Rename in Inventory"}</span>
          </button>
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
