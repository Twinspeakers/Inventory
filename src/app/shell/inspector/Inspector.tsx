import { type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PanelRight,
} from "lucide-react";
import {
  InspectorMiniThreePreview,
  type ModelInspectorResult,
  type ModelTransform,
} from "../../../sceneReaders/threeModelReader";
import type { DocumentStatistics } from "../../../features/editors";
import type { NvvDocument } from "../../../features/inventoryProject";
import {
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "../../../features/nvdEditor";
import type { InspectorAsset } from "./inspectorTypes";
import { AssetTagEditor } from "./asset/AssetTagEditor";
import { NotesSection } from "./asset/NotesSection";
import { ModelInspector } from "./model/ModelInspector";
import { NvdStylesSection } from "./nvd/NvdStylesSection";
import { ParagraphSettings } from "./nvd/ParagraphSettings";
import { WordCountSection } from "./nvd/WordCountSection";
import { NvvCanvasSettings } from "./nvv/NvvCanvasSettings";
import { NvvSvgPreview } from "./nvv/NvvSvgPreview";

type InspectorProps = {
  activeNvdStyleRole: NvdStyleRole | null;
  collapsed: boolean;
  documentStatistics: DocumentStatistics | null;
  modelInspectorResult: ModelInspectorResult | null;
  modelTransformOverride?: ModelTransform;
  nvdStyleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
  nvdLineHeight: number | null;
  nvdCharacterSpacingPt: number | null;
  nvdControlsEnabled: boolean;
  nvdSpaceAfterPt: number | null;
  nvdSpaceBeforePt: number | null;
  nvvDocument: NvvDocument | null;
  onApplyNvdStyle: (role: NvdStyleRole) => void;
  onAssetAddTag: (assetId: number, tag: string) => void;
  onAssetKeptTagsChange: (assetId: number, tags: string[]) => void;
  onAssetNotesChange: (assetId: number, notes: string) => void;
  onAssetRecentTagRemove: (tag: string) => void;
  onAssetReanalyze: (assetId: number) => void;
  onAssetTagsChange: (assetId: number, tags: string[]) => void;
  onOpenTagBrowser: () => void;
  onModelTransformChange: (transform: ModelTransform) => void;
  onModelTransformReset: () => void;
  onNvdLineHeightChange: (lineHeight: number, finalizeStyle?: boolean) => void;
  onNvdCharacterSpacingPtChange: (characterSpacingPt: number, finalizeStyle?: boolean) => void;
  onNvdSpaceAfterPtChange: (spaceAfterPt: number, finalizeStyle?: boolean) => void;
  onNvdSpaceBeforePtChange: (spaceBeforePt: number, finalizeStyle?: boolean) => void;
  onNvvDocumentChange: (document: NvvDocument) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetWidth: () => void;
  onResetNvdStyle: (role: NvdStyleRole) => void;
  onSelectNvdStyle: (role: NvdStyleRole) => void;
  onToggleCollapsed: () => void;
  selectedAsset: InspectorAsset | null;
  tagSuggestions: string[];
};

export function Inspector({
  activeNvdStyleRole,
  collapsed,
  documentStatistics,
  modelInspectorResult,
  modelTransformOverride,
  nvdStyleDefinitions,
  nvdLineHeight,
  nvdCharacterSpacingPt,
  nvdControlsEnabled,
  nvdSpaceAfterPt,
  nvdSpaceBeforePt,
  nvvDocument,
  onApplyNvdStyle,
  onAssetAddTag,
  onAssetKeptTagsChange,
  onAssetNotesChange,
  onAssetRecentTagRemove,
  onAssetReanalyze,
  onAssetTagsChange,
  onOpenTagBrowser,
  onModelTransformChange,
  onModelTransformReset,
  onNvdLineHeightChange,
  onNvdCharacterSpacingPtChange,
  onNvdSpaceAfterPtChange,
  onNvdSpaceBeforePtChange,
  onNvvDocumentChange,
  onResizeStart,
  onResetWidth,
  onResetNvdStyle,
  onSelectNvdStyle,
  onToggleCollapsed,
  selectedAsset,
  tagSuggestions,
}: InspectorProps) {
  const isNvvDocumentOpen = Boolean(nvvDocument);
  const isModelAssetSelected = selectedAsset?.type === "3D";
  const showDocumentStatistics = Boolean(documentStatistics);
  const showNvdSections = showDocumentStatistics && selectedAsset?.extension.toLowerCase() === "nvd";

  if (collapsed) {
    return (
      <aside className="inspector-panel relative flex min-w-0 flex-col items-center overflow-hidden border-l border-line bg-inspector px-1 py-2">
        <button
          aria-label="Expand inspector"
          className="dark-icon-button h-8 w-8"
          title="Expand inspector"
          type="button"
          onClick={onToggleCollapsed}
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <div
          className="mt-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-normal text-muted"
          style={{ writingMode: "vertical-rl" }}
        >
          Inspector
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector-panel relative flex min-w-0 flex-col overflow-hidden border-l border-line bg-inspector">
      <div
        aria-label="Resize inspector"
        aria-orientation="vertical"
        className="pane-resize-handle pane-resize-handle-left"
        onDoubleClick={onResetWidth}
        onPointerDown={onResizeStart}
        role="separator"
        title="Resize inspector. Double-click to reset."
      />
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
          <PanelRight size={14} aria-hidden="true" />
          Inspector
        </div>
        <button className="dark-icon-button" aria-label="Minimize inspector" title="Minimize inspector" type="button" onClick={onToggleCollapsed}>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      {selectedAsset ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <div className={`inspector-asset-header ${isModelAssetSelected ? "inspector-asset-header-with-preview" : ""}`}>
            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold leading-tight">
                <span>{selectedAsset.name}</span>
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-muted">
                <span>{selectedAsset.modified}</span>
                <span aria-hidden="true">/</span>
                <span>{selectedAsset.size}</span>
              </p>
            </div>
            {isModelAssetSelected ? <InspectorMiniThreePreview asset={selectedAsset} /> : null}
          </div>

          <AssetTagEditor
            asset={selectedAsset}
            onAddTag={(tag) => onAssetAddTag(selectedAsset.id, tag)}
            onKeptTagsChange={(tags) => onAssetKeptTagsChange(selectedAsset.id, tags)}
            onOpenTagBrowser={onOpenTagBrowser}
            onReanalyze={() => onAssetReanalyze(selectedAsset.id)}
            onRemoveRecentTag={onAssetRecentTagRemove}
            onTagsChange={(tags) => onAssetTagsChange(selectedAsset.id, tags)}
            suggestions={tagSuggestions}
          />

          {nvvDocument ? <NvvCanvasSettings document={nvvDocument} onChange={onNvvDocumentChange} /> : null}

          {documentStatistics ? <WordCountSection statistics={documentStatistics} /> : null}
          {showNvdSections ? (
            <ParagraphSettings
              characterSpacingPt={nvdCharacterSpacingPt}
              controlsEnabled={nvdControlsEnabled}
              lineHeight={nvdLineHeight}
              onCharacterSpacingPtChange={onNvdCharacterSpacingPtChange}
              onLineHeightChange={onNvdLineHeightChange}
              onSpaceAfterPtChange={onNvdSpaceAfterPtChange}
              onSpaceBeforePtChange={onNvdSpaceBeforePtChange}
              spaceAfterPt={nvdSpaceAfterPt}
              spaceBeforePt={nvdSpaceBeforePt}
            />
          ) : null}
          {showNvdSections ? (
            <NvdStylesSection
              activeStyleRole={activeNvdStyleRole}
              onApplyStyle={onApplyNvdStyle}
              onResetStyle={onResetNvdStyle}
              onSelectStyle={onSelectNvdStyle}
              styleDefinitions={nvdStyleDefinitions}
            />
          ) : null}

          {isModelAssetSelected ? (
            <ModelInspector
              modelResult={modelInspectorResult}
              onTransformChange={onModelTransformChange}
              onTransformReset={onModelTransformReset}
              transformOverride={modelTransformOverride}
            />
          ) : null}

          {nvvDocument ? (
            <NvvSvgPreview document={nvvDocument} />
          ) : (
            <NotesSection asset={selectedAsset} onNotesChange={onAssetNotesChange} />
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-muted">
          Select an indexed asset to inspect it.
        </div>
      )}
    </aside>
  );
}
