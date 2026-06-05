import type { FormEvent as ReactFormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  PanelRight,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  InspectorMiniThreePreview,
  MODEL_NUMBER_EPSILON,
  defaultModelTransform,
  getLiveModelCenter,
  getLiveModelDimensions,
  getModelScaleSign,
  modelAxes,
  sanitizeModelNumber,
  type ModelAxis,
  type ModelInspectorResult,
  type ModelTransform,
  type ModelTransformField,
  type ModelVector3,
} from "../../sceneReaders/threeModelReader";
import { normalizeLibraryMatchText, normalizeLibraryNodeTagValues } from "../../libraryCatalog";
import type { DocumentStatistics } from "../editors";
import type { NvvDocument } from "../inventoryProject";
import { getNvvDocumentSvg } from "../nvvEditor";
import {
  getNvdFontCssStack,
  getNvdCharacterSpacingPt,
  getNvdLineHeight,
  MAX_NVD_CHARACTER_SPACING_PT,
  MAX_NVD_LINE_HEIGHT,
  MAX_NVD_PARAGRAPH_SPACING_PT,
  MIN_NVD_LINE_HEIGHT,
  MIN_NVD_CHARACTER_SPACING_PT,
  MIN_NVD_PARAGRAPH_SPACING_PT,
  getNvdParagraphSpacingPt,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "../nvdEditor";

export type InspectorAssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type InspectorAsset = {
  defaultKeptTags: string[];
  extension: string;
  id: number;
  keptTags: string[];
  modified: string;
  name: string;
  notes: string;
  path: string;
  size: string;
  systemTags: string[];
  type: InspectorAssetType;
  userTags: string[];
};

export type InspectorAssetPlacementSuggestion = {
  path: string[];
};

type InspectorProps<TPlacementSuggestion extends InspectorAssetPlacementSuggestion> = {
  activeNvdStyleRole: NvdStyleRole | null;
  assetPlacementSuggestions: TPlacementSuggestion[];
  collapsed: boolean;
  documentStatistics: DocumentStatistics | null;
  modelInspectorResult: ModelInspectorResult | null;
  modelTransformOverride?: ModelTransform;
  nvdStyleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
  nvdLineHeight: number | null;
  nvdCharacterSpacingPt: number | null;
  nvdSpaceAfterPt: number | null;
  nvdSpaceBeforePt: number | null;
  nvvDocument: NvvDocument | null;
  onAcceptNvdStyle: () => void;
  onApplyNvdStyle: (role: NvdStyleRole) => void;
  onAssetKeptTagsChange: (assetId: number, tags: string[]) => void;
  onAssetNotesChange: (assetId: number, notes: string) => void;
  onAssetPlacementSuggestionAccept: (suggestion: TPlacementSuggestion) => void;
  onAssetTagsChange: (assetId: number, tags: string[]) => void;
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

export function Inspector<TPlacementSuggestion extends InspectorAssetPlacementSuggestion>({
  activeNvdStyleRole,
  assetPlacementSuggestions,
  collapsed,
  documentStatistics,
  modelInspectorResult,
  modelTransformOverride,
  nvdStyleDefinitions,
  nvdLineHeight,
  nvdCharacterSpacingPt,
  nvdSpaceAfterPt,
  nvdSpaceBeforePt,
  nvvDocument,
  onAcceptNvdStyle,
  onApplyNvdStyle,
  onAssetKeptTagsChange,
  onAssetNotesChange,
  onAssetPlacementSuggestionAccept,
  onAssetTagsChange,
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
}: InspectorProps<TPlacementSuggestion>) {
  const [placementSuggestionIndex, setPlacementSuggestionIndex] = useState(0);
  const selectedPlacementSuggestion =
    assetPlacementSuggestions.length > 0
      ? assetPlacementSuggestions[placementSuggestionIndex % assetPlacementSuggestions.length]
      : null;

  useEffect(() => {
    setPlacementSuggestionIndex(0);
  }, [assetPlacementSuggestions.length, selectedAsset?.id]);

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
          <div className={`inspector-asset-header ${selectedAsset.type === "3D" ? "inspector-asset-header-with-preview" : ""}`}>
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
            {selectedAsset.type === "3D" ? <InspectorMiniThreePreview asset={selectedAsset} /> : null}
          </div>

          <AssetTagEditor
            asset={selectedAsset}
            onKeptTagsChange={(tags) => onAssetKeptTagsChange(selectedAsset.id, tags)}
            onTagsChange={(tags) => onAssetTagsChange(selectedAsset.id, tags)}
            suggestions={tagSuggestions}
          />

          {nvvDocument ? <NvvCanvasSettings document={nvvDocument} onChange={onNvvDocumentChange} /> : null}

          {documentStatistics ? <WordCountSection statistics={documentStatistics} /> : null}
          {documentStatistics && selectedAsset.extension.toLowerCase() === "nvd" ? (
            <ParagraphSettings
              characterSpacingPt={nvdCharacterSpacingPt}
              lineHeight={nvdLineHeight}
              onCharacterSpacingPtChange={onNvdCharacterSpacingPtChange}
              onLineHeightChange={onNvdLineHeightChange}
              onSpaceAfterPtChange={onNvdSpaceAfterPtChange}
              onSpaceBeforePtChange={onNvdSpaceBeforePtChange}
              spaceAfterPt={nvdSpaceAfterPt}
              spaceBeforePt={nvdSpaceBeforePt}
            />
          ) : null}
          {documentStatistics && selectedAsset.extension.toLowerCase() === "nvd" ? (
            <NvdStylesSection
              activeStyleRole={activeNvdStyleRole}
              onAcceptStyle={onAcceptNvdStyle}
              onApplyStyle={onApplyNvdStyle}
              onResetStyle={onResetNvdStyle}
              onSelectStyle={onSelectNvdStyle}
              styleDefinitions={nvdStyleDefinitions}
            />
          ) : null}

          {selectedPlacementSuggestion ? (
            <AssetPlacementSuggestionCard
              suggestion={selectedPlacementSuggestion}
              suggestionCount={assetPlacementSuggestions.length}
              onAccept={() => onAssetPlacementSuggestionAccept(selectedPlacementSuggestion)}
              onRefresh={() => setPlacementSuggestionIndex((index) => index + 1)}
            />
          ) : null}

          {selectedAsset.type === "3D" ? (
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
            <section className="mt-4">
              <div className="section-label">Notes</div>
              <textarea
                aria-label={`Notes for ${selectedAsset.name}`}
                className="asset-notepad mt-2"
                placeholder="Add notes..."
                spellCheck="true"
                value={selectedAsset.notes}
                onChange={(event) => onAssetNotesChange(selectedAsset.id, event.currentTarget.value)}
              />
            </section>
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

function NvvSvgPreview({ document }: { document: NvvDocument }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<NvvDocument | null>(null);
  const isStale = Boolean(preview && previewDocument !== document);

  useEffect(() => {
    setPreview(null);
    setPreviewDocument(null);
  }, [document.createdAtUnix, document.title]);

  function refreshPreview() {
    setPreview(getNvvDocumentSvg(document));
    setPreviewDocument(document);
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="section-label">SVG Preview</div>
        <button className="nvv-svg-preview-refresh" type="button" onClick={refreshPreview}>
          <RefreshCw size={12} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>
      {preview ? (
        <>
          {isStale ? <p className="nvv-svg-preview-note">Preview may be out of date.</p> : null}
          <pre className="nvv-svg-preview-code" aria-label={`${document.title} SVG preview`}>
            <code>{preview}</code>
          </pre>
        </>
      ) : (
        <div className="nvv-svg-preview-empty">Refresh to generate SVG markup.</div>
      )}
    </section>
  );
}

function NvvCanvasSettings({ document, onChange }: { document: NvvDocument; onChange: (document: NvvDocument) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  function updateDimension(dimension: "canvasWidth" | "canvasHeight", value: number) {
    if (!Number.isFinite(value)) {
      return;
    }

    onChange({ ...document, [dimension]: Math.max(1, Math.round(value)) });
  }

  return (
    <section className="mt-4">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Canvas</span>
      </button>
      {isOpen ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <label className="nvv-canvas-field">
            <span>Width</span>
            <NvvCanvasNumberInput
              aria-label="Canvas width"
              onChange={(value) => updateDimension("canvasWidth", value)}
              value={document.canvasWidth}
            />
          </label>
          <label className="nvv-canvas-field">
            <span>Height</span>
            <NvvCanvasNumberInput
              aria-label="Canvas height"
              onChange={(value) => updateDimension("canvasHeight", value)}
              value={document.canvasHeight}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function NvvCanvasNumberInput({
  "aria-label": ariaLabel,
  onChange,
  value,
}: {
  "aria-label": string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(value.toString());

  useEffect(() => {
    setDraft(value.toString());
  }, [value]);

  function normalize(valueToNormalize: number | string) {
    const numberValue = Number(valueToNormalize);
    return Number.isFinite(numberValue) ? Math.max(1, Math.round(numberValue)) : value;
  }

  function commit() {
    if (!draft.trim()) {
      setDraft(value.toString());
      return;
    }

    const nextValue = normalize(draft);
    setDraft(nextValue.toString());
    onChange(nextValue);
  }

  function stepDraft(direction: -1 | 1) {
    const nextValue = normalize((Number(draft) || value) + direction);
    setDraft(nextValue.toString());
    onChange(nextValue);
  }

  return (
    <span className="paragraph-setting-field mt-1">
      <input
        aria-label={ariaLabel}
        className="paragraph-setting-select paragraph-setting-select-with-suffix nvv-canvas-number-input"
        inputMode="numeric"
        min="1"
        step="1"
        type="number"
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
      <span
        className="paragraph-setting-suffix normal-case"
        style={{ left: `calc(0.5rem + ${Math.max(draft.length, 1)}ch + 8px)` }}
        aria-hidden="true"
      >
        px
      </span>
      <span className="paragraph-setting-spinner">
        <button
          aria-label={`Increase ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronUp size={9} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(-1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronDown size={9} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    </span>
  );
}

function WordCountSection({ statistics }: { statistics: DocumentStatistics }) {
  const [isOpen, setIsOpen] = useState(true);
  const title = statistics.scope === "selection" ? "Selection Count" : "Word Count";
  const rows = [
    ...(statistics.pages === null ? [] : [["Pages", statistics.pages] as const]),
    ["Words", statistics.words],
    ["Characters", statistics.characters],
    ["Characters without spaces", statistics.charactersWithoutSpaces],
  ] as const;

  return (
    <section className="mt-3">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>{title}</span>
      </button>
      {isOpen ? (
        <dl className="mt-1">
          {rows.map(([label, value]) => (
            <div className="word-count-row" key={label}>
              <dt className="truncate text-xs font-semibold text-muted">{label}</dt>
              <dd className="text-right text-xs font-medium tabular-nums text-ink">{formatInteger(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function ParagraphSettings({
  characterSpacingPt,
  lineHeight,
  onCharacterSpacingPtChange,
  onLineHeightChange,
  onSpaceAfterPtChange,
  onSpaceBeforePtChange,
  spaceAfterPt,
  spaceBeforePt,
}: {
  characterSpacingPt: number | null;
  lineHeight: number | null;
  onCharacterSpacingPtChange: (characterSpacingPt: number, finalizeStyle?: boolean) => void;
  onLineHeightChange: (lineHeight: number, finalizeStyle?: boolean) => void;
  onSpaceAfterPtChange: (spaceAfterPt: number, finalizeStyle?: boolean) => void;
  onSpaceBeforePtChange: (spaceBeforePt: number, finalizeStyle?: boolean) => void;
  spaceAfterPt: number | null;
  spaceBeforePt: number | null;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="mt-3">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Paragraph</span>
      </button>
      {isOpen ? (
        <div className="paragraph-settings-mockup" aria-label="Paragraph settings">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="paragraph-setting-label">Space before</span>
              <ParagraphNumberInput
                aria-label="Space before"
                max={MAX_NVD_PARAGRAPH_SPACING_PT}
                min={MIN_NVD_PARAGRAPH_SPACING_PT}
                normalize={getNvdParagraphSpacingPt}
                onChange={onSpaceBeforePtChange}
                suffix="pt"
                step="1"
                value={spaceBeforePt}
              />
            </label>
            <label className="block">
              <span className="paragraph-setting-label">Space after</span>
              <ParagraphNumberInput
                aria-label="Space after"
                max={MAX_NVD_PARAGRAPH_SPACING_PT}
                min={MIN_NVD_PARAGRAPH_SPACING_PT}
                normalize={getNvdParagraphSpacingPt}
                onChange={onSpaceAfterPtChange}
                suffix="pt"
                step="1"
                value={spaceAfterPt}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="paragraph-setting-label">Line spacing</span>
              <ParagraphNumberInput
                aria-label="Line spacing"
                max={MAX_NVD_LINE_HEIGHT}
                min={MIN_NVD_LINE_HEIGHT}
                normalize={getNvdLineHeight}
                onChange={onLineHeightChange}
                step="0.05"
                value={lineHeight}
              />
            </label>
            <label className="block">
              <span className="paragraph-setting-label">Letter spacing</span>
              <ParagraphNumberInput
                aria-label="Letter spacing"
                max={MAX_NVD_CHARACTER_SPACING_PT}
                min={MIN_NVD_CHARACTER_SPACING_PT}
                normalize={getNvdCharacterSpacingPt}
                onChange={onCharacterSpacingPtChange}
                suffix="pt"
                step="0.1"
                value={characterSpacingPt}
              />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ParagraphNumberInput({
  "aria-label": ariaLabel,
  max,
  min,
  normalize,
  onChange,
  step,
  suffix,
  value,
}: {
  "aria-label": string;
  max: number;
  min: number;
  normalize: (value: number | string | null | undefined) => number;
  onChange: (value: number, finalizeStyle?: boolean) => void;
  step: string;
  suffix?: string;
  value: number | null;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? "");

  useEffect(() => {
    setDraft(value?.toString() ?? "");
  }, [value]);

  function commit(finalizeStyle = false) {
    if (!draft.trim()) {
      setDraft(value?.toString() ?? "");
      return;
    }

    const nextValue = normalize(draft);
    setDraft(nextValue.toString());
    onChange(nextValue, finalizeStyle);
  }

  function stepDraft(direction: -1 | 1) {
    const currentValue = Number(draft);
    const fallbackValue = value ?? min;
    const nextValue = normalize((Number.isFinite(currentValue) ? currentValue : fallbackValue) + Number(step) * direction);
    setDraft(nextValue.toString());
  }

  const input = (
    <input
      aria-label={ariaLabel}
      className={`paragraph-setting-select ${suffix ? "paragraph-setting-select-with-suffix" : "paragraph-setting-select-with-spinner"}`}
      inputMode="decimal"
      max={max}
      min={min}
      placeholder={value === null ? "Mixed" : undefined}
      step={step}
      type="number"
      value={draft}
      onBlur={() => commit()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(true);
        }
      }}
    />
  );

  return (
    <span className="paragraph-setting-field mt-1">
      {input}
      {suffix ? (
        <span
          className="paragraph-setting-suffix"
          style={{ left: `calc(0.5rem + ${Math.max(draft.length, 1)}ch + 6px)` }}
          aria-hidden="true"
        >
          {suffix}
        </span>
      ) : null}
      <span className="paragraph-setting-spinner">
        <button
          aria-label={`Increase ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronUp size={9} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(-1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronDown size={9} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    </span>
  );
}

function NvdStylesSection({
  activeStyleRole,
  onAcceptStyle,
  onApplyStyle,
  onResetStyle,
  onSelectStyle,
  styleDefinitions,
}: {
  activeStyleRole: NvdStyleRole | null;
  onAcceptStyle: () => void;
  onApplyStyle: (role: NvdStyleRole) => void;
  onResetStyle: (role: NvdStyleRole) => void;
  onSelectStyle: (role: NvdStyleRole) => void;
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="mt-3">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Styles</span>
      </button>
      {isOpen ? (
        <div className="mt-2 grid gap-1.5">
          {(["p", "h1", "h2", "h3"] as NvdStyleRole[]).map((role) => {
            const style = styleDefinitions[role];
            const isActive = role === activeStyleRole;

            return (
              <div className={`nvd-style-row ${isActive ? "nvd-style-row-active" : ""}`} key={role}>
                <button
                  className="nvd-style-preview"
                  title={`Apply ${style.label}`}
                  type="button"
                  onClick={() => onApplyStyle(role)}
                >
                  <span className="nvd-style-role">{role}</span>
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{
                      fontFamily: getNvdFontCssStack(style.fontFamily),
                      fontSize: `${Math.min(18, Math.max(11, style.fontSizePt * 0.55))}px`,
                      fontStyle: style.italic ? "italic" : "normal",
                      fontWeight: style.bold ? 700 : 400,
                      letterSpacing: `${style.characterSpacingPt}pt`,
                      textAlign: style.textAlign,
                    }}
                  >
                    {style.label}
                  </span>
                </button>
                <button
                  aria-label={`Reset ${style.label} to default`}
                  className="nvd-style-action"
                  title={`Reset ${style.label} to default`}
                  type="button"
                  onClick={() => onResetStyle(role)}
                >
                  <RefreshCw size={12} aria-hidden="true" />
                </button>
                <button
                  aria-label={isActive ? `Accept ${style.label} changes` : `Edit ${style.label}`}
                  className="nvd-style-action nvd-style-accept"
                  title={isActive ? `Accept ${style.label} changes` : `Edit ${style.label}`}
                  type="button"
                  onClick={isActive ? onAcceptStyle : () => onSelectStyle(role)}
                >
                  {isActive ? <Check size={13} aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function AssetPlacementSuggestionCard({
  onAccept,
  onRefresh,
  suggestion,
  suggestionCount,
}: {
  onAccept: () => void;
  onRefresh: () => void;
  suggestion: InspectorAssetPlacementSuggestion;
  suggestionCount: number;
}) {
  return (
    <section className="mt-4">
      <div className="section-label">Suggested Folder</div>
      <p className="mt-2 break-words text-sm font-semibold text-ink">{suggestion.path.join(" > ")}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button className="primary-button" type="button" onClick={onAccept}>
          <Plus size={14} aria-hidden="true" />
          <span>Accept</span>
        </button>
        <button className="secondary-button" disabled={suggestionCount <= 1} title="Try another suggestion" type="button" onClick={onRefresh}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function AssetTagEditor({
  asset,
  onKeptTagsChange,
  onTagsChange,
  suggestions,
}: {
  asset: InspectorAsset;
  onKeptTagsChange: (tags: string[]) => void;
  onTagsChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [draftTag, setDraftTag] = useState("");
  const suggestionId = `tag-suggestions-${asset.id}`;
  const normalizedDefaultKeptTags = new Set(asset.defaultKeptTags.map(normalizeLibraryMatchText));
  const normalizedKeptTags = new Set(asset.keptTags.map(normalizeLibraryMatchText));
  const normalizedSystemTags = new Set(asset.systemTags.map(normalizeLibraryMatchText));
  const normalizedUserTags = new Set(asset.userTags.map(normalizeLibraryMatchText));
  const availableSuggestions = suggestions
    .filter((tag) => {
      const normalizedTag = normalizeLibraryMatchText(tag);
      return !normalizedKeptTags.has(normalizedTag) && !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
    })
    .slice(0, 80);
  const keptOnlyTags = asset.keptTags.filter((tag) => {
    const normalizedTag = normalizeLibraryMatchText(tag);
    return !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
  });

  function addTag(value: string) {
    const [tag] = normalizeLibraryNodeTagValues([value]);

    if (!tag || normalizedKeptTags.has(tag) || normalizedSystemTags.has(tag) || normalizedUserTags.has(tag)) {
      setDraftTag("");
      return;
    }

    onTagsChange([...asset.userTags, tag]);
    setDraftTag("");
  }

  function removeTag(tagToRemove: string) {
    const normalizedTag = normalizeLibraryMatchText(tagToRemove);
    onTagsChange(asset.userTags.filter((tag) => normalizeLibraryMatchText(tag) !== normalizedTag));
  }

  function toggleKeptTag(tagToToggle: string) {
    const [normalizedTag] = normalizeLibraryNodeTagValues([tagToToggle]);

    if (!normalizedTag || normalizedDefaultKeptTags.has(normalizedTag)) {
      return;
    }

    if (normalizedKeptTags.has(normalizedTag)) {
      onKeptTagsChange(asset.keptTags.filter((tag) => normalizeLibraryMatchText(tag) !== normalizedTag));
      return;
    }

    onKeptTagsChange([...asset.keptTags, normalizedTag]);
  }

  function handleSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTag(draftTag);
  }

  return (
    <section className="mt-4">
      <div className="section-label">File Tags</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {asset.systemTags.map((tag) => {
          const normalizedTag = normalizeLibraryMatchText(tag);
          const isKept = normalizedKeptTags.has(normalizedTag);
          const isDefaultKept = normalizedDefaultKeptTags.has(normalizedTag);

          return (
            <button
              className={`tag tag-system tag-keep-button ${isKept ? "tag-kept" : ""}`}
              key={tag}
              title={isDefaultKept ? `${tag} is kept by default` : isKept ? `Stop keeping ${tag}` : `Keep ${tag}`}
              type="button"
              onClick={() => toggleKeptTag(tag)}
            >
              <span>{tag}</span>
              {isKept ? <Save size={10} aria-hidden="true" /> : null}
            </button>
          );
        })}
        {keptOnlyTags.map((tag) => (
          <button className="tag tag-keep-button tag-kept" key={tag} title={`Stop keeping ${tag}`} type="button" onClick={() => toggleKeptTag(tag)}>
            <span>{tag}</span>
            <Save size={10} aria-hidden="true" />
          </button>
        ))}
        {asset.userTags.map((tag) => (
          <button className="tag tag-editable" key={tag} title={`Remove ${tag}`} type="button" onClick={() => removeTag(tag)}>
            <span>{tag}</span>
            <X size={11} aria-hidden="true" />
          </button>
        ))}
      </div>
      <form className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-1.5" onSubmit={handleSubmit}>
        <input
          className="tag-input"
          list={suggestionId}
          placeholder="Add tag..."
          value={draftTag}
          onChange={(event) => setDraftTag(event.currentTarget.value)}
        />
        <datalist id={suggestionId}>
          {availableSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <button className="tag-add-button" type="submit">
          <Plus size={14} aria-hidden="true" />
          <span>Add</span>
        </button>
      </form>
    </section>
  );
}

function ModelInspector({
  modelResult,
  onTransformChange,
  onTransformReset,
  transformOverride,
}: {
  modelResult: ModelInspectorResult | null;
  onTransformChange: (transform: ModelTransform) => void;
  onTransformReset: () => void;
  transformOverride?: ModelTransform;
}) {
  const importedTransform = modelResult?.status === "ready" ? modelResult.info.rootTransform : defaultModelTransform;
  const transform = transformOverride ?? importedTransform;
  const modelInfo = modelResult?.status === "ready" ? modelResult.info : null;
  const dimensions = modelInfo ? getLiveModelDimensions(modelInfo, transform) : defaultModelTransform.position;
  const center = modelInfo ? getLiveModelCenter(modelInfo, transform) : defaultModelTransform.position;
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(true);

  function updateVector(field: ModelTransformField, axis: ModelAxis, value: number) {
    onTransformChange({
      ...transform,
      [field]: {
        ...transform[field],
        [axis]: value,
      },
    });
  }

  function updateDimensions(axis: ModelAxis, value: number) {
    if (!modelInfo) {
      return;
    }

    const targetDimension = Math.max(0, value);
    const currentDimension = Math.abs(dimensions[axis]);
    const currentScale = transform.scale[axis];
    const importedScale = modelInfo.rootTransform.scale[axis];
    const importedDimension = Math.abs(modelInfo.dimensions[axis]);
    let nextScale = currentScale;

    if (currentDimension > MODEL_NUMBER_EPSILON) {
      nextScale = currentScale * (targetDimension / currentDimension);
    } else if (importedDimension > MODEL_NUMBER_EPSILON) {
      nextScale = getModelScaleSign(currentScale, importedScale) * Math.abs(importedScale || 1) * (targetDimension / importedDimension);
    }

    onTransformChange({
      ...transform,
      scale: {
        ...transform.scale,
        [axis]: sanitizeModelNumber(nextScale),
      },
    });
  }

  function updateCenter(axis: ModelAxis, value: number) {
    if (!modelInfo) {
      return;
    }

    const delta = value - center[axis];

    onTransformChange({
      ...transform,
      position: {
        ...transform.position,
        [axis]: sanitizeModelNumber(transform.position[axis] + delta),
      },
    });
  }

  return (
    <>
      <section className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-expanded={isTransformOpen}
            className="model-section-toggle"
            type="button"
            onClick={() => setIsTransformOpen((open) => !open)}
          >
            {isTransformOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
            <span>Transform</span>
          </button>
          <button
            className="dark-icon-button"
            disabled={!transformOverride}
            title="Reset transform"
            onClick={onTransformReset}
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>
        {isTransformOpen ? (
          <div className="model-transform-panel">
            <ModelVectorControl
              label="Position"
              onChange={(axis, value) => updateVector("position", axis, value)}
              step={0.1}
              value={transform.position}
            />
            <ModelVectorControl
              label="Rotation"
              onChange={(axis, value) => updateVector("rotation", axis, value)}
              step={1}
              value={transform.rotation}
            />
            <ModelVectorControl
              label="Scale"
              onChange={(axis, value) => updateVector("scale", axis, value)}
              step={0.01}
              value={transform.scale}
            />
          </div>
        ) : null}
      </section>

      {modelInfo ? (
        <section className="mt-2" aria-label="Model dimensions and center">
          <div className="model-transform-panel">
            <ModelVectorControl label="Dimensions" onChange={updateDimensions} step={0.1} value={dimensions} />
            <ModelVectorControl label="Center" onChange={updateCenter} step={0.1} value={center} />
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <button
          aria-expanded={isModelOpen}
          className="model-section-toggle"
          type="button"
          onClick={() => setIsModelOpen((open) => !open)}
        >
          {isModelOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <span>Model</span>
        </button>
        {isModelOpen ? <ModelStats modelResult={modelResult} /> : null}
      </section>
    </>
  );
}

function ModelVectorControl({
  label,
  onChange,
  step,
  value,
}: {
  label: string;
  onChange: (axis: ModelAxis, value: number) => void;
  step: number;
  value: ModelVector3;
}) {
  return (
    <div className="model-vector-row">
      <span className="truncate text-xs font-semibold text-muted">{label}</span>
      <div className="grid min-w-0 grid-cols-3 gap-1.5">
        {modelAxes.map((axis) => (
          <label className="model-axis-field" key={axis}>
            <span className={`model-axis-label ${getAxisClassName(axis)}`}>{axis.toUpperCase()}</span>
            <input
              aria-label={`${label} ${axis.toUpperCase()}`}
              className="model-axis-input"
              inputMode="decimal"
              step={step}
              type="number"
              value={formatModelNumber(value[axis])}
              onChange={(event) => {
                const nextValue = Number(event.currentTarget.value);

                if (Number.isFinite(nextValue)) {
                  onChange(axis, nextValue);
                }
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ModelStats({ modelResult }: { modelResult: ModelInspectorResult | null }) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  if (!modelResult || modelResult.status === "loading") {
    return (
      <div className="mt-2 rounded-sm bg-surface p-3 text-sm text-muted">
        Loading model data...
      </div>
    );
  }

  if (modelResult.status === "error") {
    return (
      <div className="mt-2 rounded-sm bg-surface p-3 text-sm text-muted">
        {modelResult.message}
      </div>
    );
  }

  const { info } = modelResult;

  return (
    <>
      <dl className="model-stat-list">
        <ModelStat label="Nodes" value={formatInteger(info.nodeCount)} />
        <ModelStat label="Meshes" value={formatInteger(info.meshCount)} />
        <ModelStat label="Materials" value={formatInteger(info.materialCount)} />
        <ModelStat label="Vertices" value={formatInteger(info.vertexCount)} />
        <ModelStat label="Triangles" value={formatInteger(info.triangleCount)} />
      </dl>
      <div className="model-import-section">
        <button
          aria-expanded={isImportOpen}
          className="model-import-toggle"
          type="button"
          onClick={() => setIsImportOpen((open) => !open)}
        >
          {isImportOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <span>Import</span>
        </button>
        {isImportOpen ? (
          <div className="model-readout-list mt-1">
            <ModelVectorReadout label="Position" value={info.rootTransform.position} />
            <ModelVectorReadout label="Scale" value={info.rootTransform.scale} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function ModelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="model-stat-row">
      <dt className="truncate text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="truncate text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function ModelVectorReadout({ label, value }: { label: string; value: ModelVector3 }) {
  return (
    <div className="model-vector-readout">
      <span className="truncate text-xs font-semibold text-muted">{label}</span>
      <span className="truncate text-right text-xs font-medium text-ink">{formatModelVector(value)}</span>
    </div>
  );
}

function getAxisClassName(axis: ModelAxis) {
  switch (axis) {
    case "x":
      return "text-copper";
    case "y":
      return "text-forest";
    case "z":
      return "text-steel";
  }
}

function formatModelNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return Number(normalized.toFixed(3)).toString();
}

function formatModelVector(value: ModelVector3) {
  return `X ${formatModelNumber(value.x)}  Y ${formatModelNumber(value.y)}  Z ${formatModelNumber(value.z)}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}
