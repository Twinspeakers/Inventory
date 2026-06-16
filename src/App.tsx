import { useEffect, useRef, useState } from "react";
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
import { isPlayableAudioAsset, isWaveAudioAsset, playAssetAudioOnce } from "./sceneReaders/audioReader";
import type { ModelTransform } from "./sceneReaders/threeModelReader";
import {
  TAG_LIBRARY_WINDOW_ADD_TAG_EVENT,
  TAG_LIBRARY_WINDOW_LABEL,
  TAG_LIBRARY_WINDOW_READY_EVENT,
  TAG_LIBRARY_WINDOW_STATE_EVENT,
  buildTagLibraryWindowUrl,
  isTauriRuntime,
  toTagLibraryWindowAssetSnapshot,
  type TagLibraryWindowAddTagPayload,
} from "./features/tagLibrary/tagLibraryWindowBridge";
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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
    activeNvdSpaceAfterPt,
    activeNvdSpaceBeforePt,
    activeNvdStyleRole,
    activeNvdTextSelection,
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
    clearNvdTextSelection,
    confirmNvdStyleReset,
    handleNvdEditorControllerChange,
    handleNvdTextSelectionChange,
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
    assetPlacementSuggestions,
    assetTagSuggestions,
    assets,
    currentLibraryState,
    currentWorkspaceState,
    inventoryDocumentPaths,
    masterLibraryAssets,
    selectedAsset,
    selectedDocumentStatistics,
    sortedShelfAssets,
    sourceSummary,
    structure,
    visibleAssets,
  } = useAppDerivedState({
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
  });
  const {
    activateNvdDocumentContext,
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
    setSourceFolderContextMenu,
    setSourceFolders,
    setStatusMessage,
    setTreeOpenNodeIds,
    setVirtualFolders,
  });
  const {
    deleteInventoryNvdDocument,
    renameInventoryNvdDocument,
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
    renameAssetDisplayName,
    renameLibraryNode,
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
  const { selectedModelKey, selectedModelInspectorResult, selectedModelTransformOverride } = getSelectedModelState(selectedAsset);
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
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let unlistenReady: (() => void) | null = null;
    let unlistenAddTag: (() => void) | null = null;
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
        const asset = assets.find((entry) => entry.id === payload.assetId);

        if (!asset) {
          return;
        }

        updateAssetTags(payload.assetId, [...asset.userTags, payload.tag]);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenAddTag = unlisten;
      });

    return () => {
      disposed = true;
      unlistenReady?.();
      unlistenAddTag?.();
    };
  }, [assets, selectedAsset, updateAssetTags]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    void syncTagLibraryWindowState(selectedAsset);
  }, [selectedAsset]);

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

  function updateSelectedModelTransform(transform: ModelTransform) {
    updateModelTransformOverride(selectedModelKey, transform);
  }

  function resetSelectedModelTransform() {
    resetModelTransformOverride(selectedModelKey);
  }

  async function syncTagLibraryWindowState(asset: Asset | null) {
    const tagBrowserWindow = await WebviewWindow.getByLabel(TAG_LIBRARY_WINDOW_LABEL);

    if (!tagBrowserWindow) {
      return;
    }

    await tagBrowserWindow.emit(TAG_LIBRARY_WINDOW_STATE_EVENT, {
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
      alwaysOnTop: true,
      skipTaskbar: true,
    });

    void tagBrowserWindow.once("tauri://error", () => {
      setStatusMessage("Could not open the Tag Library window.");
    });
  }

  const activeInspectorNvvDocument =
    sceneMode === "nvv-document" &&
    selectedAsset &&
    activeNvvDocument &&
    normalizePath(selectedAsset.path) === normalizePath(activeNvvDocument.path)
      ? activeNvvDocument.document
      : null;

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
        canCreateFolder: Boolean(activeInventory),
        canShowNvdNavigation: Boolean(activeInventory) && sceneMode === "nvd-document",
        collapsed: leftPaneCollapsed,
        nodes: structure,
        onCreateFolder: createFolder,
        onNavigateNvdBlock: navigateToNvdBlock,
        onOpenNodeContextMenu: openLibraryNodeContextMenu,
        onOpenSourceFolderContextMenu: openSourceFolderContextMenu,
        onPaneViewChange: changeLeftPaneView,
        onResetWidth: () => setLeftPaneWidth(DEFAULT_LEFT_PANE_WIDTH),
        onResizeStart: startLeftPaneResize,
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
        onModelInspectorResult: handleModelInspectorResult,
        onNvdDocumentActivate: activateNvdDocumentContext,
        onNvdDocumentChange: updateActiveNvdDocument,
        onNvdEditorControllerChange: handleNvdEditorControllerChange,
        onNvdStyleDraftChange: updateNvdStyleDraft,
        onNvdTextSelectionChange: handleNvdTextSelectionChange,
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
        assetPlacementSuggestions,
        collapsed: rightPaneCollapsed,
        documentStatistics: selectedDocumentStatistics,
        modelInspectorResult: selectedModelInspectorResult,
        modelTransformOverride: selectedModelTransformOverride,
        nvdCharacterSpacingPt: nvdStyleDraft?.characterSpacingPt ?? activeNvdCharacterSpacingPt,
        nvdLineHeight: nvdStyleDraft?.lineHeight ?? activeNvdLineHeight,
        nvdSpaceAfterPt: nvdStyleDraft?.spaceAfterPt ?? activeNvdSpaceAfterPt,
        nvdSpaceBeforePt: nvdStyleDraft?.spaceBeforePt ?? activeNvdSpaceBeforePt,
        nvdStyleDefinitions,
        nvvDocument: activeInspectorNvvDocument,
        onAcceptNvdStyle: acceptNvdStyleDraft,
        onApplyNvdStyle: applyNvdStyle,
        onAssetKeptTagsChange: updateAssetKeptTags,
        onAssetNotesChange: updateAssetNotes,
        onAssetPlacementSuggestionAccept: acceptAssetPlacementSuggestion,
        onAssetTagsChange: updateAssetTags,
        onOpenTagBrowser: () => {
          if (isTauriRuntime()) {
            void openTagLibraryWindow(selectedAsset);
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
        selectedAsset,
        tagSuggestions: assetTagSuggestions,
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
        onDeleteInventoryNvdDocument: (assetId) => void deleteInventoryNvdDocument(assetId),
        onDeleteLibraryNode: deleteLibraryNode,
        onDeleteTheme: deleteSelectedTheme,
        onLibraryNodeContextMenuClose: () => setLibraryNodeContextMenu(null),
        onNvdSaveReminderEnabledChange: updateNvdSaveReminderEnabled,
        onNvdStyleResetConfirmationEnabledChange: updateNvdStyleResetConfirmationEnabled,
        onOpenAddLibraryNodePanel: openAddLibraryNodePanel,
        onRefreshSourceFolder: (sourceId) => void refreshSourceFolder(sourceId),
        onRemoveSourceFolder: removeSourceFolder,
        onRenameAssetDisplayName: renameAssetDisplayName,
        onRenameInventoryNvdDocument: (assetId) => void renameInventoryNvdDocument(assetId),
        onRenameLibraryNode: renameLibraryNode,
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

          updateAssetTags(selectedAsset.id, [...selectedAsset.userTags, tag]);
        },
        onThemeColorChange: updateThemeColor,
        onThemeEditorLayoutChange: setThemeEditorLayout,
        onThemeNameChange: setThemeName,
        onToggleFutureNvdStyleResetConfirmations: setHideFutureNvdStyleResetConfirmations,
      }}
    />
  );
}

