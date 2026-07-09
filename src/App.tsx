import { useEffect, useMemo, useRef, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  type AssetSortKey,
  type AssetViewMode,
  type DetailsColumnKey,
  type DetailsColumnWidths,
  type LibraryView,
  type SortDirection,
} from "./features/assetShelf";
import {
  DEFAULT_LEFT_PANE_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  clamp,
  defaultTreeOpenNodeIds,
  layoutStorageKeys,
  readStoredAssetSortKey,
  readStoredAssetViewMode,
  readStoredDetailsColumnWidths,
  readStoredSortDirection,
  readStoredStringSet,
  isNvdAsset,
  isNvvAsset,
  normalizePath,
  useAppDerivedState,
  useEditorCommandState,
  useImageAnalysis,
  useModelInspection,
  useTreeExpansion,
  useWorkspaceLayout,
} from "./app/workspace";
import type { LibraryNodeContextMenuState, SourceFolderContextMenuState } from "./app/shell";
import type {
  AddLibraryNodePanelState,
  Asset,
  LeftPaneView,
  NvdHistoryState,
  PersistedInventoryManifest,
  PersistedOpenedNvdDocument,
  ProjectTagGroup,
  ScanResult,
  SourceFolder,
  UndoContext,
  VirtualFolder,
} from "./app/appTypes";
import { useSourceFolderActions, useLibraryActions, useLibraryNavigation } from "./app/library";
import { useAppPersistence, useAppSettings } from "./app/settings";
import { AppShell, getNvdOutline } from "./app/shell";
import {
  useInventoryDocumentActions,
  useInventorySession,
  useNvdDocumentSession,
  useNvdStyleControls,
  useNvvDocumentSession,
} from "./app/session";
import type { ActiveInventory, InventoryDocumentsState } from "./features/inventoryProject";
import {
  EMPTY_SESSION_HISTORY,
  type EditorSaveState,
  type SessionHistory,
} from "./features/editors";
import {
  findFolder,
  initialVirtualFolders,
} from "./features/libraryTree/libraryTreeModel";
import type { SceneMode } from "./features/sceneViewer";
import { libraryTagDefinitions } from "./libraryCatalog";
import { isPlayableAudioAsset, isWaveAudioAsset, playAssetAudioOnce } from "./sceneReaders/audioReader";
import type { ModelTransform } from "./sceneReaders/threeModelReader";
import {
  TAG_LIBRARY_WINDOW_ADD_TAG_EVENT,
  TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_EVENT,
  TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_GROUP_EVENT,
  TAG_LIBRARY_WINDOW_DELETE_PROJECT_TAG_GROUP_EVENT,
  TAG_LIBRARY_WINDOW_RENAME_ASSET_EVENT,
  TAG_LIBRARY_WINDOW_LABEL,
  TAG_LIBRARY_WINDOW_READY_EVENT,
  TAG_LIBRARY_WINDOW_STATE_EVENT,
  buildTagLibraryWindowUrl,
  isTauriRuntime,
  toTagLibraryWindowAssetSnapshot,
  type TagLibraryWindowAddTagPayload,
  type TagLibraryWindowCreateProjectTagGroupPayload,
  type TagLibraryWindowCreateProjectTagPayload,
  type TagLibraryWindowDeleteProjectTagGroupPayload,
  type TagLibraryWindowRenameAssetPayload,
} from "./features/tagLibrary/tagLibraryWindowBridge";
import { createProjectTagGroupId, createProjectTagId, projectTagGroupLabelExists } from "./features/tagLibrary/projectTags";

const defaultLibrarySectionLabels: Record<
  "library-images" | "library-vector" | "library-audio" | "library-models" | "library-documents" | "library-archives",
  string
> = {
  "library-images": "Images",
  "library-vector": "Vector",
  "library-audio": "Audio",
  "library-models": "3D Models",
  "library-documents": "Documents",
  "library-archives": "Archives",
};

type InspectorFocusMode = "selection" | "nvd-document" | "nvv-document";

export function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [sourceFolders, setSourceFolders] = useState<SourceFolder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<LibraryView>("all");
  const [leftPaneView, setLeftPaneView] = useState<LeftPaneView>("library");
  const [sceneMode, setSceneMode] = useState<SceneMode>("preview");
  const [activeNvdDocument, setActiveNvdDocument] = useState<PersistedOpenedNvdDocument | null>(null);
  const [activeNvdDocumentPath, setActiveNvdDocumentPath] = useState<string | null>(null);
  const [nvdSaveState, setNvdSaveState] = useState<EditorSaveState>("idle");
  const hasUnsavedNvdChanges = nvdSaveState === "dirty" || nvdSaveState === "error";
  const [inventoryDocuments, setInventoryDocuments] = useState<InventoryDocumentsState>(() => ({ nvdDocuments: [], nvvDocuments: [] }));
  const [projectTagGroups, setProjectTagGroups] = useState<ProjectTagGroup[]>([]);
  const [recentUserTagIds, setRecentUserTagIds] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [hiddenDefaultLibraryViews, setHiddenDefaultLibraryViews] = useState<LibraryView[]>([]);
  const [inspectorFocusMode, setInspectorFocusMode] = useState<InspectorFocusMode>("selection");
  const [editingLibraryAssetId, setEditingLibraryAssetId] = useState<number | null>(null);
  const [editingLibraryFolderId, setEditingLibraryFolderId] = useState<string | null>(null);
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>(initialVirtualFolders);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
  const [activeInventory, setActiveInventory] = useState<ActiveInventory | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [treeOpenNodeIds, setTreeOpenNodeIds] = useState(() => readStoredStringSet(layoutStorageKeys.treeOpenNodeIds, defaultTreeOpenNodeIds));
  const [assetSortKey, setAssetSortKey] = useState<AssetSortKey>(() => readStoredAssetSortKey());
  const [assetSortDirection, setAssetSortDirection] = useState<SortDirection>(() => readStoredSortDirection());
  const [assetViewMode, setAssetViewMode] = useState<AssetViewMode>(() => readStoredAssetViewMode());
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [detailsColumnWidths, setDetailsColumnWidths] = useState<DetailsColumnWidths>(() => readStoredDetailsColumnWidths());
  const [isTagBrowserOpen, setIsTagBrowserOpen] = useState(false);
  const [libraryNodeContextMenu, setLibraryNodeContextMenu] = useState<LibraryNodeContextMenuState | null>(null);
  const [sourceFolderContextMenu, setSourceFolderContextMenu] = useState<SourceFolderContextMenuState | null>(null);
  const [addLibraryNodePanel, setAddLibraryNodePanel] = useState<AddLibraryNodePanelState | null>(null);
  const [statusMessage, setStatusMessage] = useState("Create or open an Inventory to begin.");
  const [nvdHistoryState, setNvdHistoryState] = useState<NvdHistoryState>({ canRedo: false, canUndo: false });
  const [libraryHistory, setLibraryHistory] = useState<SessionHistory>(EMPTY_SESSION_HISTORY);
  const [undoContext, setUndoContext] = useState<UndoContext>("library");
  const saveTimer = useRef<number | null>(null);
  const autoRefreshInFlightRef = useRef(false);
  const syncSourceFoldersRef = useRef<(() => Promise<boolean>) | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);
  const { openTreeNodePath, toggleTreeNode } = useTreeExpansion({ setTreeOpenNodeIds });
  const {
    assetShelfCollapsed,
    assetShelfHeight,
    leftPaneCollapsed,
    rightPaneCollapsed,
    sourceSectionCollapsed,
    sourceSectionHeight,
    setLeftPaneCollapsed,
    setLeftPaneWidth,
    setRightPaneCollapsed,
    setRightPaneWidth,
    setSourceSectionCollapsed,
    startAssetShelfResize,
    startLeftPaneResize,
    startRightPaneResize,
    startSourceSectionResize,
    resetAssetShelfHeight,
    toggleAssetShelfCollapsed,
    workspaceGridStyle,
  } = useWorkspaceLayout(workspaceGridRef);
  const {
    modelInspectorResults,
    modelTransformOverrides,
    getSelectedModelState,
    handleModelInspectorResult,
    resetSelectedModelTransform: resetModelTransformOverride,
    setModelInspectorResults,
    setModelTransformOverrides,
    updateSelectedModelTransform: updateModelTransformOverride,
  } = useModelInspection();
  const {
    availableThemes,
    customThemes,
    isSettingsOpen,
    nvdSaveReminderEnabled,
    nvdStyleResetConfirmationEnabled,
    selectedThemeId,
    selectedThemeIsBuiltin,
    themeColors,
    themeEditorLayout,
    themeName,
    themeStyle,
    deleteSelectedTheme,
    dismissNvdSaveReminder,
    saveTheme,
    selectTheme,
    setIsSettingsOpen,
    setThemeEditorLayout,
    setThemeName,
    updateNvdSaveReminderEnabled,
    updateNvdStyleResetConfirmationEnabled,
    updateThemeColor,
  } = useAppSettings({ setStatusMessage });
  const {
    activeNvdCharacterSpacingPt,
    activeNvdLineHeight,
    activeNvdSelection,
    activeNvdSelectionKind,
    activeNvdSpaceAfterPt,
    activeNvdSpaceBeforePt,
    activeNvdStyleRole,
    hideFutureNvdStyleResetConfirmations,
    nvdStyleDefinitions,
    nvdStyleDraft,
    pendingNvdStyleResetRole,
    acceptNvdStyleDraft,
    applyNvdStyle,
    changeNvdCharacterSpacingPt,
    changeNvdLineHeight,
    changeNvdSpaceAfterPt,
    changeNvdSpaceBeforePt,
    clearNvdStyleSelection,
    clearNvdSelection,
    confirmNvdStyleReset,
    handleNvdEditorControllerChange,
    handleNvdSelectionChange,
    insertAssetIntoNvdDocument,
    loadNvdStyleDefinitions,
    navigateToNvdBlock,
    redoNvd,
    resetNvdStyle,
    selectNvdStyle,
    setHideFutureNvdStyleResetConfirmations,
    setPendingNvdStyleResetRole,
    undoNvd,
    updateNvdStyleDraft,
  } = useNvdStyleControls({
    nvdStyleResetConfirmationEnabled,
    setActiveNvdDocument,
    setNvdHistoryState,
    setNvdSaveState,
    setStatusMessage,
    updateNvdStyleResetConfirmationEnabled,
  });
  const {
    activeFolder,
    activeNvdDocumentStatistics,
    assets,
    currentLibraryState,
    currentWorkspaceState,
    inventoryDocumentPaths,
    masterLibraryAssets,
    selectedAsset,
    sortedShelfAssets,
    sourceSummary,
    structure,
    visibleAssets,
  } = useAppDerivedState({
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
  });
  const {
    activateNvdDocumentContext,
    activateNvvDocumentContext,
    changeLeftPaneView,
    changeSceneMode,
    selectAsset,
    selectFolder,
    selectView,
  } = useLibraryNavigation({
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
    focusInspectorOnDocument: (kind) => setInspectorFocusMode(kind),
    focusInspectorOnSelection: () => setInspectorFocusMode("selection"),
    clearNvdStyleSelection,
    openTreeNodePath,
    setActiveView,
    setLeftPaneView,
    setSceneMode,
    setSelectedFolderId,
    setSelectedId,
    setUndoContext,
  });
  const {
    handleOpenFolder,
    refreshSourceFolder,
    removeSourceFolder,
    syncSourceFolders,
    toggleSourceFolder,
  } = useSourceFolderActions({
    activeInventory,
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
  });
  useEffect(() => {
    syncSourceFoldersRef.current = () => syncSourceFolders({ silentNoChanges: true, background: true });
  }, [syncSourceFolders]);
  const {
    activeNvvDocument,
    nvvHistory,
    nvvSaveState,
    closeActiveNvvDocument,
    handleNewNvvDocument,
    openNvvDocumentFromAsset,
    saveActiveNvvDocument,
    setNvvHistory,
    updateActiveNvvDocument,
  } = useNvvDocumentSession({
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
  });
  const {
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
  } = useNvdDocumentSession({
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
    clearNvdSelection,
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
  });
  const {
    applyLibraryStateToWorkspace,
    handleCloseInventory,
    handleNewInventory,
    handleOpenInventory,
  } = useInventorySession({
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
  });
  const {
    deleteInventoryNvdDocument,
    renameInventoryNvdDocument,
    renameInventoryNvdDocumentTo,
  } = useInventoryDocumentActions({
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
  });
  const {
    addLibraryHistoryCommand,
    canRedo,
    canSaveFile,
    canUndo,
    handleSaveFileCommand,
    redoActiveContext,
    redoLabel,
    undoActiveContext,
    undoLabel,
  } = useEditorCommandState({
    activeInventoryManifestPath: activeInventory?.manifestPath,
    activeNvdDocument,
    activeNvvDocument,
    hasUnsavedNvdChanges,
    libraryHistory,
    nvdHistoryState,
    nvdSaveState,
    nvvHistory,
    nvvSaveState,
    sceneMode,
    undoContext,
    redoNvd,
    saveActiveNvdDocument,
    saveActiveNvvDocument,
    setLibraryHistory,
    setNvvHistory,
    setUndoContext,
    undoNvd,
  });
  const {
    acceptAssetPlacementSuggestion,
    addLibraryNodeFromDraft,
    createFolder,
    deleteLibraryNode,
    openAddLibraryNodePanel,
    openAssetContextMenu,
    openLibraryNodeContextMenu,
    openSourceFolderContextMenu,
    removeAssetFromLibraryNode,
    renameAssetDisplayName,
    renameAssetDisplayNameTo,
    renameLibraryNode,
    renameLibraryNodeTo,
    updateAssetKeptTags,
    updateAssetNotes,
    updateAssetTags,
  } = useLibraryActions({
    activeInventory,
    addLibraryNodePanel,
    assets,
    inventoryDocuments,
    masterLibraryAssets,
    selectedAsset,
    selectedFolderId,
    virtualFolders,
    addLibraryHistoryCommand,
    openTreeNodePath,
    setActiveView,
    setAddLibraryNodePanel,
    setLibraryNodeContextMenu,
    setScanResult,
    setSelectedFolderId,
    setSelectedId,
    setSourceFolderContextMenu,
    setStatusMessage,
    setUndoContext,
    setVirtualFolders,
  });
  useAppPersistence({
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
  });
  const { selectedModelTransformOverride } = getSelectedModelState(selectedAsset);
  const activeNvdInspectorAsset = useMemo(
    () => (activeNvdDocument ? (assets.find((asset) => asset.id === activeNvdDocument.entry.assetId) ?? null) : null),
    [activeNvdDocument, assets],
  );
  const activeNvvInspectorAsset = useMemo(
    () => (activeNvvDocument ? (assets.find((asset) => asset.id === activeNvvDocument.entry.assetId) ?? null) : null),
    [activeNvvDocument, assets],
  );
  const inspectorAsset =
    inspectorFocusMode === "nvd-document"
      ? activeNvdInspectorAsset ?? selectedAsset
      : inspectorFocusMode === "nvv-document"
        ? activeNvvInspectorAsset ?? selectedAsset
        : selectedAsset;
  const {
    selectedModelKey: inspectorModelKey,
    selectedModelInspectorResult: inspectorModelInspectorResult,
    selectedModelTransformOverride: inspectorModelTransformOverride,
  } = getSelectedModelState(inspectorAsset);
  const inspectorDocumentStatistics =
    activeNvdDocument && inspectorAsset && normalizePath(inspectorAsset.path) === normalizePath(activeNvdDocument.path)
      ? activeNvdDocumentStatistics
      : null;
  const inspectorNvvDocument =
    activeNvvDocument && inspectorAsset && normalizePath(inspectorAsset.path) === normalizePath(activeNvvDocument.path)
      ? activeNvvDocument.document
      : null;
  const inspectorTagSuggestions = useMemo(() => {
    if (!inspectorAsset) {
      return [];
    }

    const existingTags = new Set(inspectorAsset.tags.map((tag) => createProjectTagId(tag) || tag));
    return recentUserTagIds.filter((tag) => !existingTags.has(createProjectTagId(tag) || tag)).slice(0, 12);
  }, [inspectorAsset, recentUserTagIds]);
  const { requestAssetReanalysis } = useImageAnalysis({
    activeInventory,
    scanResult,
    setScanResult,
    setStatusMessage,
  });
  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    if (isNvdAsset(selectedAsset)) {
      void openNvdDocumentFromAsset(selectedAsset);
    } else if (isNvvAsset(selectedAsset)) {
      void openNvvDocumentFromAsset(selectedAsset);
    }
  }, [selectedAsset?.id, selectedAsset?.path]);
  useEffect(() => {
    if (inspectorFocusMode === "nvd-document" && !activeNvdDocument) {
      setInspectorFocusMode("selection");
    }

    if (inspectorFocusMode === "nvv-document" && !activeNvvDocument) {
      setInspectorFocusMode("selection");
    }
  }, [activeNvdDocument, activeNvvDocument, inspectorFocusMode]);

  useEffect(() => {
    if (!activeInventory || sourceFolders.length === 0) {
      autoRefreshInFlightRef.current = false;
      return;
    }

    let disposed = false;

    async function runRefresh() {
      if (disposed || autoRefreshInFlightRef.current || isScanning || document.hidden) {
        return;
      }

      autoRefreshInFlightRef.current = true;
      try {
        await syncSourceFoldersRef.current?.();
      } finally {
        autoRefreshInFlightRef.current = false;
      }
    }

    void runRefresh();

    return () => {
      disposed = true;
    };
  }, [activeInventory?.manifestPath, isScanning, sourceFolders]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let unlistenReady: (() => void) | null = null;
    let unlistenAddTag: (() => void) | null = null;
    let unlistenCreateProjectTagGroup: (() => void) | null = null;
    let unlistenCreateProjectTag: (() => void) | null = null;
    let unlistenDeleteProjectTagGroup: (() => void) | null = null;
    let unlistenRenameAsset: (() => void) | null = null;
    const currentWindow = getCurrentWindow();

    void currentWindow
      .listen(TAG_LIBRARY_WINDOW_READY_EVENT, () => {
        void syncTagLibraryWindowState(selectedAsset);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenReady = unlisten;
      });

    void currentWindow
      .listen<TagLibraryWindowAddTagPayload>(TAG_LIBRARY_WINDOW_ADD_TAG_EVENT, ({ payload }) => {
        addTagToAsset(payload.assetId, payload.tag);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenAddTag = unlisten;
      });

    void currentWindow
      .listen<TagLibraryWindowCreateProjectTagGroupPayload>(TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_GROUP_EVENT, ({ payload }) => {
        createProjectTagGroup(payload.label);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenCreateProjectTagGroup = unlisten;
      });

    void currentWindow
      .listen<TagLibraryWindowCreateProjectTagPayload>(TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_EVENT, ({ payload }) => {
        createProjectTag(payload.groupId, payload.label);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenCreateProjectTag = unlisten;
      });

    void currentWindow
      .listen<TagLibraryWindowDeleteProjectTagGroupPayload>(TAG_LIBRARY_WINDOW_DELETE_PROJECT_TAG_GROUP_EVENT, ({ payload }) => {
        deleteProjectTagGroup(payload.groupId);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenDeleteProjectTagGroup = unlisten;
      });

    void currentWindow
      .listen<TagLibraryWindowRenameAssetPayload>(TAG_LIBRARY_WINDOW_RENAME_ASSET_EVENT, ({ payload }) => {
        renameAssetDisplayNameTo(payload.assetId, payload.name);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenRenameAsset = unlisten;
      });

    return () => {
      disposed = true;
      unlistenReady?.();
      unlistenAddTag?.();
      unlistenCreateProjectTagGroup?.();
      unlistenCreateProjectTag?.();
      unlistenDeleteProjectTagGroup?.();
      unlistenRenameAsset?.();
    };
  }, [assets, projectTagGroups, renameAssetDisplayNameTo, selectedAsset, updateAssetTags]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    void syncTagLibraryWindowState(selectedAsset);
  }, [projectTagGroups, selectedAsset]);

  function cancelPendingLibrarySave() {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }

  function playAudioAsset(asset: Asset) {
    if (!isPlayableAudioAsset(asset)) {
      setStatusMessage("That audio format cannot be played here yet.");
      return;
    }

    setStatusMessage(`Playing "${asset.name}".`);
    void playAssetAudioOnce(asset).catch((error) => {
      setStatusMessage(`Could not play "${asset.name}": ${String(error)}`);
    });
  }

  function insertSelectedAssetIntoActiveNvdDocument() {
    if (!selectedAsset) {
      setStatusMessage("Select an asset before inserting it into the document.");
      return;
    }

    insertAssetIntoNvdDocument({
      assetId: selectedAsset.id,
      assetKind: getNvdEmbedAssetKind(selectedAsset),
      assetName: selectedAsset.name,
      assetPath: selectedAsset.path,
      ...(selectedAsset.extension.toLowerCase() === "nvv" ? { sourceDocumentKind: "nvv" } : {}),
    });
  }

  function updateSelectedModelTransform(transform: ModelTransform) {
    updateModelTransformOverride(inspectorModelKey, transform);
  }

  function resetSelectedModelTransform() {
    resetModelTransformOverride(inspectorModelKey);
  }

  function addTagToAsset(assetId: number, tag: string) {
    const asset = assets.find((entry) => entry.id === assetId);

    if (!asset) {
      return;
    }

    const normalizedTag = createProjectTagId(tag) || tag;

    if (asset.tags.some((existingTag) => createProjectTagId(existingTag) === normalizedTag)) {
      return;
    }

    updateAssetTags(assetId, [...asset.userTags, normalizedTag]);
    rememberRecentUserTag(normalizedTag);
  }

  function rememberRecentUserTag(tag: string) {
    const normalizedTag = createProjectTagId(tag) || tag;

    setRecentUserTagIds((currentTags) => {
      const nextTags = [normalizedTag, ...currentTags.filter((currentTag) => createProjectTagId(currentTag) !== normalizedTag)];
      return nextTags.slice(0, 24);
    });
  }

  function removeRecentUserTag(tag: string) {
    const normalizedTag = createProjectTagId(tag) || tag;
    setRecentUserTagIds((currentTags) => currentTags.filter((currentTag) => (createProjectTagId(currentTag) || currentTag) !== normalizedTag));
  }

  function hideDefaultLibrarySection(view: LibraryView) {
    if (!(view in defaultLibrarySectionLabels)) {
      return;
    }

    setHiddenDefaultLibraryViews((currentViews) => (currentViews.includes(view) ? currentViews : [...currentViews, view]));
    if (activeView === view || selectedFolderId === view) {
      selectView("all");
    }
    setStatusMessage(`Hid ${defaultLibrarySectionLabels[view as keyof typeof defaultLibrarySectionLabels]}.`);
  }

  function restoreDefaultLibrarySection(view: LibraryView) {
    if (!(view in defaultLibrarySectionLabels)) {
      return;
    }

    setHiddenDefaultLibraryViews((currentViews) => currentViews.filter((currentView) => currentView !== view));
    if (findFolder(virtualFolders, view)) {
      selectFolder(view);
    } else {
      selectView(view);
    }
    setStatusMessage(`Restored ${defaultLibrarySectionLabels[view as keyof typeof defaultLibrarySectionLabels]}.`);
  }

  function createProjectTagGroup(label: string) {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      setStatusMessage("Project tag groups need a name.");
      return;
    }

    if (projectTagGroupLabelExists(trimmedLabel, projectTagGroups.map((group) => group.label))) {
      setStatusMessage(`A project tag group named "${trimmedLabel}" already exists.`);
      return;
    }

    setProjectTagGroups((currentGroups) => [
      ...currentGroups,
      {
        id: createProjectTagGroupId(trimmedLabel),
        label: trimmedLabel,
        tags: [],
      },
    ]);
    setStatusMessage(`Created project tag group "${trimmedLabel}".`);
  }

  function createProjectTag(groupId: string, label: string) {
    const trimmedLabel = label.trim();
    const projectTagId = createProjectTagId(trimmedLabel);

    if (!trimmedLabel || !projectTagId) {
      setStatusMessage("Project tags need a name.");
      return;
    }

    if (libraryTagExists(projectTagId) || projectTagGroups.some((group) => group.tags.some((tag) => tag.id === projectTagId))) {
      setStatusMessage(`A tag named "${trimmedLabel}" already exists.`);
      return;
    }

    setProjectTagGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tags: [...group.tags, { id: projectTagId, label: trimmedLabel }].sort((first, second) => first.label.localeCompare(second.label)),
            }
          : group,
      ),
    );
    setStatusMessage(`Created project tag "${trimmedLabel}".`);
  }

  function deleteProjectTagGroup(groupId: string) {
    const group = projectTagGroups.find((entry) => entry.id === groupId);

    if (!group) {
      return;
    }

    const deletedTagIds = new Set(group.tags.map((tag) => tag.id));

    assets.forEach((asset) => {
      const nextUserTags = asset.userTags.filter((tag) => !deletedTagIds.has(createProjectTagId(tag) || tag));

      if (nextUserTags.length !== asset.userTags.length) {
        updateAssetTags(asset.id, nextUserTags);
      }
    });

    setProjectTagGroups((currentGroups) => currentGroups.filter((entry) => entry.id !== groupId));
    setStatusMessage(`Deleted project tag group "${group.label}".`);
  }

  function libraryTagExists(tagId: string) {
    return libraryTagDefinitions.some((tagDefinition) => tagDefinition.id === tagId);
  }

  async function syncTagLibraryWindowState(asset: Asset | null) {
    const tagBrowserWindow = await WebviewWindow.getByLabel(TAG_LIBRARY_WINDOW_LABEL);

    if (!tagBrowserWindow) {
      return;
    }

    await tagBrowserWindow.emit(TAG_LIBRARY_WINDOW_STATE_EVENT, {
      projectTagGroups,
      selectedAsset: toTagLibraryWindowAssetSnapshot(asset),
    });
  }

  async function openTagLibraryWindow(asset: Asset | null) {
    const existingWindow = await WebviewWindow.getByLabel(TAG_LIBRARY_WINDOW_LABEL);

    if (existingWindow) {
      await existingWindow.show();
      await existingWindow.setFocus();
      await syncTagLibraryWindowState(asset);
      return;
    }

    const currentWindow = getCurrentWindow();
    const [position, size, scaleFactor] = await Promise.all([
      currentWindow.outerPosition(),
      currentWindow.outerSize(),
      currentWindow.scaleFactor(),
    ]);
    const width = 870;
    const height = 600;
    const logicalX = position.x / scaleFactor;
    const logicalY = position.y / scaleFactor;
    const logicalWidth = size.width / scaleFactor;
    const logicalHeight = size.height / scaleFactor;

    const tagBrowserWindow = new WebviewWindow(TAG_LIBRARY_WINDOW_LABEL, {
      url: buildTagLibraryWindowUrl(),
      title: "Tag Library",
      width,
      height,
      minWidth: 760,
      minHeight: 420,
      x: Math.round(logicalX + Math.max(24, (logicalWidth - width) / 2)),
      y: Math.round(logicalY + Math.max(24, (logicalHeight - height) / 2)),
      decorations: false,
      focus: true,
      resizable: true,
      skipTaskbar: true,
    });

    void tagBrowserWindow.once("tauri://error", () => {
      setStatusMessage("Could not open the Tag Library window.");
    });
  }

  return (
    <AppShell
      themeStyle={themeStyle}
      workspaceGridRef={workspaceGridRef}
      workspaceGridStyle={workspaceGridStyle}
      menuBar={{
        activeInventoryName: activeInventory?.name ?? null,
        canRedo,
        canUndo,
        canOpenFolder: Boolean(activeInventory),
        canSaveFile,
        onCloseInventory: handleCloseInventory,
        onNewInventory: handleNewInventory,
        onNewNvdDocument: handleNewNvdDocument,
        onNewNvvDocument: handleNewNvvDocument,
        onOpenFolder: handleOpenFolder,
        onOpenInventory: handleOpenInventory,
        onOpenSettings: () => setIsSettingsOpen(true),
        onRedo: redoActiveContext,
        onSaveFile: handleSaveFileCommand,
        onUndo: undoActiveContext,
        redoLabel,
        undoLabel,
      }}
      libraryStructure={{
        activeView,
        activeNvdOutline: getNvdOutline(activeNvdDocument?.document ?? null),
        canOpenFolder: Boolean(activeInventory),
        canCreateFolder: Boolean(activeInventory),
        canShowNvdNavigation: Boolean(activeInventory) && sceneMode === "nvd-document",
        collapsed: leftPaneCollapsed,
        editingAssetId: editingLibraryAssetId,
        editingFolderId: editingLibraryFolderId,
        hiddenDefaultSections: hiddenDefaultLibraryViews
          .filter((view): view is keyof typeof defaultLibrarySectionLabels => view in defaultLibrarySectionLabels)
          .map((view) => ({ label: defaultLibrarySectionLabels[view], view })),
        nodes: structure,
        onCreateFolder: createFolder,
        onHideDefaultSection: hideDefaultLibrarySection,
        onNavigateNvdBlock: navigateToNvdBlock,
        onOpenNodeContextMenu: openLibraryNodeContextMenu,
        onOpenFolder: handleOpenFolder,
        onRenameAssetStart: (assetId) => {
          setEditingLibraryFolderId(null);
          setEditingLibraryAssetId(assetId);
        },
        onRenameAssetCancel: () => setEditingLibraryAssetId(null),
        onRenameAssetSubmit: (assetId, name) => {
          const asset = assets.find((candidate) => candidate.id === assetId);
          const isInventoryDocument = Boolean(asset && inventoryDocuments.nvdDocuments.some((entry) => normalizePath(entry.path) === normalizePath(asset.path)));

          if (isInventoryDocument) {
            void renameInventoryNvdDocumentTo(assetId, name);
          } else {
            renameAssetDisplayNameTo(assetId, name);
          }
          setEditingLibraryAssetId(null);
        },
        onRenameFolderStart: (folderId) => {
          setEditingLibraryAssetId(null);
          setEditingLibraryFolderId(folderId);
        },
        onRenameFolderCancel: () => setEditingLibraryFolderId(null),
        onRenameFolderSubmit: (folderId, name) => {
          renameLibraryNodeTo(folderId, name);
          setEditingLibraryFolderId(null);
        },
        onRestoreDefaultSection: restoreDefaultLibrarySection,
        onOpenSourceFolderContextMenu: openSourceFolderContextMenu,
        onPaneViewChange: changeLeftPaneView,
        onResetWidth: () => setLeftPaneWidth(DEFAULT_LEFT_PANE_WIDTH),
        onResizeStart: startLeftPaneResize,
        onRemoveSourceFolder: removeSourceFolder,
        onSelectAsset: selectAsset,
        onSelectFolder: selectFolder,
        onSelectView: selectView,
        onSourceResizeStart: startSourceSectionResize,
        onToggleCollapsed: () => setLeftPaneCollapsed((collapsed) => !collapsed),
        onToggleSourceCollapsed: () => setSourceSectionCollapsed((collapsed) => !collapsed),
        onToggleSourceFolder: toggleSourceFolder,
        onToggleTreeNode: toggleTreeNode,
        paneView: leftPaneView,
        selectedAssetId: selectedAsset?.id ?? null,
        sourceFolders,
        sourceSectionCollapsed,
        sourceSectionHeight,
      }}
      mainWorkspace={{
        activeFolderName: activeFolder?.name ?? null,
        activeInventory,
        activeView,
        assetSearchQuery,
        assetShelfCollapsed,
        assetShelfHeight,
        assetSortDirection,
        assetSortKey,
        assets: sortedShelfAssets,
        canOpenFolder: Boolean(activeInventory),
        detailsColumnWidths,
        isScanning,
        modelTransformOverride: selectedModelTransformOverride,
        nvdDocument: activeNvdDocument,
        nvdSaveReminderVisible:
          sceneMode === "nvd-document" && Boolean(activeNvdDocument) && hasUnsavedNvdChanges && nvdSaveReminderEnabled,
        nvdStyleDraft,
        nvvDocument: activeNvvDocument,
        onAssetSearchQueryChange: setAssetSearchQuery,
        onAssetShelfResizeStart: startAssetShelfResize,
        onAssetSortDirectionChange: setAssetSortDirection,
        onAssetSortKeyChange: setAssetSortKey,
        onAssetViewModeChange: setAssetViewMode,
        onCloseNvdDocument: requestCloseActiveNvdDocument,
        onCloseNvvDocument: () => void closeActiveNvvDocument(),
        onCreateNvdDocument: handleNewNvdDocument,
        onCreateNvvDocument: handleNewNvvDocument,
        onDetailsColumnWidthChange: (columnKey, width) => {
          setDetailsColumnWidths((widths) => ({ ...widths, [columnKey]: width }));
        },
        onDismissNvdSaveReminder: dismissNvdSaveReminder,
        onInsertSelectedAssetIntoNvdDocument: insertSelectedAssetIntoActiveNvdDocument,
        onModelInspectorResult: handleModelInspectorResult,
        onNvdDocumentActivate: activateNvdDocumentContext,
        onNvdDocumentChange: updateActiveNvdDocument,
        onNvdEditorControllerChange: handleNvdEditorControllerChange,
        onNvdStyleDraftChange: updateNvdStyleDraft,
        onNvdSelectionChange: handleNvdSelectionChange,
        onNvvDocumentActivate: activateNvvDocumentContext,
        onNvvDocumentChange: updateActiveNvvDocument,
        onOpenAssetContextMenu: openAssetContextMenu,
        onOpenFolder: handleOpenFolder,
        onPlayAudio: playAudioAsset,
        onResetAssetShelfHeight: resetAssetShelfHeight,
        onSceneModeChange: changeSceneMode,
        onSelectAsset: selectAsset,
        onSelectNativeHub: selectView,
        onToggleAssetShelfCollapsed: toggleAssetShelfCollapsed,
        previewBackground: themeColors.preview,
        sceneMode,
        selectedAsset,
        sourceFolderCount: sourceFolders.length,
        sourceSummary,
        statusMessage,
        totalAssetCount: visibleAssets.length,
        viewMode: assetViewMode,
      }}
      inspector={{
        activeNvdStyleRole,
        collapsed: rightPaneCollapsed,
        documentStatistics: inspectorDocumentStatistics,
        modelInspectorResult: inspectorModelInspectorResult,
        modelTransformOverride: inspectorModelTransformOverride,
        nvdCharacterSpacingPt: nvdStyleDraft?.characterSpacingPt ?? activeNvdCharacterSpacingPt,
        nvdControlsEnabled: nvdStyleDraft !== null || activeNvdSelectionKind === "text",
        nvdLineHeight: nvdStyleDraft?.lineHeight ?? activeNvdLineHeight,
        nvdSpaceAfterPt: nvdStyleDraft?.spaceAfterPt ?? activeNvdSpaceAfterPt,
        nvdSpaceBeforePt: nvdStyleDraft?.spaceBeforePt ?? activeNvdSpaceBeforePt,
        nvdStyleDefinitions,
        nvvDocument: inspectorNvvDocument,
        onApplyNvdStyle: applyNvdStyle,
        onAssetAddTag: addTagToAsset,
        onAssetKeptTagsChange: updateAssetKeptTags,
        onAssetNotesChange: updateAssetNotes,
        onAssetRecentTagRemove: removeRecentUserTag,
        onAssetReanalyze: requestAssetReanalysis,
        onAssetTagsChange: updateAssetTags,
        onOpenTagBrowser: () => {
          if (isTauriRuntime()) {
            void openTagLibraryWindow(inspectorAsset);
            return;
          }

          setIsTagBrowserOpen(true);
        },
        onModelTransformChange: updateSelectedModelTransform,
        onModelTransformReset: resetSelectedModelTransform,
        onNvdCharacterSpacingPtChange: changeNvdCharacterSpacingPt,
        onNvdLineHeightChange: changeNvdLineHeight,
        onNvdSpaceAfterPtChange: changeNvdSpaceAfterPt,
        onNvdSpaceBeforePtChange: changeNvdSpaceBeforePt,
        onNvvDocumentChange: updateActiveNvvDocument,
        onResetNvdStyle: resetNvdStyle,
        onResetWidth: () => setRightPaneWidth(DEFAULT_RIGHT_PANE_WIDTH),
        onResizeStart: startRightPaneResize,
        onSelectNvdStyle: selectNvdStyle,
        onToggleCollapsed: () => setRightPaneCollapsed((collapsed) => !collapsed),
        selectedAsset: inspectorAsset,
        tagSuggestions: inspectorTagSuggestions,
      }}
      overlays={{
        addLibraryNodePanel,
        availableThemes,
        customThemes,
        hideFutureNvdStyleResetConfirmations,
        isNvdCloseConfirmationOpen,
        isSettingsOpen,
        isTagBrowserOpen,
        libraryNodeContextMenu,
        masterLibraryAssets,
        nvdSaveReminderEnabled,
        nvdSaveState,
        nvdStyleResetConfirmationEnabled,
        openedNvdDocumentTitle: activeNvdDocument?.document.title ?? null,
        pendingNvdStyleResetRole,
        projectTagGroups,
        selectedThemeId,
        selectedThemeIsBuiltin,
        selectedAsset,
        sourceFolderContextMenu,
        themeColors,
        themeEditorLayout,
        themeName,
        virtualFolders,
        onAddLibraryNodePanelClose: () => setAddLibraryNodePanel(null),
        onClearPendingNvdStyleResetRole: () => setPendingNvdStyleResetRole(null),
        onCloseActiveNvdDocument: () => void closeActiveNvdDocument(),
        onCloseNvdCloseConfirmation: () => setIsNvdCloseConfirmationOpen(false),
        onConfirmNvdStyleReset: confirmNvdStyleReset,
        onCreateLibraryNode: addLibraryNodeFromDraft,
        onCreateProjectTag: createProjectTag,
        onCreateProjectTagGroup: createProjectTagGroup,
        onDeleteProjectTagGroup: deleteProjectTagGroup,
        onRenameSelectedAsset: (name) => {
          if (selectedAsset) {
            renameAssetDisplayNameTo(selectedAsset.id, name);
          }
        },
        onDeleteInventoryNvdDocument: (assetId) => void deleteInventoryNvdDocument(assetId),
        onDeleteLibraryNode: deleteLibraryNode,
        onDeleteTheme: deleteSelectedTheme,
        onAssetPlacementSuggestionAccept: acceptAssetPlacementSuggestion,
        onLibraryNodeContextMenuClose: () => setLibraryNodeContextMenu(null),
        onRemoveAssetFromLibraryNode: removeAssetFromLibraryNode,
        onNvdSaveReminderEnabledChange: updateNvdSaveReminderEnabled,
        onNvdStyleResetConfirmationEnabledChange: updateNvdStyleResetConfirmationEnabled,
        onOpenAddLibraryNodePanel: openAddLibraryNodePanel,
        onRefreshSourceFolder: (sourceId) => void refreshSourceFolder(sourceId),
        onRemoveSourceFolder: removeSourceFolder,
        onRenameAssetDisplayName: (assetId) => {
          setEditingLibraryFolderId(null);
          setEditingLibraryAssetId(assetId);
        },
        onRenameInventoryNvdDocument: (assetId) => setEditingLibraryAssetId(assetId),
        onRenameLibraryNode: (folderId) => {
          setEditingLibraryAssetId(null);
          setEditingLibraryFolderId(folderId);
        },
        onSaveAndCloseActiveNvdDocument: () => void saveAndCloseActiveNvdDocument(),
        onSaveTheme: saveTheme,
        onSelectTheme: selectTheme,
        onSettingsClose: () => setIsSettingsOpen(false),
        onSourceFolderContextMenuClose: () => setSourceFolderContextMenu(null),
        onTagBrowserClose: () => setIsTagBrowserOpen(false),
        onTagBrowserAddTag: (tag) => {
          if (!selectedAsset) {
            return;
          }

          addTagToAsset(selectedAsset.id, tag);
        },
        onThemeColorChange: updateThemeColor,
        onThemeEditorLayoutChange: setThemeEditorLayout,
        onThemeNameChange: setThemeName,
        onToggleFutureNvdStyleResetConfirmations: setHideFutureNvdStyleResetConfirmations,
      }}
    />
  );
}

function getNvdEmbedAssetKind(asset: Asset) {
  if (asset.type === "Image") {
    return "image";
  }

  if (asset.type === "3D") {
    return "3d";
  }

  if (asset.type === "Audio") {
    return "audio";
  }

  if (asset.type === "Archive") {
    return "archive";
  }

  return "document";
}

