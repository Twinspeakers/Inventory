import { useState } from "react";
import {
  Database,
  FileImage,
  FileText,
  FolderOpen,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Settings,
  Undo2,
  X,
} from "lucide-react";

const menuItems = ["Library", "Asset", "Board", "Window", "Help"];

export function MenuBar({
  activeInventoryName,
  canOpenFolder,
  canRedo,
  canSaveFile,
  canUndo,
  onCloseInventory,
  onNewInventory,
  onNewNvdDocument,
  onNewNvvDocument,
  onOpenFolder,
  onOpenInventory,
  onOpenSettings,
  onRedo,
  onSaveFile,
  onUndo,
  redoLabel,
  undoLabel,
}: {
  activeInventoryName: string | null;
  canOpenFolder: boolean;
  canRedo: boolean;
  canSaveFile: boolean;
  canUndo: boolean;
  onCloseInventory: () => void;
  onNewInventory: () => void;
  onNewNvdDocument: () => void;
  onNewNvvDocument: () => void;
  onOpenFolder: () => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  onRedo: () => void;
  onSaveFile: () => void;
  onUndo: () => void;
  redoLabel: string;
  undoLabel: string;
}) {
  const [openMenu, setOpenMenu] = useState<"edit" | "file" | "view" | null>(null);

  function handleNewInventory() {
    setOpenMenu(null);
    onNewInventory();
  }

  function handleNewNvdDocument() {
    setOpenMenu(null);
    onNewNvdDocument();
  }

  function handleNewNvvDocument() {
    setOpenMenu(null);
    onNewNvvDocument();
  }

  function handleOpenInventory() {
    setOpenMenu(null);
    onOpenInventory();
  }

  function handleCloseInventory() {
    setOpenMenu(null);
    onCloseInventory();
  }

  function handleOpenFolder() {
    setOpenMenu(null);
    onOpenFolder();
  }

  function handleSaveFile() {
    setOpenMenu(null);
    onSaveFile();
  }

  function handleOpenSettings() {
    setOpenMenu(null);
    onOpenSettings();
  }

  function handleUndo() {
    setOpenMenu(null);
    onUndo();
  }

  function handleRedo() {
    setOpenMenu(null);
    onRedo();
  }

  return (
    <header className="relative flex h-8 shrink-0 items-center justify-between border-b border-line bg-graphite pl-0 pr-3 text-sm text-ink">
      <div className="flex h-full items-center gap-3">
        <nav className="flex h-full items-center">
          <div className="relative flex h-full">
            <button
              className={`menu-item ${openMenu === "file" ? "menu-item-active" : ""}`}
              onClick={() => setOpenMenu((menu) => (menu === "file" ? null : "file"))}
            >
              File
            </button>
            {openMenu === "file" ? (
              <div className="file-menu">
                <button className="file-menu-item" onClick={handleNewInventory}>
                  <Plus size={14} aria-hidden="true" />
                  <span>New Inventory...</span>
                </button>
                <button className="file-menu-item" disabled={!activeInventoryName} onClick={handleNewNvdDocument}>
                  <FileText size={14} aria-hidden="true" />
                  <span>New NVD Document...</span>
                </button>
                <button className="file-menu-item" disabled={!activeInventoryName} onClick={handleNewNvvDocument}>
                  <FileImage size={14} aria-hidden="true" />
                  <span>New NVV Vector...</span>
                </button>
                <button className="file-menu-item" onClick={handleOpenInventory}>
                  <Database size={14} aria-hidden="true" />
                  <span>Open Inventory...</span>
                </button>
                <button className="file-menu-item" disabled={!activeInventoryName} onClick={handleCloseInventory}>
                  <X size={14} aria-hidden="true" />
                  <span>Close Inventory</span>
                </button>
                <div className="my-1 border-t border-line" />
                <button className="file-menu-item" disabled={!canSaveFile} onClick={handleSaveFile}>
                  <Save size={14} aria-hidden="true" />
                  <span>Save File</span>
                  <span className="ml-auto text-[11px] text-muted">Ctrl+S</span>
                </button>
                <div className="my-1 border-t border-line" />
                <button className="file-menu-item" disabled={!canOpenFolder} onClick={handleOpenFolder}>
                  <FolderOpen size={14} aria-hidden="true" />
                  <span>Add Source Folder...</span>
                </button>
                <button className="file-menu-item" disabled>
                  <RefreshCw size={14} aria-hidden="true" />
                  <span>Rescan Source Folder</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="relative flex h-full">
            <button
              className={`menu-item ${openMenu === "edit" ? "menu-item-active" : ""}`}
              onClick={() => setOpenMenu((menu) => (menu === "edit" ? null : "edit"))}
            >
              Edit
            </button>
            {openMenu === "edit" ? (
              <div className="file-menu">
                <button className="file-menu-item" disabled={!canUndo} onClick={handleUndo}>
                  <Undo2 size={14} aria-hidden="true" />
                  <span>{undoLabel}</span>
                  <span className="ml-auto text-[11px] text-muted">Ctrl+Z</span>
                </button>
                <button className="file-menu-item" disabled={!canRedo} onClick={handleRedo}>
                  <Redo2 size={14} aria-hidden="true" />
                  <span>{redoLabel}</span>
                  <span className="ml-auto text-[11px] text-muted">Ctrl+Y</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="relative flex h-full">
            <button
              className={`menu-item ${openMenu === "view" ? "menu-item-active" : ""}`}
              onClick={() => setOpenMenu((menu) => (menu === "view" ? null : "view"))}
            >
              View
            </button>
            {openMenu === "view" ? (
              <div className="file-menu">
                <button className="file-menu-item" onClick={handleOpenSettings}>
                  <Settings size={14} aria-hidden="true" />
                  <span>Settings</span>
                </button>
              </div>
            ) : null}
          </div>
          {menuItems.map((item) => (
            <button className="menu-item" key={item}>
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className={`inventory-status-pill ${activeInventoryName ? "inventory-status-pill-open" : ""}`}>
          <span className="inventory-status-light" aria-hidden="true" />
          <span>{activeInventoryName ? `Inventory / ${activeInventoryName}` : "No Inventory Open"}</span>
        </span>
      </div>
    </header>
  );
}
