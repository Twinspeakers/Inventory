import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  AssetSortKey,
  AssetViewMode,
  DetailsColumnWidths,
  SortDirection,
} from "../../features/assetShelf";
import {
  toActiveInventory,
  type ActiveInventory,
  type InventoryDocumentsState,
} from "../../features/inventoryProject";
import {
  assetShelfStorageKeys,
  layoutStorageKeys,
  projectStorageKeys,
  readStoredString,
  removeStoredString,
  storeString,
  storeStringSet,
} from "../workspace/appLayout";
import type {
  PersistedLibraryState,
  PersistedOpenedInventory,
  PersistedWorkspaceState,
} from "../appTypes";
import {
  createDefaultWorkspaceState,
  createEmptyLibraryState,
  getPersistedLibraryStateFromManifest,
} from "../workspace/workspaceState";

export function useAppPersistence({
  activeInventory,
  assetSortDirection,
  assetSortKey,
  assetViewMode,
  currentLibraryState,
  currentWorkspaceState,
  detailsColumnWidths,
  hasLoadedPersistedState,
  inventoryDocuments,
  saveTimer,
  treeOpenNodeIds,
  applyLibraryStateToWorkspace,
  setActiveInventory,
  setHasLoadedPersistedState,
  setInventoryDocuments,
  setStatusMessage,
}: {
  activeInventory: ActiveInventory | null;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assetViewMode: AssetViewMode;
  currentLibraryState: PersistedLibraryState;
  currentWorkspaceState: PersistedWorkspaceState;
  detailsColumnWidths: DetailsColumnWidths;
  hasLoadedPersistedState: boolean;
  inventoryDocuments: InventoryDocumentsState;
  saveTimer: MutableRefObject<number | null>;
  treeOpenNodeIds: Set<string>;
  applyLibraryStateToWorkspace: (state: PersistedLibraryState, message: string, workspaceState?: PersistedWorkspaceState) => void;
  setActiveInventory: Dispatch<SetStateAction<ActiveInventory | null>>;
  setHasLoadedPersistedState: Dispatch<SetStateAction<boolean>>;
  setInventoryDocuments: Dispatch<SetStateAction<InventoryDocumentsState>>;
  setStatusMessage: (message: string) => void;
}) {
  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeStringSet(layoutStorageKeys.treeOpenNodeIds, treeOpenNodeIds);
  }, [activeInventory, treeOpenNodeIds]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.sortKey, assetSortKey);
  }, [activeInventory, assetSortKey]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.sortDirection, assetSortDirection);
  }, [activeInventory, assetSortDirection]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.viewMode, assetViewMode);
  }, [activeInventory, assetViewMode]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.detailsColumnWidths, JSON.stringify(detailsColumnWidths));
  }, [activeInventory, detailsColumnWidths]);

  useEffect(() => {
    if (activeInventory) {
      storeString(projectStorageKeys.activeInventoryManifestPath, activeInventory.manifestPath);
    }
  }, [activeInventory]);

  useEffect(() => {
    let isMounted = true;

    async function loadPersistedState() {
      let startupWarning: string | null = null;

      try {
        const activeInventoryManifestPath = readStoredString(projectStorageKeys.activeInventoryManifestPath);

        if (activeInventoryManifestPath) {
          try {
            const openedInventory = await invoke<PersistedOpenedInventory>("open_inventory", {
              path: activeInventoryManifestPath,
            });

            if (!isMounted) {
              return;
            }

            setActiveInventory(toActiveInventory(openedInventory));
            setInventoryDocuments(openedInventory.manifest.documents);
            applyLibraryStateToWorkspace(
              getPersistedLibraryStateFromManifest(openedInventory.manifest),
              `Opened Inventory "${openedInventory.manifest.inventory.name}".`,
              openedInventory.manifest.workspaceState,
            );
            return;
          } catch (error) {
            removeStoredString(projectStorageKeys.activeInventoryManifestPath);
            startupWarning = `Could not reopen last Inventory: ${String(error)}`;
          }
        }

        if (!isMounted) {
          return;
        }

        applyLibraryStateToWorkspace(
          createEmptyLibraryState(),
          startupWarning ?? "No Inventory open.",
          createDefaultWorkspaceState(),
        );
      } catch (error) {
        if (isMounted) {
          setStatusMessage(`Could not load saved library: ${String(error)}`);
        }
      } finally {
        if (isMounted) {
          setHasLoadedPersistedState(true);
        }
      }
    }

    loadPersistedState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState) {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      try {
        if (!activeInventory) {
          return;
        }

        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: currentWorkspaceState,
        });
      } catch (error) {
        setStatusMessage(`Could not save library: ${String(error)}`);
      }
    }, 300);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [activeInventory, currentLibraryState, currentWorkspaceState, hasLoadedPersistedState, inventoryDocuments]);
}

