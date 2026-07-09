import { useDeferredValue, useMemo, useRef } from "react";
import { clamp } from "../workspace/appLayout";
import type {
  Asset,
  LeftPaneView,
  PersistedLibraryState,
  PersistedOpenedNvdDocument,
  PersistedWorkspaceState,
  ProjectTagGroup,
  ScanResult,
  VirtualFolder,
} from "../appTypes";
import { normalizePath, removeAssetIdsFromVirtualFolders } from "../workspace/workspaceState";
import { normalizeLibraryMatchText } from "../../libraryCatalog";
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
  getNvdTextSelectionFromDocumentSelection,
  paginateNvdDocument,
  useNvdFontsReady,
  type NvdDocumentSelection,
} from "../../features/nvdEditor";
import { getDocumentStatistics } from "../../features/editors";
import {
  buildStructure,
  filterAssets,
  filterAssetsByEnabledSources,
  filterAssetsBySearchQuery,
  findFolder,
  getScannedAssetModelKey,
  getSourceSummary,
  sortAssets,
} from "../../features/libraryTree/libraryTreeModel";
import { TAG_INFERENCE_VERSION, toAsset } from "../../libraryCatalog/tag-inference";
import type { ModelTransform, ModelInspectorResult } from "../../sceneReaders/threeModelReader";
import type { InventoryDocumentsState } from "../../features/inventoryProject";
import type { SceneMode } from "../../features/sceneViewer";

export function useAppDerivedState({
  activeNvdDocument,
  activeNvdDocumentPath,
  activeNvdSelection,
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
  projectTagGroups,
  recentUserTagIds,
  scanResult,
  sceneMode,
  hiddenDefaultLibraryViews,
  selectedFolderId,
  selectedId,
  sourceFolders,
  treeOpenNodeIds,
  virtualFolders,
}: {
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeNvdDocumentPath: string | null;
  activeNvdSelection: NvdDocumentSelection | null;
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
  projectTagGroups: ProjectTagGroup[];
  recentUserTagIds: string[];
  scanResult: ScanResult | null;
  sceneMode: SceneMode;
  hiddenDefaultLibraryViews: LibraryView[];
  selectedFolderId: string | null;
  selectedId: number | null;
  sourceFolders: PersistedLibraryState["sourceFolders"];
  treeOpenNodeIds: Set<string>;
  virtualFolders: VirtualFolder[];
}) {
  const assetConversionCacheRef = useRef(
    new Map<number, {
      asset: ScanResult["assets"][number];
      builtAsset: Asset;
      modelResult?: ModelInspectorResult;
    }>(),
  );
  const previousAllAssetsRef = useRef<Asset[]>([]);
  const allAssets = useMemo(() => {
    if (!scanResult) {
      assetConversionCacheRef.current.clear();
      previousAllAssetsRef.current = [];
      return [];
    }

    const nextAssets: Asset[] = [];
    const seenAssetIds = new Set<number>();
    let hasChanges = previousAllAssetsRef.current.length !== scanResult.assets.length;

    scanResult.assets.forEach((asset, index) => {
      const modelResult = modelInspectorResults[getScannedAssetModelKey(asset)];
      const cachedEntry = assetConversionCacheRef.current.get(asset.id);
      const builtAsset =
        cachedEntry && cachedEntry.asset === asset && cachedEntry.modelResult === modelResult
          ? cachedEntry.builtAsset
          : toAsset(asset, modelResult);

      if (!cachedEntry || cachedEntry.asset !== asset || cachedEntry.modelResult !== modelResult || cachedEntry.builtAsset !== builtAsset) {
        assetConversionCacheRef.current.set(asset.id, {
          asset,
          builtAsset,
          modelResult,
        });
      }

      seenAssetIds.add(asset.id);
      nextAssets.push(builtAsset);

      if (!hasChanges && previousAllAssetsRef.current[index] !== builtAsset) {
        hasChanges = true;
      }
    });

    for (const cachedAssetId of assetConversionCacheRef.current.keys()) {
      if (!seenAssetIds.has(cachedAssetId)) {
        assetConversionCacheRef.current.delete(cachedAssetId);
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return previousAllAssetsRef.current;
    }

    previousAllAssetsRef.current = nextAssets;
    return nextAssets;
  }, [modelInspectorResults, scanResult, TAG_INFERENCE_VERSION]);
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
        projectTagGroups,
        recentUserTagIds,
        sourceFolders: (sourceFolders ?? []).map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter((assetId) => !inventoryDocumentAssetIds.has(assetId)),
        })),
        virtualFolders: removeAssetIdsFromVirtualFolders(virtualFolders, inventoryDocumentAssetIds),
      }) satisfies PersistedLibraryState,
    [inventoryDocumentAssetIds, projectTagGroups, recentUserTagIds, scanResult, sourceFolders, virtualFolders],
  );
  const sourceSummary = useMemo(() => getSourceSummary(sourceFolders ?? []), [sourceFolders]);
  const activeFolder = selectedFolderId ? findFolder(virtualFolders, selectedFolderId) : null;
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
  const assetTagSuggestions = useMemo(
    () => getRecentAssetTagSuggestions(selectedAsset, recentUserTagIds),
    [recentUserTagIds, selectedAsset],
  );
  const currentWorkspaceState = useMemo(
    () =>
      ({
        activeView,
        leftPaneView,
        sceneMode,
        selectedAssetId: selectedAsset?.id ?? selectedId,
        selectedFolderId,
        hiddenDefaultLibraryViews,
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
      hiddenDefaultLibraryViews,
      leftPaneView,
      modelTransformOverrides,
      sceneMode,
      selectedAsset?.id,
      selectedFolderId,
      selectedId,
      treeOpenNodeIds,
    ],
  );
  const selectedDocumentFontsReady = useNvdFontsReady(getNvdDocumentFontFamilies(activeNvdDocument?.document));
  const deferredActiveNvdDocument = useDeferredValue(activeNvdDocument);
  const deferredDocumentPageCount = useMemo(() => {
    if (!deferredActiveNvdDocument || !selectedDocumentFontsReady) {
      return null;
    }

    return paginateNvdDocument(deferredActiveNvdDocument.document).length;
  }, [deferredActiveNvdDocument, selectedDocumentFontsReady]);
  const activeNvdDocumentStatistics = useMemo(() => {
    if (!activeNvdDocument) {
      return null;
    }

    const document = activeNvdDocument.document;
    const text = getNvdDocumentText(document);
    const activeNvdTextSelection = getNvdTextSelectionFromDocumentSelection(activeNvdSelection);
    const selectionStart = clamp(activeNvdTextSelection?.start ?? 0, 0, text.length);
    const selectionEnd = clamp(activeNvdTextSelection?.end ?? selectionStart, selectionStart, text.length);

    if (selectionEnd > selectionStart) {
      return getDocumentStatistics(text.slice(selectionStart, selectionEnd), null, "selection");
    }

    const pages = deferredDocumentPageCount;

    return getDocumentStatistics(text, pages);
  }, [activeNvdDocument, activeNvdSelection, deferredDocumentPageCount]);
  const structure = useMemo(
    () =>
      buildStructure(
        activeView,
        assets,
        virtualFolders,
        hiddenDefaultLibraryViews,
        selectedFolderId,
        selectedAsset?.id ?? null,
        treeOpenNodeIds,
        inventoryDocumentPaths,
      ),
    [activeView, assets, hiddenDefaultLibraryViews, inventoryDocumentPaths, selectedAsset?.id, selectedFolderId, treeOpenNodeIds, virtualFolders],
  );

  return {
    activeFolder,
    allAssets,
    assetTagSuggestions,
    assets,
    currentLibraryState,
    currentWorkspaceState,
    inventoryDocumentAssetIds,
    inventoryDocumentPaths,
    masterLibraryAssets,
    activeNvdDocumentStatistics,
    searchFilteredVisibleAssets,
    selectedAsset,
    selectedVisibleAsset,
    sortedShelfAssets,
    sortedVisibleAssets,
    sourceSummary,
    structure,
    visibleAssets,
  };
}

function getRecentAssetTagSuggestions(asset: Asset | null, recentUserTagIds: string[]) {
  if (!asset) {
    return [];
  }

  const existingTags = new Set(asset.tags.map((tag) => normalizeLibraryMatchText(tag)));
  return recentUserTagIds.filter((tag) => !existingTags.has(normalizeLibraryMatchText(tag))).slice(0, 12);
}

