import type { Dispatch, SetStateAction } from "react";
import type { LibraryView, SortDirection, AssetSortKey } from "../../features/assetShelf";
import {
  filterAssets,
  findFolderPath,
  getTreeNodePathForView,
  sortAssets,
} from "../../features/libraryTree/libraryTreeModel";
import type { SceneMode } from "../../features/sceneViewer";
import type {
  Asset,
  LeftPaneView,
  PersistedOpenedNvdDocument,
  UndoContext,
  VirtualFolder,
} from "../appTypes";
import { normalizePath } from "../workspace/workspaceState";

export function useLibraryNavigation({
  activeNvdDocument,
  activeView,
  assetSortDirection,
  assetSortKey,
  assets,
  inventoryDocumentPaths,
  sceneMode,
  selectedFolderId,
  selectedId,
  virtualFolders,
  visibleAssets,
  focusInspectorOnDocument,
  focusInspectorOnSelection,
  clearNvdStyleSelection,
  openTreeNodePath,
  setActiveView,
  setLeftPaneView,
  setSceneMode,
  setSelectedFolderId,
  setSelectedId,
  setUndoContext,
}: {
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeView: LibraryView;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assets: Asset[];
  inventoryDocumentPaths: Set<string>;
  sceneMode: SceneMode;
  selectedFolderId: string | null;
  selectedId: number | null;
  virtualFolders: VirtualFolder[];
  visibleAssets: Asset[];
  focusInspectorOnDocument: (kind: "nvd-document" | "nvv-document") => void;
  focusInspectorOnSelection: () => void;
  clearNvdStyleSelection: () => void;
  openTreeNodePath: (nodeIds: string[]) => void;
  setActiveView: Dispatch<SetStateAction<LibraryView>>;
  setLeftPaneView: Dispatch<SetStateAction<LeftPaneView>>;
  setSceneMode: Dispatch<SetStateAction<SceneMode>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setUndoContext: Dispatch<SetStateAction<UndoContext>>;
}) {
  function selectView(view: LibraryView) {
    const viewAssets = sortAssets(
      filterAssets(view, assets, null, virtualFolders, inventoryDocumentPaths),
      assetSortKey,
      assetSortDirection,
    );
    const isNativeHub = view === "inventory-files" || view === "inventory-documents" || view === "inventory-vectors";
    const nextSelectedId = isNativeHub ? null : viewAssets.some((asset) => asset.id === selectedId) ? selectedId : viewAssets[0]?.id ?? null;

    setUndoContext("library");
    openTreeNodePath(getTreeNodePathForView(view));
    setActiveView(view);
    setSelectedFolderId(null);
    setSelectedId(nextSelectedId);
    if (isNativeHub) {
      changeSceneMode("preview");
    }
  }

  function selectFolder(folderId: string) {
    const folderAssets = sortAssets(
      filterAssets("all", assets, folderId, virtualFolders, inventoryDocumentPaths),
      assetSortKey,
      assetSortDirection,
    );
    const nextSelectedId = folderAssets.some((asset) => asset.id === selectedId) ? selectedId : folderAssets[0]?.id ?? null;

    setUndoContext("library");
    openTreeNodePath(["library", ...(findFolderPath(virtualFolders, folderId) ?? [])]);
    setSelectedFolderId(folderId);
    setActiveView("all");
    setSelectedId(nextSelectedId);
  }

  function selectAsset(assetId: number) {
    clearNvdStyleSelection();
    focusInspectorOnSelection();
    const asset = assets.find((candidate) => candidate.id === assetId);
    const isInventoryDocument = Boolean(asset && inventoryDocumentPaths.has(normalizePath(asset.path)));

    if (isInventoryDocument) {
      const nativeView = asset?.extension.toLowerCase() === "nvv" ? "inventory-vectors" : "inventory-documents";
      openTreeNodePath(getTreeNodePathForView(nativeView));
      setSelectedFolderId(null);
      setActiveView(nativeView);
      setSelectedId(assetId);
      return;
    } else if (activeView === "inventory-files" || activeView === "inventory-documents" || activeView === "inventory-vectors") {
      openTreeNodePath(["library"]);
      setSelectedFolderId(null);
      setActiveView("all");
    }

    if (selectedFolderId && !visibleAssets.some((asset) => asset.id === assetId)) {
      setSelectedFolderId(null);
      setActiveView("all");
    }

    setUndoContext("library");
    setSelectedId(assetId);
  }

  function activateNvdDocumentContext() {
    if (!activeNvdDocument) {
      return;
    }

    setUndoContext("nvd");
    focusInspectorOnDocument("nvd-document");
  }

  function activateNvvDocumentContext() {
    setUndoContext("nvv");
    focusInspectorOnDocument("nvv-document");
  }

  function changeSceneMode(mode: SceneMode) {
    setSceneMode(mode);

    if (mode === "preview") {
      setUndoContext("library");
      setLeftPaneView("library");
    }
  }

  function changeLeftPaneView(view: LeftPaneView) {
    if (view === "nvd-navigation" && sceneMode !== "nvd-document") {
      return;
    }

    setLeftPaneView(view);

    if (view !== "nvd-navigation") {
      clearNvdStyleSelection();
    }
  }

  return {
    activateNvdDocumentContext,
    activateNvvDocumentContext,
    changeLeftPaneView,
    changeSceneMode,
    selectAsset,
    selectFolder,
    selectView,
  };
}

