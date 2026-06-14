import { useDeferredValue, useMemo } from "react";
import { clamp } from "../workspace/appLayout";
import type {
  Asset,
  LeftPaneView,
  PersistedLibraryState,
  PersistedOpenedNvdDocument,
  PersistedWorkspaceState,
  ScanResult,
  VirtualFolder,
} from "../appTypes";
import { normalizePath, removeAssetIdsFromVirtualFolders } from "../workspace/workspaceState";
import type {
  AssetSortKey,
  AssetViewMode,
  DetailsColumnWidths,
  LibraryView,
  SortDirection,
} from "../../features/assetShelf";
import {
  getNvdDocumentFontFamilies,
  getNvdDocumentText,
  getNvdLayoutMode,
  paginateNvdDocument,
  useNvdFontsReady,
  type NvdTextSelection,
} from "../../features/nvdEditor";
import { getDocumentStatistics } from "../../features/editors";
import {
  buildStructure,
  filterAssets,
  filterAssetsByEnabledSources,
  filterAssetsBySearchQuery,
  findFolder,
  getAssetPlacementSuggestions,
  getAssetTagSuggestions,
  getScannedAssetModelKey,
  getSourceSummary,
  sortAssets,
} from "../../features/libraryTree/libraryTreeModel";
import { TAG_INFERENCE_VERSION, toAsset } from "../../libraryCatalog/tagInference";
import type { ModelTransform, ModelInspectorResult } from "../../sceneReaders/threeModelReader";
import type { InventoryDocumentsState } from "../../features/inventoryProject";
import type { SceneMode } from "../../features/sceneViewer";

export function useAppDerivedState({
  activeNvdDocument,
  activeNvdDocumentPath,
  activeNvdTextSelection,
  activeView,
  assetSearchQuery,
  assetSortDirection,
  assetSortKey,
  assetViewMode,
  detailsColumnWidths,
  inventoryDocuments,
  leftPaneView,
  modelInspectorResults,
  modelTransformOverrides,
  scanResult,
  sceneMode,
  selectedFolderId,
  selectedId,
  sourceFolders,
  treeOpenNodeIds,
  virtualFolders,
}: {
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeNvdDocumentPath: string | null;
  activeNvdTextSelection: NvdTextSelection | null;
  activeView: LibraryView;
  assetSearchQuery: string;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assetViewMode: AssetViewMode;
  detailsColumnWidths: DetailsColumnWidths;
  inventoryDocuments: InventoryDocumentsState;
  leftPaneView: LeftPaneView;
  modelInspectorResults: Record<string, ModelInspectorResult>;
  modelTransformOverrides: Record<string, ModelTransform>;
  scanResult: ScanResult | null;
  sceneMode: SceneMode;
  selectedFolderId: string | null;
  selectedId: number | null;
  sourceFolders: PersistedLibraryState["sourceFolders"];
  treeOpenNodeIds: Set<string>;
  virtualFolders: VirtualFolder[];
}) {
  const allAssets = useMemo(
    () => scanResult?.assets.map((asset) => toAsset(asset, modelInspectorResults[getScannedAssetModelKey(asset)])) ?? [],
    [modelInspectorResults, scanResult, TAG_INFERENCE_VERSION],
  );
  const inventoryDocumentPaths = useMemo(
    () => new Set([...inventoryDocuments.nvdDocuments, ...inventoryDocuments.nvvDocuments].map((document) => normalizePath(document.path))),
    [inventoryDocuments],
  );
  const inventoryDocumentAssetIds = useMemo(
    () => new Set([...inventoryDocuments.nvdDocuments, ...inventoryDocuments.nvvDocuments].map((document) => document.assetId)),
    [inventoryDocuments],
  );
  const assets = useMemo(
    () => filterAssetsByEnabledSources(allAssets, sourceFolders ?? [], inventoryDocumentPaths),
    [allAssets, inventoryDocumentPaths, sourceFolders],
  );
  const masterLibraryAssets = useMemo(
    () => assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path))),
    [assets, inventoryDocumentPaths],
  );
  const currentLibraryState = useMemo(
    () =>
      ({
        rootPath: sourceFolders?.[0]?.path ?? scanResult?.root_path ?? null,
        assets: scanResult?.assets ?? [],
        sourceFolders: (sourceFolders ?? []).map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter((assetId) => !inventoryDocumentAssetIds.has(assetId)),
        })),
        virtualFolders: removeAssetIdsFromVirtualFolders(virtualFolders, inventoryDocumentAssetIds),
      }) satisfies PersistedLibraryState,
    [inventoryDocumentAssetIds, scanResult, sourceFolders, virtualFolders],
  );
  const sourceSummary = useMemo(() => getSourceSummary(sourceFolders ?? []), [sourceFolders]);
  const activeFolder = selectedFolderId ? findFolder(virtualFolders, selectedFolderId) : null;
  const assetTagSuggestions = useMemo(() => getAssetTagSuggestions(masterLibraryAssets, virtualFolders), [masterLibraryAssets, virtualFolders]);
  const visibleAssets = useMemo(
    () => filterAssets(activeView, assets, selectedFolderId, virtualFolders, inventoryDocumentPaths),
    [activeView, assets, inventoryDocumentPaths, selectedFolderId, virtualFolders],
  );
  const sortedVisibleAssets = useMemo(
    () => sortAssets(visibleAssets, assetSortKey, assetSortDirection),
    [assetSortDirection, assetSortKey, visibleAssets],
  );
  const searchFilteredVisibleAssets = useMemo(
    () => filterAssetsBySearchQuery(visibleAssets, assetSearchQuery),
    [assetSearchQuery, visibleAssets],
  );
  const sortedShelfAssets = useMemo(
    () => sortAssets(searchFilteredVisibleAssets, assetSortKey, assetSortDirection),
    [assetSortDirection, assetSortKey, searchFilteredVisibleAssets],
  );
  const selectedVisibleAsset = sortedVisibleAssets.find((asset) => asset.id === selectedId) ?? null;
  const selectedAsset =
    selectedId === null
      ? null
      : selectedFolderId
        ? selectedVisibleAsset ?? sortedVisibleAssets[0] ?? null
        : assets.find((asset) => asset.id === selectedId) ?? sortedVisibleAssets[0] ?? null;
  const currentWorkspaceState = useMemo(
    () =>
      ({
        activeView,
        leftPaneView,
        sceneMode,
        selectedAssetId: selectedAsset?.id ?? selectedId,
        selectedFolderId,
        treeOpenNodeIds: [...treeOpenNodeIds],
        assetSortKey,
        assetSortDirection,
        assetViewMode,
        detailsColumnWidths,
        assetSearchQuery,
        activeNvdDocumentPath,
        modelTransformOverrides,
      }) satisfies PersistedWorkspaceState,
    [
      activeNvdDocumentPath,
      activeView,
      assetSearchQuery,
      assetSortDirection,
      assetSortKey,
      assetViewMode,
      detailsColumnWidths,
      leftPaneView,
      modelTransformOverrides,
      sceneMode,
      selectedAsset?.id,
      selectedFolderId,
      selectedId,
      treeOpenNodeIds,
    ],
  );
  const assetPlacementSuggestions = useMemo(
    () =>
      selectedAsset && !inventoryDocumentPaths.has(normalizePath(selectedAsset.path))
        ? getAssetPlacementSuggestions(selectedAsset, virtualFolders, masterLibraryAssets)
        : [],
    [inventoryDocumentPaths, masterLibraryAssets, selectedAsset, virtualFolders],
  );
  const selectedDocumentFontsReady = useNvdFontsReady(getNvdDocumentFontFamilies(activeNvdDocument?.document));
  const deferredActiveNvdDocument = useDeferredValue(activeNvdDocument);
  const deferredDocumentPageCount = useMemo(() => {
    if (
      !selectedAsset ||
      !deferredActiveNvdDocument ||
      normalizePath(selectedAsset.path) !== normalizePath(deferredActiveNvdDocument.path) ||
      getNvdLayoutMode(deferredActiveNvdDocument.document.layoutMode) !== "a4" ||
      !selectedDocumentFontsReady
    ) {
      return null;
    }

    return paginateNvdDocument(deferredActiveNvdDocument.document).length;
  }, [deferredActiveNvdDocument, selectedAsset, selectedDocumentFontsReady]);
  const selectedDocumentStatistics = useMemo(() => {
    if (
      !selectedAsset ||
      !activeNvdDocument ||
      normalizePath(selectedAsset.path) !== normalizePath(activeNvdDocument.path)
    ) {
      return null;
    }

    const document = activeNvdDocument.document;
    const text = getNvdDocumentText(document);
    const selectionStart = clamp(activeNvdTextSelection?.start ?? 0, 0, text.length);
    const selectionEnd = clamp(activeNvdTextSelection?.end ?? selectionStart, selectionStart, text.length);

    if (selectionEnd > selectionStart) {
      return getDocumentStatistics(text.slice(selectionStart, selectionEnd), null, "selection");
    }

    const pages = getNvdLayoutMode(document.layoutMode) === "a4" ? deferredDocumentPageCount : null;

    return getDocumentStatistics(text, pages);
  }, [activeNvdDocument, activeNvdTextSelection, deferredDocumentPageCount, selectedAsset]);
  const structure = useMemo(
    () =>
      buildStructure(
        activeView,
        assets,
        virtualFolders,
        selectedFolderId,
        selectedAsset?.id ?? null,
        treeOpenNodeIds,
        inventoryDocumentPaths,
      ),
    [activeView, assets, inventoryDocumentPaths, selectedAsset?.id, selectedFolderId, treeOpenNodeIds, virtualFolders],
  );

  return {
    activeFolder,
    allAssets,
    assetPlacementSuggestions,
    assetTagSuggestions,
    assets,
    currentLibraryState,
    currentWorkspaceState,
    inventoryDocumentAssetIds,
    inventoryDocumentPaths,
    masterLibraryAssets,
    searchFilteredVisibleAssets,
    selectedAsset,
    selectedDocumentStatistics,
    selectedVisibleAsset,
    sortedShelfAssets,
    sortedVisibleAssets,
    sourceSummary,
    structure,
    visibleAssets,
  };
}

