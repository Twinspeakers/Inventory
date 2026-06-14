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
  type NvvDocument,
  type OpenedNvdDocument,
  type OpenedNvvDocument,
} from "../../features/inventoryProject";
import {
  type NvdEditorController,
  type NvdStyleDefinition,
  type NvdTextSelection,
} from "../../features/nvdEditor";
import { PreviewStage, type SceneMode } from "../../features/sceneViewer";
import type { ModelInspectorResult, ModelTransform } from "../../sceneReaders/threeModelReader";
import type { Asset } from "../appTypes";
import { isNativeHubView } from "../workspace/workspaceState";

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
  onNvdDocumentChange,
  onNvvDocumentChange,
  onNvdEditorControllerChange,
  onNvdStyleDraftChange,
  onDismissNvdSaveReminder,
  onNvdTextSelectionChange,
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
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvvDocumentChange: (document: NvvDocument) => void;
  onNvdEditorControllerChange: (controller: NvdEditorController | null) => void;
  onNvdStyleDraftChange: (style: NvdStyleDefinition) => void;
  onDismissNvdSaveReminder: () => void;
  onNvdTextSelectionChange: (selection: NvdTextSelection | null) => void;
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
  return (
    <section className="workspace-panel flex min-w-0 flex-col overflow-hidden bg-canvas">
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
        onNvdDocumentActivate={onNvdDocumentActivate}
        onNvdDocumentChange={onNvdDocumentChange}
        onNvdEditorControllerChange={onNvdEditorControllerChange}
        onNvdStyleDraftChange={onNvdStyleDraftChange}
        onNvdTextSelectionChange={onNvdTextSelectionChange}
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
        nativeHubAssets={assets}
        showNvdSaveReminder={nvdSaveReminderVisible}
        sourcePath={sourceSummary}
      />
      {!isNativeHubView(activeView) ? (
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
          onAssetSearchQueryChange={onAssetSearchQueryChange}
          onAssetSortDirectionChange={onAssetSortDirectionChange}
          onAssetSortKeyChange={onAssetSortKeyChange}
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
    </section>
  );
}

