import type { Dispatch, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getBaseName } from "../../libraryCatalog/tag-inference";
import type { LibraryView } from "../../features/assetShelf";
import type { ActiveInventory, InventoryDocumentsState } from "../../features/inventoryProject";
import {
  createDefaultTopLevelLibraryNodesForAssets,
  getSourceFolderId,
  mergeScannedAssets,
} from "../../features/libraryTree/libraryTreeModel";
import type {
  ScanResult,
  SourceFolder,
  VirtualFolder,
} from "../appTypes";
import { removeAssetIdsFromVirtualFolders } from "../workspace/workspaceState";
import { normalizePath } from "../workspace/workspaceState";

export function useSourceFolderActions({
  activeInventory,
  autoSeedLibraryStructureEnabled,
  inventoryDocuments,
  scanResult,
  selectedId,
  sourceFolders,
  virtualFolders,
  selectView,
  setActiveView,
  setIsScanning,
  setScanResult,
  setSelectedFolderId,
  setSelectedId,
  setSourceFolders,
  setStatusMessage,
  setVirtualFolders,
}: {
  activeInventory: ActiveInventory | null;
  autoSeedLibraryStructureEnabled: boolean;
  inventoryDocuments: InventoryDocumentsState;
  scanResult: ScanResult | null;
  selectedId: number | null;
  sourceFolders: SourceFolder[];
  virtualFolders: VirtualFolder[];
  selectView: (view: LibraryView) => void;
  setActiveView: Dispatch<SetStateAction<LibraryView>>;
  setIsScanning: Dispatch<SetStateAction<boolean>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setSourceFolders: Dispatch<SetStateAction<SourceFolder[]>>;
  setStatusMessage: (message: string) => void;
  setVirtualFolders: Dispatch<SetStateAction<VirtualFolder[]>>;
}) {
  async function syncSourceFolders({
    sourceIds,
    silentNoChanges = false,
    startMessage,
    background = false,
  }: {
    sourceIds?: string[];
    silentNoChanges?: boolean;
    startMessage?: string;
    background?: boolean;
  } = {}) {
    const requestedIds = sourceIds ? new Set(sourceIds) : null;
    const foldersToRefresh = sourceFolders.filter((candidate) => !requestedIds || requestedIds.has(candidate.id));

    if (foldersToRefresh.length === 0) {
      if (!silentNoChanges) {
        setStatusMessage("That source folder is no longer loaded.");
      }
      return false;
    }

    if (!background) {
      setIsScanning(true);
    }

    if (startMessage) {
      setStatusMessage(startMessage);
    }

    try {
      const results = await Promise.all(foldersToRefresh.map((folder) => invoke<ScanResult>("scan_folder", { path: folder.path })));
      const resultById = new Map(foldersToRefresh.map((folder, index) => [folder.id, results[index]]));
      let totalAdded = 0;
      let totalRemoved = 0;
      let totalSkippedEntries = 0;
      let changedFolderCount = 0;
      let nextSourceFoldersChanged = false;

      const nextSourceFolders = sourceFolders.map((candidate) => {
        const result = resultById.get(candidate.id);

        if (!result) {
          return candidate;
        }

        const refreshedAssetIds = result.assets.map((asset) => asset.id);
        const refreshedAssetIdSet = new Set(refreshedAssetIds);
        const previousAssetIdSet = new Set(candidate.assetIds);
        const addedCount = refreshedAssetIds.filter((assetId) => !previousAssetIdSet.has(assetId)).length;
        const removedCount = candidate.assetIds.filter((assetId) => !refreshedAssetIdSet.has(assetId)).length;
        const nextName = getBaseName(result.root_path);
        const folderChanged =
          addedCount > 0 ||
          removedCount > 0 ||
          candidate.path !== result.root_path ||
          candidate.name !== nextName ||
          candidate.skippedEntries !== result.skipped_entries ||
          candidate.assetIds.length !== refreshedAssetIds.length ||
          candidate.assetIds.some((assetId, index) => assetId !== refreshedAssetIds[index]);

        totalAdded += addedCount;
        totalRemoved += removedCount;
        totalSkippedEntries += result.skipped_entries;
        if (folderChanged) {
          changedFolderCount += 1;
          nextSourceFoldersChanged = true;
          return {
            ...candidate,
            assetIds: refreshedAssetIds,
            name: nextName,
            path: result.root_path,
            skippedEntries: result.skipped_entries,
          };
        }

        return candidate;
      });

      const referencedAssetIds = new Set([
        ...nextSourceFolders.flatMap((candidate) => candidate.assetIds),
        ...inventoryDocuments.nvdDocuments.map((document) => document.assetId),
        ...inventoryDocuments.nvvDocuments.map((document) => document.assetId),
      ]);
      const mergedAssets = mergeScannedAssets(scanResult?.assets ?? [], results.flatMap((result) => result.assets));
      const nextAssets = mergedAssets.filter((asset) => referencedAssetIds.has(asset.id));
      const removedAssetIds = new Set((scanResult?.assets ?? []).map((asset) => asset.id).filter((assetId) => !referencedAssetIds.has(assetId)));

      if (nextSourceFoldersChanged) {
        setSourceFolders(nextSourceFolders);
      }
      setScanResult({
        root_path: nextSourceFolders[0]?.path ?? "",
        assets: nextAssets,
        skipped_entries: nextSourceFolders.reduce((total, candidate) => total + candidate.skippedEntries, 0),
      });

      if (removedAssetIds.size > 0) {
        setVirtualFolders((folders) => removeAssetIdsFromVirtualFolders(folders, removedAssetIds));
      }

      if (!selectedId || !referencedAssetIds.has(selectedId)) {
        setSelectedFolderId(null);
        setActiveView("all");
        setSelectedId(nextAssets[0]?.id ?? null);
      }

      const hasChanges = totalAdded > 0 || totalRemoved > 0 || changedFolderCount > 0;
      if (!silentNoChanges || hasChanges) {
        const folderLabel =
          foldersToRefresh.length === 1 ? `"${foldersToRefresh[0].name}"` : `${foldersToRefresh.length} source folders`;
        const refreshedAssetCount = results.reduce((total, result) => total + result.assets.length, 0);
        const parts = [
          `Updated ${folderLabel}. ${refreshedAssetCount} supported asset${refreshedAssetCount === 1 ? "" : "s"} found.`,
          totalAdded > 0 ? `${totalAdded} new.` : "",
          totalRemoved > 0 ? `${totalRemoved} removed.` : "",
          totalSkippedEntries > 0 ? `${totalSkippedEntries} unreadable entr${totalSkippedEntries === 1 ? "y" : "ies"} skipped.` : "",
        ].filter(Boolean);
        setStatusMessage(parts.join(" "));
      }

      return true;
    } catch (error) {
      setStatusMessage(`Could not refresh source folder${foldersToRefresh.length === 1 ? "" : "s"}: ${String(error)}`);
      return false;
    } finally {
      if (!background) {
        setIsScanning(false);
      }
    }
  }

  function removeSourceFolder(sourceId: string) {
    const folder = sourceFolders.find((candidate) => candidate.id === sourceId);

    if (!folder) {
      setStatusMessage("That source folder is no longer loaded.");
      return;
    }

    const remainingSourceFolders = sourceFolders.filter((candidate) => candidate.id !== sourceId);
    const remainingAssetIds = new Set([
      ...remainingSourceFolders.flatMap((candidate) => candidate.assetIds),
      ...inventoryDocuments.nvdDocuments.map((document) => document.assetId),
      ...inventoryDocuments.nvvDocuments.map((document) => document.assetId),
    ]);
    const currentAssets = scanResult?.assets ?? [];
    const nextAssets = currentAssets.filter((asset) => remainingAssetIds.has(asset.id));
    const removedAssetCount = currentAssets.length - nextAssets.length;

    const message =
      removedAssetCount > 0
        ? `Remove "${folder.name}" from Source Folders? ${removedAssetCount} asset${
            removedAssetCount === 1 ? "" : "s"
          } only loaded from this folder will leave the current library. No disk files will be touched.`
        : `Remove "${folder.name}" from Source Folders? No disk files will be touched.`;

    if (!window.confirm(message)) {
      return;
    }

    setSourceFolders(remainingSourceFolders);
    setScanResult({
      root_path: remainingSourceFolders[0]?.path ?? "",
      assets: nextAssets,
      skipped_entries: remainingSourceFolders.reduce((total, candidate) => total + candidate.skippedEntries, 0),
    });

    if (!selectedId || !remainingAssetIds.has(selectedId)) {
      setSelectedFolderId(null);
      setActiveView("all");
      setSelectedId(nextAssets[0]?.id ?? null);
    }

    setStatusMessage(
      `Removed source folder "${folder.name}" from Inventory. ${
        removedAssetCount > 0 ? `${removedAssetCount} asset${removedAssetCount === 1 ? "" : "s"} left the current library. ` : ""
      }No disk files were touched.`,
    );
  }

  async function refreshSourceFolder(sourceId: string) {
    const folder = sourceFolders.find((candidate) => candidate.id === sourceId);

    if (!folder) {
      setStatusMessage("That source folder is no longer loaded.");
      return;
    }
    await syncSourceFolders({
      sourceIds: [sourceId],
      startMessage: `Refreshing "${folder.name}"...`,
    });
  }

  async function handleOpenFolder() {
    if (!activeInventory) {
      setStatusMessage("Create or open an Inventory before adding source folders.");
      return;
    }

    setIsScanning(true);
    setStatusMessage("Waiting for folder selection...");

    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: "Select an asset folder",
      });

      if (!selected) {
        setStatusMessage("Folder selection cancelled.");
        return;
      }

      const selectedPaths = Array.isArray(selected) ? selected : [selected];
      const newPaths = selectedPaths.filter((path) => !sourceFolders.some((folder) => normalizePath(folder.path) === normalizePath(path)));

      if (newPaths.length === 0) {
        setStatusMessage("Those source folders are already loaded.");
        return;
      }

      setStatusMessage(`Scanning ${newPaths.length} source folder${newPaths.length === 1 ? "" : "s"}...`);
      const results = await Promise.all(newPaths.map((path) => invoke<ScanResult>("scan_folder", { path })));
      const newlyScannedAssets = results.flatMap((result) => result.assets);
      const nextAssets = mergeScannedAssets(scanResult?.assets ?? [], newlyScannedAssets);
      const newSourceFolders = results.map((result) => ({
        id: getSourceFolderId(result.root_path),
        path: result.root_path,
        name: getBaseName(result.root_path),
        assetIds: result.assets.map((asset) => asset.id),
        skippedEntries: result.skipped_entries,
        enabled: true,
      }));
      const nextSourceFolders = [...sourceFolders, ...newSourceFolders];
      const defaultLibraryNodes =
        autoSeedLibraryStructureEnabled && sourceFolders.length === 0 && virtualFolders.length === 0
          ? createDefaultTopLevelLibraryNodesForAssets(newlyScannedAssets)
          : [];

      setScanResult({
        root_path: nextSourceFolders[0]?.path ?? "",
        assets: nextAssets,
        skipped_entries: nextSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0),
      });
      setSourceFolders(nextSourceFolders);
      if (defaultLibraryNodes.length > 0) {
        setVirtualFolders((folders) => (folders.length === 0 ? defaultLibraryNodes : folders));
      }
      selectView("all");
      setSelectedId((currentId) => currentId ?? results[0]?.assets[0]?.id ?? null);
      setStatusMessage(
        `${results.reduce((total, result) => total + result.assets.length, 0)} supported asset${
          results.reduce((total, result) => total + result.assets.length, 0) === 1 ? "" : "s"
        } added from ${newSourceFolders.length} source folder${newSourceFolders.length === 1 ? "" : "s"}. ${
          newSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0) > 0
            ? `${newSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0)} unreadable entries skipped.`
            : ""
        }${defaultLibraryNodes.length > 0 ? ` Created ${defaultLibraryNodes.length} top-level library folder${defaultLibraryNodes.length === 1 ? "" : "s"}.` : ""}`,
      );
    } catch (error) {
      setStatusMessage(`Could not scan folder: ${String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }

  function toggleSourceFolder(sourceId: string) {
    setSourceFolders((folders) => folders.map((folder) => (folder.id === sourceId ? { ...folder, enabled: !folder.enabled } : folder)));
  }

  return {
    handleOpenFolder,
    refreshSourceFolder,
    removeSourceFolder,
    syncSourceFolders,
    toggleSourceFolder,
  };
}

