import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  EMPTY_SESSION_HISTORY,
  addSessionHistoryCommand,
  type EditorSaveState,
  type SessionHistory,
  type SessionHistoryCommand,
} from "../../features/editors";
import type {
  ActiveInventory,
  InventoryDocumentsState,
  NvvDocument,
  NvvDocumentChangeOptions,
} from "../../features/inventoryProject";
import type {
  PersistedLibraryState,
  PersistedOpenedNvvDocument,
  PersistedWorkspaceState,
  ScanResult,
  SourceFolder,
  UndoContext,
} from "../appTypes";
import { mergeAssetsIntoScanResult } from "../library/scanResultState";
import { upsertInventoryDocumentEntry } from "../workspace/workspaceState";

export function useNvvDocumentSession({
  activeInventory,
  currentLibraryState,
  currentWorkspaceState,
  hasUnsavedNvdChanges,
  sourceFolders,
  cancelPendingLibrarySave,
  changeSceneMode,
  openTreeNodePath,
  setActiveView,
  setInventoryDocuments,
  setScanResult,
  setSelectedFolderId,
  setSelectedId,
  setStatusMessage,
  setUndoContext,
}: {
  activeInventory: ActiveInventory | null;
  currentLibraryState: PersistedLibraryState;
  currentWorkspaceState: PersistedWorkspaceState;
  hasUnsavedNvdChanges: boolean;
  sourceFolders: SourceFolder[];
  cancelPendingLibrarySave: () => void;
  changeSceneMode: (mode: "preview" | "nvd-document" | "nvv-document") => void;
  openTreeNodePath: (nodeIds: string[]) => void;
  setActiveView: (view: "inventory-files" | "inventory-documents" | "inventory-vectors" | "all" | "inbox") => void;
  setInventoryDocuments: Dispatch<SetStateAction<InventoryDocumentsState>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setStatusMessage: (message: string) => void;
  setUndoContext: Dispatch<SetStateAction<UndoContext>>;
}) {
  const [activeNvvDocument, setActiveNvvDocument] = useState<PersistedOpenedNvvDocument | null>(null);
  const [nvvSaveState, setNvvSaveState] = useState<EditorSaveState>("idle");
  const [nvvHistory, setNvvHistory] = useState<SessionHistory>(EMPTY_SESSION_HISTORY);

  function applyNvvDocumentFromHistory(document: NvvDocument) {
    setActiveNvvDocument((opened) => (opened ? { ...opened, document } : opened));
    setNvvSaveState("dirty");
    setUndoContext("nvv");
  }

  function addNvvHistoryCommand(command: SessionHistoryCommand) {
    setUndoContext("nvv");
    setNvvHistory((history) => addSessionHistoryCommand(history, command));
  }

  async function openNvvDocumentFromAsset(asset: { name: string; path: string }) {
    if (hasUnsavedNvdChanges && !window.confirm("Discard unsaved NVD changes and open this NVV vector?")) {
      return;
    }
    setStatusMessage(`Opening NVV vector "${asset.name}"...`);
    try {
      const openedDocument = await invoke<PersistedOpenedNvvDocument>("open_nvv_document", { path: asset.path });
      rememberOpenedNvvDocument(openedDocument);
      setNvvSaveState("idle");
      setNvvHistory(EMPTY_SESSION_HISTORY);
      setUndoContext("nvv");
      changeSceneMode("nvv-document");
      setStatusMessage(`Opened NVV vector "${openedDocument.document.title}".`);
    } catch (error) {
      setNvvSaveState("error");
      setStatusMessage(`Could not open NVV vector: ${String(error)}`);
    }
  }

  function rememberOpenedNvvDocument(openedDocument: PersistedOpenedNvvDocument, registerEntry = false) {
    setActiveNvvDocument(openedDocument);
    if (registerEntry) {
      setInventoryDocuments((documents) => ({
        ...documents,
        nvvDocuments: upsertInventoryDocumentEntry(documents.nvvDocuments, openedDocument.entry),
      }));
    }
    setScanResult((currentScanResult) => mergeAssetsIntoScanResult(currentScanResult, sourceFolders, [openedDocument.asset]));
  }

  function updateActiveNvvDocument(document: NvvDocument, options?: NvvDocumentChangeOptions) {
    setActiveNvvDocument((opened) => (opened ? { ...opened, document } : opened));
    setNvvSaveState("dirty");
    setUndoContext("nvv");

    if (options?.history) {
      const beforeDocument = options.history.before;
      const afterDocument = document;
      addNvvHistoryCommand({
        label: options.history.label,
        redo: () => applyNvvDocumentFromHistory(afterDocument),
        undo: () => applyNvvDocumentFromHistory(beforeDocument),
      });
    }
  }

  async function saveActiveNvvDocument() {
    if (!activeNvvDocument) return false;
    setNvvSaveState("saving");
    try {
      const opened = await invoke<PersistedOpenedNvvDocument>("save_nvv_document", {
        path: activeNvvDocument.path,
        document: activeNvvDocument.document,
        inventoryManifestPath: activeInventory?.manifestPath ?? null,
      });
      rememberOpenedNvvDocument(opened, true);
      setNvvSaveState("saved");
      setStatusMessage(`Saved NVV vector "${opened.document.title}".`);
      return true;
    } catch (error) {
      setNvvSaveState("error");
      setStatusMessage(`Could not save NVV vector: ${String(error)}`);
      return false;
    }
  }

  async function closeActiveNvvDocument() {
    if ((nvvSaveState === "dirty" || nvvSaveState === "error") && !window.confirm("Discard unsaved NVV changes?")) {
      return;
    }
    cancelPendingLibrarySave();
    if (activeInventory) {
      try {
        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: {
            ...currentWorkspaceState,
            sceneMode: "preview",
            selectedAssetId: null,
          },
        });
      } catch (error) {
        setStatusMessage(`Could not close NVV vector: ${String(error)}`);
        return;
      }
    }
    setActiveNvvDocument(null);
    setNvvSaveState("idle");
    setNvvHistory(EMPTY_SESSION_HISTORY);
    setSelectedId(null);
    changeSceneMode("preview");
    setStatusMessage("Closed NVV vector.");
  }

  async function handleNewNvvDocument() {
    if (!activeInventory) {
      setStatusMessage("Open or create an Inventory before creating an NVV vector.");
      return;
    }
    const title = window.prompt("Name this NVV vector", "Untitled Vector");
    if (!title?.trim()) return;
    try {
      const opened = await invoke<PersistedOpenedNvvDocument>("create_nvv_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        title,
      });
      rememberOpenedNvvDocument(opened, true);
      openTreeNodePath(["inventory-files", "inventory-vectors"]);
      setSelectedFolderId(null);
      setActiveView("inventory-vectors");
      setSelectedId(opened.asset.id);
      setNvvSaveState("idle");
      changeSceneMode("nvv-document");
      setStatusMessage(`Created NVV vector "${opened.document.title}".`);
    } catch (error) {
      setStatusMessage(`Could not create NVV vector: ${String(error)}`);
    }
  }

  function clearNvvDocument() {
    setActiveNvvDocument(null);
    setNvvSaveState("idle");
    setNvvHistory(EMPTY_SESSION_HISTORY);
  }

  return {
    activeNvvDocument,
    nvvHistory,
    nvvSaveState,
    clearNvvDocument,
    closeActiveNvvDocument,
    handleNewNvvDocument,
    openNvvDocumentFromAsset,
    rememberOpenedNvvDocument,
    saveActiveNvvDocument,
    setNvvHistory,
    updateActiveNvvDocument,
  };
}

