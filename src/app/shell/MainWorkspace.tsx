import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  AssetShelf,
  type AssetSortKey,
  type AssetViewMode,
  type DetailsColumnKey,
  type DetailsColumnWidths,
  type LibraryView,
  type SortDirection,
} from "../../features/assetShelf";
import {
  type ActiveInventory,
  type NvdDocument,
  type NvdPageObjectAsset,
  type NvvDocument,
  type OpenedNvdDocument,
  type OpenedNvvDocument,
} from "../../features/inventoryProject";
import {
  type NvdStyleDefinition,
  type NvdDocumentSelection,
  type NvdPageObjectAssetPointerDragController,
} from "../../features/nvdEditor";
import type { NvdEditorController } from "../../features/nvdEditor/contracts/NvdEditorController";
import { AssetThumbnail, PreviewStage, type SceneMode } from "../../features/sceneViewer";
import type { ModelInspectorResult, ModelTransform } from "../../sceneReaders/threeModelReader";
import type { Asset } from "../appTypes";
import {
  canAssignWorkspaceAssetToNvdPageObject,
  createNvdPageObjectAssetFromWorkspaceAsset,
} from "../workspace/nvdPageObjectAssets";
import { isNativeHubView } from "../workspace/workspaceState";

type WorkspaceAssetPointerDragState = {
  asset: Asset;
  clientX: number;
  clientY: number;
  nvdPointerDrag: {
    asset: NvdPageObjectAsset;
    clientX: number;
    clientY: number;
  };
};

export function MainWorkspace({
  activeInventory,
  activeView,
  activeFolderName,
  assetShelfHeight,
  assetShelfCollapsed,
  assetSearchQuery,
  assetSortDirection,
  assetSortKey,
  assets,
  canOpenFolder,
  detailsColumnWidths,
  isScanning,
  modelTransformOverride,
  onAssetShelfResizeStart,
  onAssetSearchQueryChange,
  onAssetSortDirectionChange,
  onAssetSortKeyChange,
  onAssetViewModeChange,
  onDetailsColumnWidthChange,
  onModelInspectorResult,
  nvdDocument,
  nvvDocument,
  nvdStyleDraft,
  nvdSaveReminderVisible,
  onCreateNvdDocument,
  onCreateNvvDocument,
  onCloseNvdDocument,
  onCloseNvvDocument,
  onNvdDocumentActivate,
  onNvvDocumentActivate,
  onNvdDocumentChange,
  onNvvDocumentChange,
  onAssignAssetToNvdPageObject,
  onOpenNvdPageObjectContextMenu,
  onNvdEditorControllerChange,
  onNvdStyleDraftChange,
  onDismissNvdSaveReminder,
  onNvdSelectionChange,
  onOpenAssetContextMenu,
  onOpenFolder,
  onPlayAudio,
  onResetAssetShelfHeight,
  onSceneModeChange,
  onToggleAssetShelfCollapsed,
  onSelectAsset,
  onSelectNativeHub,
  previewBackground,
  sceneMode,
  selectedAsset,
  sourceSummary,
  sourceFolderCount,
  statusMessage,
  totalAssetCount,
  viewMode,
}: {
  activeInventory: ActiveInventory | null;
  activeView: LibraryView;
  activeFolderName: string | null;
  assetShelfHeight: number | null;
  assetShelfCollapsed: boolean;
  assetSearchQuery: string;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assets: Asset[];
  canOpenFolder: boolean;
  detailsColumnWidths: DetailsColumnWidths;
  isScanning: boolean;
  modelTransformOverride?: ModelTransform;
  onAssetShelfResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onAssetSearchQueryChange: (query: string) => void;
  onAssetSortDirectionChange: (direction: SortDirection) => void;
  onAssetSortKeyChange: (sortKey: AssetSortKey) => void;
  onAssetViewModeChange: (mode: AssetViewMode) => void;
  onDetailsColumnWidthChange: (columnKey: DetailsColumnKey, width: number) => void;
  onModelInspectorResult: (asset: Asset, result: ModelInspectorResult) => void;
  nvdDocument: OpenedNvdDocument | null;
  nvvDocument: OpenedNvvDocument | null;
  nvdStyleDraft: NvdStyleDefinition | null;
  nvdSaveReminderVisible: boolean;
  onCreateNvdDocument: () => void;
  onCreateNvvDocument: () => void;
  onCloseNvdDocument: () => void;
  onCloseNvvDocument: () => void;
  onNvdDocumentActivate: () => void;
  onNvvDocumentActivate: () => void;
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvvDocumentChange: (document: NvvDocument) => void;
  onAssignAssetToNvdPageObject: (objectId: string, asset: NvdPageObjectAsset) => void;
  onOpenNvdPageObjectContextMenu: (payload: { objectId: string; x: number; y: number; label: string }) => void;
  onNvdEditorControllerChange: (controller: NvdEditorController | null) => void;
  onNvdStyleDraftChange: (style: NvdStyleDefinition) => void;
  onDismissNvdSaveReminder: () => void;
  onNvdSelectionChange: (selection: NvdDocumentSelection | null) => void;
  onOpenAssetContextMenu: (asset: Asset, event: ReactMouseEvent<HTMLElement>) => void;
  onOpenFolder: () => void;
  onPlayAudio: (asset: Asset) => void;
  onResetAssetShelfHeight: () => void;
  onSceneModeChange: (mode: SceneMode) => void;
  onToggleAssetShelfCollapsed: () => void;
  onSelectAsset: (id: number) => void;
  onSelectNativeHub: (view: "inventory-files" | "inventory-documents" | "inventory-vectors") => void;
  previewBackground: string;
  sceneMode: SceneMode;
  selectedAsset: Asset | null;
  sourceSummary: string | null;
  sourceFolderCount: number;
  statusMessage: string;
  totalAssetCount: number;
  viewMode: AssetViewMode;
}) {
  const showAssetShelf = !isNativeHubView(activeView) || sceneMode !== "preview";
  const canStartAssetPointerDrag = sceneMode === "nvd-document" && Boolean(nvdDocument);
  const [isAssetPointerDragging, setIsAssetPointerDragging] = useState(false);
  const [nvdAssetPointerDropTargetId, setNvdAssetPointerDropTargetId] = useState<string | null>(null);
  const assetPointerDragRef = useRef<WorkspaceAssetPointerDragState | null>(null);
  const assetPointerDragAnimationFrameRef = useRef<number | null>(null);
  const assetPointerDragListenersRef = useRef(new Set<() => void>());
  const nvdAssetPointerDropTargetIdRef = useRef<string | null>(null);

  const nvdAssetPointerDragController = useMemo<NvdPageObjectAssetPointerDragController>(
    () => ({
      getSnapshot: () => assetPointerDragRef.current?.nvdPointerDrag ?? null,
      subscribe: (listener) => {
        assetPointerDragListenersRef.current.add(listener);
        return () => {
          assetPointerDragListenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );
  const assetPointerDragPreviewStore = useMemo(
    () => ({
      getSnapshot: () => assetPointerDragRef.current,
      subscribe: (listener: () => void) => {
        assetPointerDragListenersRef.current.add(listener);
        return () => {
          assetPointerDragListenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );

  function scheduleAssetPointerDragBroadcast() {
    if (assetPointerDragAnimationFrameRef.current !== null) {
      return;
    }

    assetPointerDragAnimationFrameRef.current = window.requestAnimationFrame(() => {
      assetPointerDragAnimationFrameRef.current = null;
      for (const listener of assetPointerDragListenersRef.current) {
        listener();
      }
    });
  }

  function setActiveAssetPointerDrag(nextDrag: WorkspaceAssetPointerDragState | null) {
    assetPointerDragRef.current = nextDrag;
    setIsAssetPointerDragging((currentValue) =>
      currentValue === Boolean(nextDrag) ? currentValue : Boolean(nextDrag),
    );
    scheduleAssetPointerDragBroadcast();
  }

  function clearAssetPointerDrag() {
    nvdAssetPointerDropTargetIdRef.current = null;
    setNvdAssetPointerDropTargetId(null);
    setActiveAssetPointerDrag(null);
  }

  function handleAssetPointerDragStart(asset: Asset, position: { clientX: number; clientY: number }) {
    if (!canStartAssetPointerDrag || !canAssignWorkspaceAssetToNvdPageObject(asset)) {
      return;
    }

    setActiveAssetPointerDrag({
      asset,
      clientX: position.clientX,
      clientY: position.clientY,
      nvdPointerDrag: {
        asset: createNvdPageObjectAssetFromWorkspaceAsset(asset),
        clientX: position.clientX,
        clientY: position.clientY,
      },
    });
    nvdAssetPointerDropTargetIdRef.current = null;
    setNvdAssetPointerDropTargetId(null);
  }

  function handleAssetPointerDragMove(position: { clientX: number; clientY: number }) {
    const currentDrag = assetPointerDragRef.current;

    if (!currentDrag) {
      return;
    }

    setActiveAssetPointerDrag({
      ...currentDrag,
      clientX: position.clientX,
      clientY: position.clientY,
      nvdPointerDrag: {
        ...currentDrag.nvdPointerDrag,
        clientX: position.clientX,
        clientY: position.clientY,
      },
    });
  }

  function handleAssetPointerDragEnd() {
    const currentDrag = assetPointerDragRef.current;
    const targetObjectId = nvdAssetPointerDropTargetIdRef.current;

    if (currentDrag && targetObjectId) {
      onAssignAssetToNvdPageObject(targetObjectId, currentDrag.nvdPointerDrag.asset);
    }

    clearAssetPointerDrag();
  }

  useEffect(() => {
    document.body.classList.toggle("is-asset-pointer-dragging", isAssetPointerDragging);

    return () => {
      document.body.classList.remove("is-asset-pointer-dragging");
    };
  }, [isAssetPointerDragging]);

  useEffect(() => {
    return () => {
      if (assetPointerDragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(assetPointerDragAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (canStartAssetPointerDrag) {
      return;
    }

    clearAssetPointerDrag();
  }, [canStartAssetPointerDrag, nvdDocument?.path]);

  return (
    <section className="workspace-panel relative flex min-w-0 flex-col overflow-hidden bg-canvas">
      <PreviewStage
        asset={selectedAsset}
        canOpenFolder={canOpenFolder}
        isScanning={isScanning}
        modelTransformOverride={modelTransformOverride}
        onModelInspectorResult={onModelInspectorResult}
        nvdDocument={nvdDocument}
        nvvDocument={nvvDocument}
        nvdStyleDraft={nvdStyleDraft}
        onDismissNvdSaveReminder={onDismissNvdSaveReminder}
        onCreateNvdDocument={onCreateNvdDocument}
        onCreateNvvDocument={onCreateNvvDocument}
        onCloseNvdDocument={onCloseNvdDocument}
        onCloseNvvDocument={onCloseNvvDocument}
        onNvdAssetPointerDragTargetChange={(objectId) => {
          nvdAssetPointerDropTargetIdRef.current = objectId;
          setNvdAssetPointerDropTargetId((currentObjectId) =>
            currentObjectId === objectId ? currentObjectId : objectId,
          );
        }}
        onNvdPageObjectContextMenu={onOpenNvdPageObjectContextMenu}
        onNvdDocumentActivate={onNvdDocumentActivate}
        onNvvDocumentActivate={onNvvDocumentActivate}
        onNvdDocumentChange={onNvdDocumentChange}
        onNvdEditorControllerChange={onNvdEditorControllerChange}
        onNvdStyleDraftChange={onNvdStyleDraftChange}
        onNvdSelectionChange={onNvdSelectionChange}
        onNvvDocumentChange={onNvvDocumentChange}
        onOpenFolder={onOpenFolder}
        onSceneModeChange={onSceneModeChange}
        onSelectAsset={onSelectAsset}
        onSelectNativeHub={onSelectNativeHub}
        projectDocument={
          activeInventory && sourceFolderCount === 0
            ? {
                inventoryName: activeInventory.name,
                manifestFileName: activeInventory.manifestFileName,
                rootPath: activeInventory.rootPath,
              }
            : null
        }
        previewBackground={previewBackground}
        sceneMode={sceneMode}
        showNvdDocumentPrompt={Boolean(activeInventory) && activeView === "inventory-documents"}
        nativeHub={
          activeInventory && sceneMode === "preview" && isNativeHubView(activeView)
            ? { inventoryName: activeInventory.name, view: activeView }
            : null
        }
        nvdAssetPointerDragController={nvdAssetPointerDragController}
        nvdAssetPointerDropTargetId={nvdAssetPointerDropTargetId}
        nativeHubAssets={assets}
        showNvdSaveReminder={nvdSaveReminderVisible}
        sourcePath={sourceSummary}
      />
      {showAssetShelf ? (
        <AssetShelf
          activeView={activeView}
          activeFolderName={activeFolderName}
          assetSortDirection={assetSortDirection}
          assetSortKey={assetSortKey}
          assets={assets}
          assetSearchQuery={assetSearchQuery}
          canOpenFolder={canOpenFolder}
          detailsColumnWidths={detailsColumnWidths}
          collapsed={assetShelfCollapsed}
          isScanning={isScanning}
          nvdDocument={nvdDocument}
          canStartAssetPointerDrag={(asset) =>
            canStartAssetPointerDrag && canAssignWorkspaceAssetToNvdPageObject(asset)
          }
          onAssetSearchQueryChange={onAssetSearchQueryChange}
          onAssetSortDirectionChange={onAssetSortDirectionChange}
          onAssetSortKeyChange={onAssetSortKeyChange}
          onAssetPointerDragEnd={handleAssetPointerDragEnd}
          onAssetPointerDragMove={handleAssetPointerDragMove}
          onAssetPointerDragStart={handleAssetPointerDragStart}
          onAssetViewModeChange={onAssetViewModeChange}
          onDetailsColumnWidthChange={onDetailsColumnWidthChange}
          onCreateNvdDocument={onCreateNvdDocument}
          onOpenAssetContextMenu={onOpenAssetContextMenu}
          onOpenFolder={onOpenFolder}
          onPlayAudio={onPlayAudio}
          onSelectAsset={onSelectAsset}
          selectedAsset={selectedAsset}
          statusMessage={statusMessage}
          totalAssetCount={totalAssetCount}
          height={assetShelfHeight}
          onResizeStart={onAssetShelfResizeStart}
          onResetHeight={onResetAssetShelfHeight}
          onToggleCollapsed={onToggleAssetShelfCollapsed}
          viewMode={viewMode}
        />
      ) : null}
      {isAssetPointerDragging ? (
        <AssetPointerDragPreview
          dragStore={assetPointerDragPreviewStore}
          isOverDropTarget={Boolean(nvdAssetPointerDropTargetId)}
        />
      ) : null}
    </section>
  );
}

function AssetPointerDragPreview({
  dragStore,
  isOverDropTarget,
}: {
  dragStore: {
    getSnapshot: () => WorkspaceAssetPointerDragState | null;
    subscribe: (listener: () => void) => () => void;
  };
  isOverDropTarget: boolean;
}) {
  const assetPointerDrag = useSyncExternalStore(
    dragStore.subscribe,
    dragStore.getSnapshot,
    dragStore.getSnapshot,
  );

  if (!assetPointerDrag) {
    return null;
  }

  return (
    <div className="asset-pointer-drag-layer" aria-hidden="true">
      <div
        className={`asset-pointer-drag-preview ${
          isOverDropTarget ? "asset-pointer-drag-preview-ready" : ""
        }`}
        style={{
          left: `${assetPointerDrag.clientX + 18}px`,
          top: `${assetPointerDrag.clientY + 18}px`,
        }}
      >
        <div className="asset-pointer-drag-preview-thumb">
          <AssetThumbnail asset={assetPointerDrag.asset} />
        </div>
        <div className="asset-pointer-drag-preview-copy">
          <strong>{assetPointerDrag.asset.name}</strong>
          <span>{isOverDropTarget ? "Release to place in frame" : "Drag onto a frame"}</span>
        </div>
      </div>
    </div>
  );
}

