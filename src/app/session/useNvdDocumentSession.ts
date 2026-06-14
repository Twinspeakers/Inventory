import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LibraryView } from "../../features/assetShelf";
import type { EditorSaveState } from "../../features/editors";
import type {
  ActiveInventory,
  InventoryDocumentsState,
  NvdDocument,
} from "../../features/inventoryProject";
import type { NvdEditorController } from "../../features/nvdEditor";
import type { SceneMode } from "../../features/sceneViewer";
import type {
  Asset,
  PersistedLibraryState,
  PersistedOpenedNvdDocument,
  PersistedWorkspaceState,
  ScanResult,
  SourceFolder,
} from "../appTypes";
import { mergeAssetsIntoScanResult } from "../library/scanResultState";
import {
  isInventoryOwnedDocumentPath,
  upsertInventoryDocumentEntry,
} from "../workspace/workspaceState";

export function useNvdDocumentSession({
  activeInventory,
  activeNvdDocument,
  activeNvdDocumentPath,
  currentLibraryState,
  currentWorkspaceState,
  hasUnsavedNvdChanges,
  nvvSaveState,
  sourceFolders,
  cancelPendingLibrarySave,
  changeSceneMode,
  clearNvdStyleSelection,
  clearNvdTextSelection,
  handleNvdEditorControllerChange,
  loadNvdStyleDefinitions,
  openTreeNodePath,
  setActiveNvdDocument,
  setActiveNvdDocumentPath,
  setActiveView,
  setInventoryDocuments,
  setNvdSaveState,
  setScanResult,
  setSelectedFolderId,
  setSelectedId,
  setStatusMessage,
}: {
  activeInventory: ActiveInventory | null;
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeNvdDocumentPath: string | null;
  currentLibraryState: PersistedLibraryState;
  currentWorkspaceState: PersistedWorkspaceState;
  hasUnsavedNvdChanges: boolean;
  nvvSaveState: EditorSaveState;
  sourceFolders: SourceFolder[];
  cancelPendingLibrarySave: () => void;
  changeSceneMode: (mode: SceneMode) => void;
  clearNvdStyleSelection: () => void;
  clearNvdTextSelection: () => void;
  handleNvdEditorControllerChange: (controller: NvdEditorController | null) => void;
  loadNvdStyleDefinitions: (styles: NvdDocument["styles"]) => void;
  openTreeNodePath: (nodeIds: string[]) => void;
  setActiveNvdDocument: Dispatch<SetStateAction<PersistedOpenedNvdDocument | null>>;
  setActiveNvdDocumentPath: Dispatch<SetStateAction<string | null>>;
  setActiveView: Dispatch<SetStateAction<LibraryView>>;
  setInventoryDocuments: Dispatch<SetStateAction<InventoryDocumentsState>>;
  setNvdSaveState: Dispatch<SetStateAction<EditorSaveState>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setStatusMessage: (message: string) => void;
}) {
  const [isNvdCloseConfirmationOpen, setIsNvdCloseConfirmationOpen] = useState(false);

  function rememberOpenedNvdDocument(openedDocument: PersistedOpenedNvdDocument, registerEntry = false) {
    setActiveNvdDocumentPath(openedDocument.path);
    setActiveNvdDocument(openedDocument);
    loadNvdStyleDefinitions(openedDocument.document.styles);

    if (registerEntry) {
      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: upsertInventoryDocumentEntry(documents.nvdDocuments, openedDocument.entry),
      }));
    }

    setScanResult((currentScanResult) => mergeAssetsIntoScanResult(currentScanResult, sourceFolders, [openedDocument.asset]));
  }

  async function restoreNvdDocumentFromWorkspace(path: string) {
    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("open_nvd_document", { path });
      rememberOpenedNvdDocument(openedDocument);
      setNvdSaveState("idle");
    } catch (error) {
      setActiveNvdDocumentPath(null);
      setNvdSaveState("error");
      setStatusMessage(`Could not reopen the Inventory's active NVD document: ${String(error)}`);
    }
  }

  async function openNvdDocumentFromAsset(asset: Asset) {
    if ((nvvSaveState === "dirty" || nvvSaveState === "error") && !window.confirm("Discard unsaved NVV changes and open this NVD document?")) {
      return;
    }
    if (activeNvdDocumentPath === asset.path) {
      changeSceneMode("nvd-document");
      return;
    }

    if (hasUnsavedNvdChanges && !window.confirm("Discard unsaved NVD changes and open another document?")) {
      return;
    }

    setStatusMessage(`Opening NVD document "${asset.name}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("open_nvd_document", { path: asset.path });
      rememberOpenedNvdDocument(openedDocument);
      setNvdSaveState("idle");
      changeSceneMode("nvd-document");
      setStatusMessage(`Opened NVD document "${openedDocument.document.title}".`);
    } catch (error) {
      setNvdSaveState("error");
      setStatusMessage(`Could not open NVD document: ${String(error)}`);
    }
  }

  function updateActiveNvdDocument(document: NvdDocument) {
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...document,
              styles: document.styles ?? openedDocument.document.styles,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
  }

  async function saveActiveNvdDocument() {
    if (!activeNvdDocument) {
      setStatusMessage("No NVD document is open.");
      return false;
    }

    const document = {
      ...activeNvdDocument.document,
      title: activeNvdDocument.document.title.trim(),
    };

    if (!document.title) {
      setNvdSaveState("error");
      setStatusMessage("NVD document title cannot be empty.");
      return false;
    }

    setNvdSaveState("saving");
    setStatusMessage(`Saving NVD document "${document.title}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("save_nvd_document", {
        path: activeNvdDocument.path,
        document,
        inventoryManifestPath: activeInventory?.manifestPath ?? null,
      });

      rememberOpenedNvdDocument(openedDocument, isInventoryOwnedDocumentPath(openedDocument.path, activeInventory));
      setNvdSaveState("saved");
      setStatusMessage(`Saved NVD document "${document.title}".`);
      return true;
    } catch (error) {
      setNvdSaveState("error");
      setStatusMessage(`Could not save NVD document: ${String(error)}`);
      return false;
    }
  }

  function requestCloseActiveNvdDocument() {
    if (!activeNvdDocument) {
      return;
    }

    if (hasUnsavedNvdChanges) {
      setIsNvdCloseConfirmationOpen(true);
      return;
    }

    void closeActiveNvdDocument();
  }

  async function closeActiveNvdDocument() {
    const title = activeNvdDocument?.document.title;
    const closedWorkspaceState: PersistedWorkspaceState = {
      ...currentWorkspaceState,
      activeNvdDocumentPath: null,
      leftPaneView: "library",
      sceneMode: "preview",
      selectedAssetId: null,
    };

    cancelPendingLibrarySave();
    setStatusMessage(title ? `Closing NVD document "${title}"...` : "Closing NVD document...");

    if (activeInventory) {
      try {
        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: closedWorkspaceState,
        });
      } catch (error) {
        setStatusMessage(`Could not close NVD document: ${String(error)}`);
        return;
      }
    }

    setIsNvdCloseConfirmationOpen(false);
    setActiveNvdDocument(null);
    setActiveNvdDocumentPath(null);
    setSelectedId(null);
    clearNvdTextSelection();
    clearNvdStyleSelection();
    handleNvdEditorControllerChange(null);
    setNvdSaveState("idle");
    changeSceneMode("preview");
    setStatusMessage(title ? `Closed NVD document "${title}".` : "Closed NVD document.");
  }

  async function saveAndCloseActiveNvdDocument() {
    if (await saveActiveNvdDocument()) {
      await closeActiveNvdDocument();
    }
  }

  async function handleNewNvdDocument() {
    if (!activeInventory) {
      setStatusMessage("Open or create an Inventory before creating an NVD document.");
      return;
    }

    const title = window.prompt("Name this NVD document", "Untitled Document");

    if (title === null) {
      setStatusMessage("New NVD document cancelled.");
      return;
    }

    if (!title.trim()) {
      setStatusMessage("NVD document title cannot be empty.");
      return;
    }

    setStatusMessage(`Creating NVD document "${title.trim()}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("create_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        title,
      });

      rememberOpenedNvdDocument(openedDocument, true);
      openTreeNodePath(["inventory-files", "inventory-documents"]);
      setSelectedFolderId(null);
      setActiveView("inventory-documents");
      setSelectedId(openedDocument.asset.id);
      setNvdSaveState("idle");
      changeSceneMode("nvd-document");
      setStatusMessage(`Created NVD document "${openedDocument.document.title}" at ${openedDocument.path}.`);
    } catch (error) {
      setStatusMessage(`Could not create NVD document: ${String(error)}`);
    }
  }

  return {
    closeActiveNvdDocument,
    handleNewNvdDocument,
    isNvdCloseConfirmationOpen,
    openNvdDocumentFromAsset,
    requestCloseActiveNvdDocument,
    restoreNvdDocumentFromWorkspace,
    saveActiveNvdDocument,
    saveAndCloseActiveNvdDocument,
    setIsNvdCloseConfirmationOpen,
    updateActiveNvdDocument,
  };
}

