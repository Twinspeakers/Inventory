import type { Dispatch, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EditorSaveState } from "../../features/editors";
import type {
  ActiveInventory,
  InventoryDocumentEntry,
  InventoryDocumentsState,
} from "../../features/inventoryProject";
import { mergeScannedAssets } from "../../features/libraryTree/libraryTreeModel";
import type { SceneMode } from "../../features/sceneViewer";
import type {
  Asset,
  PersistedOpenedNvdDocument,
  ScanResult,
  SourceFolder,
  VirtualFolder,
} from "../appTypes";
import {
  findInventoryNvdDocumentForAsset,
  normalizePath,
  removeAssetIdsFromVirtualFolders,
  removeInventoryDocumentEntry,
  upsertInventoryDocumentEntry,
} from "../workspace/workspaceState";

export function useInventoryDocumentActions({
  activeInventory,
  activeNvdDocument,
  activeNvdDocumentPath,
  assets,
  hasUnsavedNvdChanges,
  inventoryDocuments,
  sourceFolders,
  visibleAssets,
  cancelPendingLibrarySave,
  changeSceneMode,
  setActiveNvdDocument,
  setActiveNvdDocumentPath,
  setInventoryDocuments,
  setNvdSaveState,
  setScanResult,
  setSelectedId,
  setSourceFolders,
  setStatusMessage,
  setVirtualFolders,
}: {
  activeInventory: ActiveInventory | null;
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeNvdDocumentPath: string | null;
  assets: Asset[];
  hasUnsavedNvdChanges: boolean;
  inventoryDocuments: InventoryDocumentsState;
  sourceFolders: SourceFolder[];
  visibleAssets: Asset[];
  cancelPendingLibrarySave: () => void;
  changeSceneMode: (mode: SceneMode) => void;
  setActiveNvdDocument: Dispatch<SetStateAction<PersistedOpenedNvdDocument | null>>;
  setActiveNvdDocumentPath: Dispatch<SetStateAction<string | null>>;
  setInventoryDocuments: Dispatch<SetStateAction<InventoryDocumentsState>>;
  setNvdSaveState: Dispatch<SetStateAction<EditorSaveState>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setSourceFolders: Dispatch<SetStateAction<SourceFolder[]>>;
  setStatusMessage: (message: string) => void;
  setVirtualFolders: Dispatch<SetStateAction<VirtualFolder[]>>;
}) {
  async function renameInventoryNvdDocument(assetId: number) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const entry = asset ? findInventoryNvdDocumentForAsset(asset, inventoryDocuments) : null;

    if (!activeInventory || !asset || !entry) {
      setStatusMessage("That Inventory-owned NVD document could not be found.");
      return;
    }

    const title = window.prompt("Rename NVD document", entry.title);
    const trimmedTitle = title?.trim();

    if (!trimmedTitle) {
      return;
    }

    await renameInventoryNvdDocumentTo(assetId, trimmedTitle);
  }

  async function renameInventoryNvdDocumentTo(assetId: number, title: string) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const entry = asset ? findInventoryNvdDocumentForAsset(asset, inventoryDocuments) : null;

    if (!activeInventory || !asset || !entry) {
      setStatusMessage("That Inventory-owned NVD document could not be found.");
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle || trimmedTitle === entry.title) {
      return;
    }

    const isActiveDocument = activeNvdDocumentPath !== null && normalizePath(activeNvdDocumentPath) === normalizePath(entry.path);
    cancelPendingLibrarySave();
    setStatusMessage(`Renaming NVD document "${entry.title}"...`);

    if (isActiveDocument) {
      setNvdSaveState("saving");
    }

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("rename_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        path: entry.path,
        title: trimmedTitle,
        document: isActiveDocument ? activeNvdDocument?.document ?? null : null,
      });

      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: upsertInventoryDocumentEntry(
          removeInventoryDocumentEntry(documents.nvdDocuments, entry),
          openedDocument.entry,
        ),
      }));
      setScanResult((currentScanResult) => ({
        root_path: currentScanResult?.root_path ?? sourceFolders[0]?.path ?? "",
        assets: mergeScannedAssets(
          (currentScanResult?.assets ?? []).filter(
            (currentAsset) => currentAsset.id !== entry.assetId && normalizePath(currentAsset.path) !== normalizePath(entry.path),
          ),
          [openedDocument.asset],
        ),
        skipped_entries: currentScanResult?.skipped_entries ?? 0,
      }));
      setVirtualFolders((folders) =>
        removeAssetIdsFromVirtualFolders(folders, new Set([entry.assetId, openedDocument.entry.assetId])),
      );
      setSourceFolders((folders) =>
        folders.map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter(
            (candidate) => candidate !== entry.assetId && candidate !== openedDocument.entry.assetId,
          ),
        })),
      );
      setSelectedId((selectedAssetId) => (selectedAssetId === entry.assetId ? openedDocument.entry.assetId : selectedAssetId));

      if (isActiveDocument) {
        setActiveNvdDocumentPath(openedDocument.path);
        setActiveNvdDocument(openedDocument);
        setNvdSaveState("saved");
      }

      setStatusMessage(`Renamed NVD document "${entry.title}" to "${openedDocument.document.title}".`);
    } catch (error) {
      if (isActiveDocument) {
        setNvdSaveState("error");
      }
      setStatusMessage(`Could not rename NVD document: ${String(error)}`);
    }
  }

  async function deleteInventoryNvdDocument(assetId: number) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const entry = asset ? findInventoryNvdDocumentForAsset(asset, inventoryDocuments) : null;

    if (!activeInventory || !asset || !entry) {
      setStatusMessage("That Inventory-owned NVD document could not be found.");
      return;
    }

    const isActiveDocument = activeNvdDocumentPath !== null && normalizePath(activeNvdDocumentPath) === normalizePath(entry.path);
    const unsavedWarning = isActiveDocument && hasUnsavedNvdChanges ? " Unsaved changes will be lost." : "";
    const message = `Permanently delete "${entry.title}" from this Inventory? This deletes the Inventory-owned .nvd file from disk and cannot be undone.${unsavedWarning}`;

    if (!window.confirm(message)) {
      return;
    }

    cancelPendingLibrarySave();
    setStatusMessage(`Deleting NVD document "${entry.title}"...`);

    try {
      const deletedEntry = await invoke<InventoryDocumentEntry>("delete_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        path: entry.path,
      });
      const nextSelectedAssetId =
        visibleAssets.find((candidate) => candidate.id !== deletedEntry.assetId)?.id ??
        assets.find((candidate) => candidate.id !== deletedEntry.assetId)?.id ??
        null;

      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: removeInventoryDocumentEntry(documents.nvdDocuments, deletedEntry),
      }));
      setScanResult((currentScanResult) =>
        currentScanResult
          ? {
              ...currentScanResult,
              assets: currentScanResult.assets.filter(
                (currentAsset) =>
                  currentAsset.id !== deletedEntry.assetId &&
                  normalizePath(currentAsset.path) !== normalizePath(deletedEntry.path),
              ),
            }
          : currentScanResult,
      );
      setVirtualFolders((folders) => removeAssetIdsFromVirtualFolders(folders, new Set([deletedEntry.assetId])));
      setSourceFolders((folders) =>
        folders.map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter((candidate) => candidate !== deletedEntry.assetId),
        })),
      );
      setSelectedId((selectedAssetId) => (selectedAssetId === deletedEntry.assetId ? nextSelectedAssetId : selectedAssetId));

      if (isActiveDocument) {
        setActiveNvdDocumentPath(null);
        setActiveNvdDocument(null);
        setNvdSaveState("idle");
        changeSceneMode("preview");
      }

      setStatusMessage(`Deleted Inventory-owned NVD document "${entry.title}".`);
    } catch (error) {
      setStatusMessage(`Could not delete NVD document: ${String(error)}`);
    }
  }

  return {
    deleteInventoryNvdDocument,
    renameInventoryNvdDocument,
    renameInventoryNvdDocumentTo,
  };
}

