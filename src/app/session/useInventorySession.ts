import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  AssetSortKey,
  AssetViewMode,
  DetailsColumnWidths,
  LibraryView,
  SortDirection,
} from "../../features/assetShelf";
import type {
  ActiveInventory,
  InventoryDocumentsState,
} from "../../features/inventoryProject";
import { toActiveInventory } from "../../features/inventoryProject";
import {
  getBaseName,
} from "../../libraryCatalog/tag-inference";
import type {
  ModelInspectorResult,
  ModelTransform,
} from "../../sceneReaders/threeModelReader";
import type { LibraryNodeContextMenuState, SourceFolderContextMenuState } from "../shell/ContextMenus";
import {
  defaultTreeOpenNodeIds,
  isAssetSortKey,
  normalizeAssetViewMode,
  normalizeDetailsColumnWidths,
  normalizeModelTransformOverrides,
  projectStorageKeys,
  removeStoredString,
  storeString,
} from "../workspace/appLayout";
import type {
  AddLibraryNodePanelState,
  LeftPaneView,
  PersistedLibraryState,
  PersistedOpenedInventory,
  PersistedOpenedNvdDocument,
  PersistedWorkspaceState,
  ScanResult,
  SourceFolder,
  VirtualFolder,
} from "../appTypes";
import {
  createDefaultWorkspaceState,
  createEmptyLibraryState,
  getPersistedLibraryStateFromManifest,
  isLeftPaneView,
  isLibraryView,
  isSceneMode,
} from "../workspace/workspaceState";
import { ensureBuiltInLibrarySections, findFolder, getSourceFolderId, pruneStarterLibraryNodes } from "../../features/libraryTree/libraryTreeModel";
import type { EditorSaveState } from "../../features/editors";

export function useInventorySession({
  activeInventory,
  currentLibraryState,
  currentWorkspaceState,
  saveTimer,
  restoreNvdDocumentFromWorkspace,
  setActiveInventory,
  setActiveNvdDocument,
  setActiveNvdDocumentPath,
  setActiveView,
  setAddLibraryNodePanel,
  setAssetSearchQuery,
  setAssetSortDirection,
  setAssetSortKey,
  setAssetViewMode,
  setDetailsColumnWidths,
  setInventoryDocuments,
  setLeftPaneView,
  setLibraryNodeContextMenu,
  setModelInspectorResults,
  setModelTransformOverrides,
  setNvdSaveState,
  setScanResult,
  setSceneMode,
  setSelectedFolderId,
  setSelectedId,
  setHiddenDefaultLibraryViews,
  setSourceFolderContextMenu,
  setSourceFolders,
  setStatusMessage,
  setTreeOpenNodeIds,
  setProjectTagGroups,
  setRecentUserTagIds,
  setVirtualFolders,
}: {
  activeInventory: ActiveInventory | null;
  currentLibraryState: PersistedLibraryState;
  currentWorkspaceState: PersistedWorkspaceState;
  saveTimer: MutableRefObject<number | null>;
  restoreNvdDocumentFromWorkspace: (path: string) => void;
  setActiveInventory: Dispatch<SetStateAction<ActiveInventory | null>>;
  setActiveNvdDocument: Dispatch<SetStateAction<PersistedOpenedNvdDocument | null>>;
  setActiveNvdDocumentPath: Dispatch<SetStateAction<string | null>>;
  setActiveView: Dispatch<SetStateAction<LibraryView>>;
  setAddLibraryNodePanel: Dispatch<SetStateAction<AddLibraryNodePanelState | null>>;
  setAssetSearchQuery: Dispatch<SetStateAction<string>>;
  setAssetSortDirection: Dispatch<SetStateAction<SortDirection>>;
  setAssetSortKey: Dispatch<SetStateAction<AssetSortKey>>;
  setAssetViewMode: Dispatch<SetStateAction<AssetViewMode>>;
  setDetailsColumnWidths: Dispatch<SetStateAction<DetailsColumnWidths>>;
  setInventoryDocuments: Dispatch<SetStateAction<InventoryDocumentsState>>;
  setLeftPaneView: Dispatch<SetStateAction<LeftPaneView>>;
  setLibraryNodeContextMenu: Dispatch<SetStateAction<LibraryNodeContextMenuState | null>>;
  setModelInspectorResults: Dispatch<SetStateAction<Record<string, ModelInspectorResult>>>;
  setModelTransformOverrides: Dispatch<SetStateAction<Record<string, ModelTransform>>>;
  setNvdSaveState: Dispatch<SetStateAction<EditorSaveState>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSceneMode: Dispatch<SetStateAction<PersistedWorkspaceState["sceneMode"]>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setHiddenDefaultLibraryViews: Dispatch<SetStateAction<LibraryView[]>>;
  setSourceFolderContextMenu: Dispatch<SetStateAction<SourceFolderContextMenuState | null>>;
  setSourceFolders: Dispatch<SetStateAction<SourceFolder[]>>;
  setStatusMessage: (message: string) => void;
  setTreeOpenNodeIds: Dispatch<SetStateAction<Set<string>>>;
  setProjectTagGroups: Dispatch<SetStateAction<NonNullable<PersistedLibraryState["projectTagGroups"]>>>;
  setRecentUserTagIds: Dispatch<SetStateAction<NonNullable<PersistedLibraryState["recentUserTagIds"]>>>;
  setVirtualFolders: Dispatch<SetStateAction<VirtualFolder[]>>;
}) {
  function applyLibraryStateToWorkspace(state: PersistedLibraryState, message: string, workspaceState?: PersistedWorkspaceState) {
    const loadedSourceFolders =
      state.sourceFolders && state.sourceFolders.length > 0
        ? state.sourceFolders
        : state.rootPath
          ? [
              {
                id: getSourceFolderId(state.rootPath),
                path: state.rootPath,
                name: getBaseName(state.rootPath),
                assetIds: state.assets.map((asset) => asset.id),
                skippedEntries: 0,
                enabled: true,
              },
            ]
          : [];
    const nextVirtualFolders = ensureBuiltInLibrarySections(pruneStarterLibraryNodes(state.virtualFolders));
    const nextHiddenDefaultLibraryViews =
      Array.isArray(workspaceState?.hiddenDefaultLibraryViews)
        ? workspaceState.hiddenDefaultLibraryViews.filter(isLibraryView)
        : [];
    const persistedSelectedFolder =
      workspaceState?.selectedFolderId ? findFolder(nextVirtualFolders, workspaceState.selectedFolderId) : null;
    const defaultSectionSelectedFolderId =
      workspaceState?.activeView &&
      isLibraryView(workspaceState.activeView) &&
      findFolder(nextVirtualFolders, workspaceState.activeView) &&
      !nextHiddenDefaultLibraryViews.includes(workspaceState.activeView)
        ? workspaceState.activeView
        : null;
    const nextSelectedFolderId =
      persistedSelectedFolder && (!persistedSelectedFolder.builtinView || !nextHiddenDefaultLibraryViews.includes(persistedSelectedFolder.builtinView))
        ? persistedSelectedFolder.id
        : defaultSectionSelectedFolderId;
    const nextActiveView =
      workspaceState?.activeView &&
      isLibraryView(workspaceState.activeView) &&
      !nextHiddenDefaultLibraryViews.includes(workspaceState.activeView) &&
      !nextSelectedFolderId
        ? workspaceState.activeView
        : "all";
    const nextSelectedAssetId = workspaceState
      ? workspaceState.selectedAssetId !== null && state.assets.some((asset) => asset.id === workspaceState.selectedAssetId)
        ? workspaceState.selectedAssetId
        : null
      : state.assets[0]?.id ?? null;

    setScanResult({
      root_path: state.rootPath ?? "",
      assets: state.assets,
      skipped_entries: 0,
    });
    setProjectTagGroups(state.projectTagGroups ?? []);
    setRecentUserTagIds(state.recentUserTagIds ?? []);
    setSourceFolders(loadedSourceFolders);
    setVirtualFolders(nextVirtualFolders);
    setSelectedId(nextSelectedAssetId);
    setSelectedFolderId(nextSelectedFolderId);
    setActiveView(nextActiveView);
    const nextSceneMode = isSceneMode(workspaceState?.sceneMode) ? workspaceState.sceneMode : "preview";
    setSceneMode(nextSceneMode);
    setHiddenDefaultLibraryViews(nextHiddenDefaultLibraryViews);
    setLeftPaneView(
      nextSceneMode === "nvd-document"
        ? isLeftPaneView(workspaceState?.leftPaneView)
          ? workspaceState.leftPaneView
          : "library"
        : "library",
    );
    setAssetSearchQuery(workspaceState?.assetSearchQuery ?? "");
    setModelTransformOverrides(normalizeModelTransformOverrides(workspaceState?.modelTransformOverrides));
    setActiveNvdDocumentPath(workspaceState?.activeNvdDocumentPath ?? null);
    setActiveNvdDocument(null);
    setNvdSaveState("idle");

    if (workspaceState) {
      setTreeOpenNodeIds(
        new Set(
          workspaceState.treeOpenNodeIds.length > 0
            ? [...defaultTreeOpenNodeIds, ...workspaceState.treeOpenNodeIds]
            : defaultTreeOpenNodeIds,
        ),
      );
      setAssetSortKey(isAssetSortKey(workspaceState.assetSortKey) ? workspaceState.assetSortKey : "name");
      setAssetSortDirection(workspaceState.assetSortDirection === "desc" ? "desc" : "asc");
      setAssetViewMode(normalizeAssetViewMode(workspaceState.assetViewMode));
      setDetailsColumnWidths(normalizeDetailsColumnWidths(workspaceState.detailsColumnWidths));
    }

    setStatusMessage(message);

    if (workspaceState?.activeNvdDocumentPath) {
      restoreNvdDocumentFromWorkspace(workspaceState.activeNvdDocumentPath);
    }
  }

  async function handleNewInventory() {
    const name = window.prompt("Name this Inventory", activeInventory?.name ?? "My Inventory");

    if (name === null) {
      setStatusMessage("New Inventory cancelled.");
      return;
    }

    if (!name.trim()) {
      setStatusMessage("Inventory name cannot be empty.");
      return;
    }

    setStatusMessage(`Creating Inventory "${name.trim()}"...`);

    try {
      const openedInventory = await invoke<PersistedOpenedInventory>("create_inventory", {
        name,
      });

      setActiveInventory(toActiveInventory(openedInventory));
      setInventoryDocuments(openedInventory.manifest.documents);
      storeString(projectStorageKeys.activeInventoryManifestPath, openedInventory.manifestPath);
      applyLibraryStateToWorkspace(
        getPersistedLibraryStateFromManifest(openedInventory.manifest),
        `Created Inventory "${openedInventory.manifest.inventory.name}" at ${openedInventory.rootPath}.`,
        openedInventory.manifest.workspaceState,
      );
    } catch (error) {
      setStatusMessage(`Could not create Inventory: ${String(error)}`);
    }
  }

  async function handleOpenInventory() {
    setStatusMessage("Waiting for Inventory selection...");

    try {
      const selected = await open({
        directory: false,
        filters: [{ name: "Inventory", extensions: ["nvi"] }],
        multiple: false,
        title: "Open Inventory",
      });

      if (!selected || Array.isArray(selected)) {
        setStatusMessage("Open Inventory cancelled.");
        return;
      }

      const openedInventory = await invoke<PersistedOpenedInventory>("open_inventory", { path: selected });
      setActiveInventory(toActiveInventory(openedInventory));
      setInventoryDocuments(openedInventory.manifest.documents);
      setActiveNvdDocumentPath(null);
      setActiveNvdDocument(null);
      setNvdSaveState("idle");
      storeString(projectStorageKeys.activeInventoryManifestPath, openedInventory.manifestPath);
      applyLibraryStateToWorkspace(
        getPersistedLibraryStateFromManifest(openedInventory.manifest),
        `Opened Inventory "${openedInventory.manifest.inventory.name}".`,
        openedInventory.manifest.workspaceState,
      );
    } catch (error) {
      setStatusMessage(`Could not open Inventory: ${String(error)}`);
    }
  }

  async function handleCloseInventory() {
    if (!activeInventory) {
      return;
    }

    const closedInventoryName = activeInventory.name;
    const emptyLibraryState = createEmptyLibraryState();

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    setStatusMessage(`Closing Inventory "${closedInventoryName}"...`);

    try {
      await invoke("save_inventory", {
        path: activeInventory.manifestPath,
        state: currentLibraryState,
        workspaceState: currentWorkspaceState,
      });
    } catch (error) {
      setStatusMessage(`Could not close Inventory "${closedInventoryName}": ${String(error)}`);
      return;
    }

    removeStoredString(projectStorageKeys.activeInventoryManifestPath);
    setActiveInventory(null);
    setInventoryDocuments({ nvdDocuments: [], nvvDocuments: [] });
    setModelInspectorResults({});
    setLibraryNodeContextMenu(null);
    setSourceFolderContextMenu(null);
    setAddLibraryNodePanel(null);
    applyLibraryStateToWorkspace(
      emptyLibraryState,
      `Closed Inventory "${closedInventoryName}".`,
      createDefaultWorkspaceState(),
    );
  }

  return {
    applyLibraryStateToWorkspace,
    handleCloseInventory,
    handleNewInventory,
    handleOpenInventory,
  };
}

