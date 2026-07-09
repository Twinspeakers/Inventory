import { useEffect, useState, type WheelEvent as ReactWheelEvent } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Archive,
  Box,
  Eye,
  FileAudio,
  FileImage,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderSearch,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  NvdDocument,
  NvdTextAlignment,
  NvvDocument,
  NvvDocumentChangeOptions,
  OpenedNvdDocument,
  OpenedNvvDocument,
} from "../inventoryProject";
import {
  getNvdFontFamily,
  getNvdFontSizePt,
  NvdEditor,
  NvdFontSelector,
  NvdFontSizeSelector,
  NvdZoomSelector,
  DEFAULT_NVD_ZOOM_PERCENT,
  stepNvdZoomPercent,
  type NvdEditorController,
  type NvdStyleDefinition,
  type NvdTextSelection,
} from "../nvdEditor";
import { DEFAULT_NVV_ZOOM_PERCENT, NvvEditor, NvvZoomSelector, stepNvvZoomPercent } from "../nvvEditor";
import { NativeHub, type NativeHubAsset, type NativeHubView } from "../nativeHubs";
import { AudioThumbnail } from "../../sceneReaders/audioReader";
import { MarkdownPreview, isMarkdownExtension } from "../../sceneReaders/markdownDocumentReader";
import { PdfPreview } from "../../sceneReaders/pdfDocumentReader";
import { RasterImagePreview } from "../../sceneReaders/rasterImageReader";
import {
  ThreePreview,
  ThreeThumbnail,
  type ModelInspectorResult,
  type ModelTransform,
} from "../../sceneReaders/threeModelReader";
import { VectorImagePreview, isVectorImageExtension } from "../../sceneReaders/vectorImageReader";
import { getAssetFileUrl } from "../../sceneReaders/previewIo";

type SceneAssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type SceneViewerAsset = {
  extension: string;
  id: number;
  name: string;
  path: string;
  size: string;
  type: SceneAssetType;
  color: string;
};

export type SceneProjectDocument = {
  inventoryName: string;
  manifestFileName: string;
  rootPath: string;
};

export type SceneMode = "preview" | "nvd-document" | "nvv-document";

const typeIcons: Record<SceneAssetType, LucideIcon> = {
  Image: FileImage,
  "3D": Box,
  Audio: FileAudio,
  Document: FileText,
  Archive,
};

const nvdAlignmentButtons: {
  icon: LucideIcon;
  label: string;
  textAlign: NvdTextAlignment;
}[] = [
  { icon: AlignLeft, label: "Align left", textAlign: "left" },
  { icon: AlignCenter, label: "Align center", textAlign: "center" },
  { icon: AlignRight, label: "Align right", textAlign: "right" },
  { icon: AlignJustify, label: "Justify", textAlign: "justify" },
];

export function PreviewStage<TAsset extends SceneViewerAsset>({
  asset,
  canOpenFolder,
  isScanning,
  modelTransformOverride,
  nvdDocument,
  nvdStyleDraft,
  nvvDocument,
  onCreateNvdDocument,
  onCreateNvvDocument,
  onCloseNvdDocument,
  onNvdDocumentActivate,
  onNvvDocumentActivate,
  onNvdDocumentChange,
  onNvdEditorControllerChange,
  onNvdStyleDraftChange,
  onNvdTextSelectionChange,
  onCloseNvvDocument,
  onNvvDocumentChange,
  onModelInspectorResult,
  onOpenFolder,
  onDismissNvdSaveReminder,
  onSceneModeChange,
  onSelectAsset,
  onSelectNativeHub,
  projectDocument,
  previewBackground,
  sceneMode,
  showNvdDocumentPrompt,
  nativeHub,
  nativeHubAssets,
  showNvdSaveReminder,
  sourcePath,
}: {
  asset: TAsset | null;
  canOpenFolder: boolean;
  isScanning: boolean;
  modelTransformOverride?: ModelTransform;
  nvdDocument: OpenedNvdDocument | null;
  nvdStyleDraft: NvdStyleDefinition | null;
  nvvDocument: OpenedNvvDocument | null;
  onCreateNvdDocument: () => void;
  onCreateNvvDocument: () => void;
  onCloseNvdDocument: () => void;
  onNvdDocumentActivate: () => void;
  onNvvDocumentActivate: () => void;
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvdEditorControllerChange: (controller: NvdEditorController | null) => void;
  onNvdStyleDraftChange: (style: NvdStyleDefinition) => void;
  onNvdTextSelectionChange: (selection: NvdTextSelection | null) => void;
  onCloseNvvDocument: () => void;
  onNvvDocumentChange: (document: NvvDocument, options?: NvvDocumentChangeOptions) => void;
  onModelInspectorResult: (asset: TAsset, result: ModelInspectorResult) => void;
  onOpenFolder: () => void;
  onDismissNvdSaveReminder: () => void;
  onSceneModeChange: (mode: SceneMode) => void;
  onSelectAsset: (assetId: number) => void;
  onSelectNativeHub: (view: NativeHubView) => void;
  projectDocument: SceneProjectDocument | null;
  previewBackground: string;
  sceneMode: SceneMode;
  showNvdDocumentPrompt: boolean;
  nativeHub: { inventoryName: string; view: NativeHubView } | null;
  nativeHubAssets: NativeHubAsset[];
  showNvdSaveReminder: boolean;
  sourcePath: string | null;
}) {
  const [nvdEditorController, setNvdEditorController] = useState<NvdEditorController | null>(null);
  const [nvdZoomPercent, setNvdZoomPercent] = useState(DEFAULT_NVD_ZOOM_PERCENT);
  const [nvvZoomPercent, setNvvZoomPercent] = useState(DEFAULT_NVV_ZOOM_PERCENT);
  const is3dPreview = asset?.type === "3D";
  const isPdfPreview = asset?.type === "Document" && asset.extension === "pdf";
  const isMarkdownPreview = asset?.type === "Document" && isMarkdownExtension(asset.extension);
  const shouldFillStage = sceneMode === "nvd-document" || sceneMode === "nvv-document" || is3dPreview || isPdfPreview || isMarkdownPreview;
  const title = asset?.name ?? (nativeHub ? getNativeHubTitle(nativeHub.view) : showNvdDocumentPrompt ? "Write" : projectDocument ? `${projectDocument.inventoryName} README` : "Preview Stage");
  const description = asset
    ? `${asset.type} / .${asset.extension} / ${asset.size}`
    : nativeHub
      ? `Inventory / ${getNativeHubTitle(nativeHub.view)}`
      : showNvdDocumentPrompt
      ? "Inventory / Write"
      : projectDocument
      ? `Inventory / ${projectDocument.manifestFileName} / ${projectDocument.rootPath}`
      : sourcePath
        ? getBaseName(sourcePath)
        : "No asset selected";

  useEffect(() => {
    setNvdEditorController(null);
    onNvdEditorControllerChange(null);
    onNvdTextSelectionChange(null);
  }, [nvdDocument?.path, onNvdEditorControllerChange, onNvdTextSelectionChange, sceneMode]);

  function handleNvdEditorControllerChange(controller: NvdEditorController) {
    setNvdEditorController(controller);
    onNvdEditorControllerChange(controller);
  }

  return (
    <section className="relative flex min-h-[310px] flex-1 flex-col overflow-hidden border-b border-line bg-preview">
      <SceneToolbar
        pendingPreviewName={
          sceneMode === "nvd-document" && asset && asset.id !== nvdDocument?.entry.assetId ? asset.name : null
        }
        mode={sceneMode}
        nvdDocument={nvdDocument}
        nvdEditorController={nvdEditorController}
        nvdStyleDraft={nvdStyleDraft}
        nvvDocument={nvvDocument}
        onNvdDocumentChange={onNvdDocumentChange}
        onCloseNvdDocument={onCloseNvdDocument}
        onCloseNvvDocument={onCloseNvvDocument}
        onNvdStyleDraftChange={onNvdStyleDraftChange}
        onNvdZoomChange={setNvdZoomPercent}
        onNvvZoomChange={setNvvZoomPercent}
        onSceneModeChange={onSceneModeChange}
        nvdZoomPercent={nvdZoomPercent}
        nvvZoomPercent={nvvZoomPercent}
        previewModeLabel={nativeHub ? "" : "Asset Preview"}
      />
      {sceneMode === "preview" && !nativeHub ? (
        <div className="preview-stage-label">
          <h1 className="max-w-full truncate text-sm font-semibold">{title}</h1>
          <p className="max-w-full truncate text-xs text-muted">{description}</p>
        </div>
      ) : null}
      {showNvdSaveReminder ? (
        <div className="nvd-save-reminder" role="status">
          <span>Press Ctrl + S to Save changes.</span>
          <button
            aria-label="Turn off save reminder"
            className="nvd-save-reminder-close"
            title="Turn off save reminder"
            type="button"
            onClick={onDismissNvdSaveReminder}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className={`relative min-h-0 flex-1 ${shouldFillStage ? "overflow-hidden p-0" : "overflow-auto p-4"}`}>
        {sceneMode === "nvd-document" ? (
          <NvdDocumentMode
            nvdDocument={nvdDocument}
            onNvdDocumentActivate={onNvdDocumentActivate}
            onNvdEditorControllerChange={handleNvdEditorControllerChange}
            onNvdDocumentChange={onNvdDocumentChange}
            onNvdTextSelectionChange={onNvdTextSelectionChange}
            onNvdZoomChange={setNvdZoomPercent}
            nvdZoomPercent={nvdZoomPercent}
          />
        ) : sceneMode === "nvv-document" && nvvDocument ? (
          <NvvDocumentMode
            document={nvvDocument.document}
            nvvZoomPercent={nvvZoomPercent}
            onNvvDocumentActivate={onNvvDocumentActivate}
            onNvvDocumentChange={onNvvDocumentChange}
            onNvvZoomChange={setNvvZoomPercent}
          />
        ) : nativeHub ? (
          <NativeHub
            assets={nativeHubAssets}
            onCreateDocument={onCreateNvdDocument}
            onCreateVector={onCreateNvvDocument}
            onOpenAsset={onSelectAsset}
            onSelectHub={onSelectNativeHub}
            view={nativeHub.view}
          />
        ) : asset ? (
          <AssetPreview
            asset={asset}
            modelTransformOverride={modelTransformOverride}
            onModelInspectorResult={onModelInspectorResult}
            previewBackground={previewBackground}
          />
        ) : showNvdDocumentPrompt ? (
          <NvdDocumentEmptyPreview onCreateNvdDocument={onCreateNvdDocument} />
        ) : projectDocument ? (
          <InventoryProjectDocumentPreview projectDocument={projectDocument} onOpenFolder={onOpenFolder} />
        ) : (
          <EmptyPreview canOpenFolder={canOpenFolder} isScanning={isScanning} onOpenFolder={onOpenFolder} />
        )}
      </div>
    </section>
  );
}

function getNativeHubTitle(view: NativeHubView) {
  if (view === "inventory-documents") return "Write";
  if (view === "inventory-vectors") return "Draw";
  return "Inventory";
}

function NvdDocumentEmptyPreview({ onCreateNvdDocument }: { onCreateNvdDocument: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="max-w-md text-center text-ink">
        <h2 className="text-lg font-semibold">Create an NVD document</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Native documents created here belong to this Inventory.
        </p>
        <button className="primary-button mx-auto mt-5" type="button" onClick={onCreateNvdDocument}>
          <FilePlus2 size={16} aria-hidden="true" />
          <span>New NVD Document</span>
        </button>
      </div>
    </div>
  );
}

function SceneToolbar({
  mode,
  nvdDocument,
  nvdEditorController,
  nvdStyleDraft,
  nvvDocument,
  onCloseNvdDocument,
  onCloseNvvDocument,
  onNvdDocumentChange,
  onNvdStyleDraftChange,
  onNvdZoomChange,
  onNvvZoomChange,
  onSceneModeChange,
  pendingPreviewName,
  previewModeLabel,
  nvdZoomPercent,
  nvvZoomPercent,
}: {
  mode: SceneMode;
  nvdDocument: OpenedNvdDocument | null;
  nvdEditorController: NvdEditorController | null;
  nvdStyleDraft: NvdStyleDefinition | null;
  nvvDocument: OpenedNvvDocument | null;
  onCloseNvdDocument: () => void;
  onCloseNvvDocument: () => void;
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvdStyleDraftChange: (style: NvdStyleDefinition) => void;
  onNvdZoomChange: (zoomPercent: number) => void;
  onNvvZoomChange: (zoomPercent: number) => void;
  onSceneModeChange: (mode: SceneMode) => void;
  pendingPreviewName: string | null;
  previewModeLabel: string;
  nvdZoomPercent: number;
  nvvZoomPercent: number;
}) {
  const previewHasAttention = Boolean(pendingPreviewName);
  const previewLabel = previewHasAttention ? `Asset Preview: ${pendingPreviewName} selected` : previewModeLabel;
  const formattingEnabled = Boolean(nvdEditorController || nvdStyleDraft);
  const fontFamily = nvdStyleDraft?.fontFamily ?? nvdEditorController?.fontFamily ?? getNvdFontFamily(nvdDocument?.document.fontFamily);
  const fontSizePt = nvdStyleDraft?.fontSizePt ?? nvdEditorController?.fontSizePt ?? getNvdFontSizePt(nvdDocument?.document.fontSize);
  const isBold = nvdStyleDraft?.bold ?? nvdEditorController?.isBold ?? false;
  const isItalic = nvdStyleDraft?.italic ?? nvdEditorController?.isItalic ?? false;
  const activeTextAlign = nvdStyleDraft?.textAlign ?? nvdEditorController?.textAlign;

  return (
    <div className="scene-toolbar">
      <div className="flex min-w-0 items-center gap-1">
        <button
          aria-label={previewLabel}
          aria-pressed={mode === "preview"}
          className={`scene-toolbar-button ${mode === "preview" ? "scene-toolbar-button-active" : ""} ${
            previewHasAttention ? "scene-toolbar-button-attention" : ""
          }`}
          title={previewLabel}
          type="button"
          onClick={() => onSceneModeChange("preview")}
        >
          <Eye size={18} aria-hidden="true" />
        </button>
        {mode === "preview" && previewModeLabel ? <div className="scene-toolbar-readout">{previewModeLabel}</div> : null}
        {mode === "nvd-document" && nvdDocument ? (
          <>
            <NvdFontSelector
              disabled={!formattingEnabled}
              fontFamily={fontFamily}
              onChange={(nextFontFamily) =>
                nvdStyleDraft
                  ? onNvdStyleDraftChange({ ...nvdStyleDraft, fontFamily: nextFontFamily })
                  : nvdEditorController?.setFontFamily(nextFontFamily)
              }
            />
            <NvdFontSizeSelector
              disabled={!formattingEnabled}
              fontSizePt={fontSizePt}
              onChange={(nextFontSizePt) =>
                nvdStyleDraft
                  ? onNvdStyleDraftChange({ ...nvdStyleDraft, fontSizePt: nextFontSizePt })
                  : nvdEditorController?.setFontSizePt(nextFontSizePt)
              }
            />
            <button
              aria-label="Bold"
              aria-pressed={isBold}
              className={`nvd-format-button ${isBold ? "nvd-format-button-active" : ""}`}
              disabled={!formattingEnabled}
              title="Bold (Ctrl+B)"
              type="button"
              onClick={() =>
                nvdStyleDraft
                  ? onNvdStyleDraftChange({ ...nvdStyleDraft, bold: !nvdStyleDraft.bold })
                  : nvdEditorController?.toggleBold()
              }
              onMouseDown={(event) => event.preventDefault()}
            >
              <span className="nvd-format-glyph nvd-bold-icon" aria-hidden="true">B</span>
            </button>
            <button
              aria-label="Italic"
              aria-pressed={isItalic}
              className={`nvd-format-button ${isItalic ? "nvd-format-button-active" : ""}`}
              disabled={!formattingEnabled}
              title="Italic (Ctrl+I)"
              type="button"
              onClick={() =>
                nvdStyleDraft
                  ? onNvdStyleDraftChange({ ...nvdStyleDraft, italic: !nvdStyleDraft.italic })
                  : nvdEditorController?.toggleItalic()
              }
              onMouseDown={(event) => event.preventDefault()}
            >
              <span className="nvd-format-glyph nvd-italic-icon" aria-hidden="true">I</span>
            </button>
            {nvdAlignmentButtons.map(({ icon: AlignmentIcon, label, textAlign }) => (
              <button
                aria-label={label}
                aria-pressed={activeTextAlign === textAlign}
                className={`nvd-format-button ${
                  activeTextAlign === textAlign ? "nvd-format-button-active" : ""
                }`}
                disabled={!formattingEnabled}
                key={textAlign}
                title={label}
                type="button"
                onClick={() =>
                  nvdStyleDraft
                    ? onNvdStyleDraftChange({ ...nvdStyleDraft, textAlign })
                    : nvdEditorController?.setTextAlign(textAlign)
                }
                onMouseDown={(event) => event.preventDefault()}
              >
                <AlignmentIcon size={15} aria-hidden="true" />
              </button>
            ))}
          </>
        ) : null}
      </div>
      {mode === "nvd-document" && nvdDocument ? (
        <div className="flex items-center gap-1">
          <NvdZoomSelector zoomPercent={nvdZoomPercent} onChange={onNvdZoomChange} />
          <button
            aria-label="Close NVD document"
            className="nvd-format-button"
            title="Close NVD document"
            type="button"
            onClick={onCloseNvdDocument}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : mode === "nvv-document" && nvvDocument ? (
        <div className="flex items-center gap-1">
          <NvvZoomSelector zoomPercent={nvvZoomPercent} onChange={onNvvZoomChange} />
          <button
            aria-label="Close NVV document"
            className="nvd-format-button"
            title="Close NVV document"
            type="button"
            onClick={onCloseNvvDocument}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NvdDocumentMode({
  nvdDocument,
  onNvdDocumentActivate,
  onNvdEditorControllerChange,
  onNvdDocumentChange,
  onNvdTextSelectionChange,
  onNvdZoomChange,
  nvdZoomPercent,
}: {
  nvdDocument: OpenedNvdDocument | null;
  onNvdDocumentActivate: () => void;
  onNvdEditorControllerChange: (controller: NvdEditorController) => void;
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvdTextSelectionChange: (selection: NvdTextSelection) => void;
  onNvdZoomChange: (zoomPercent: number) => void;
  nvdZoomPercent: number;
}) {
  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey || event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    onNvdZoomChange(stepNvdZoomPercent(nvdZoomPercent, event.deltaY < 0 ? "in" : "out"));
  }

  return (
    <div className="h-full" onWheel={handleWheel}>
      <NvdEditor
        openedDocument={nvdDocument}
        onActivate={onNvdDocumentActivate}
        onControllerChange={onNvdEditorControllerChange}
        onDocumentChange={onNvdDocumentChange}
        onSelectionChange={onNvdTextSelectionChange}
        zoomPercent={nvdZoomPercent}
      />
    </div>
  );
}

function NvvDocumentMode({
  document,
  nvvZoomPercent,
  onNvvDocumentActivate,
  onNvvDocumentChange,
  onNvvZoomChange,
}: {
  document: NvvDocument;
  nvvZoomPercent: number;
  onNvvDocumentActivate: () => void;
  onNvvDocumentChange: (document: NvvDocument, options?: NvvDocumentChangeOptions) => void;
  onNvvZoomChange: (zoomPercent: number) => void;
}) {
  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey || event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    onNvvZoomChange(stepNvvZoomPercent(nvvZoomPercent, event.deltaY < 0 ? "in" : "out"));
  }

  return (
    <div className="h-full" onWheel={handleWheel}>
      <NvvEditor document={document} onActivate={onNvvDocumentActivate} onChange={onNvvDocumentChange} zoomPercent={nvvZoomPercent} />
    </div>
  );
}

function InventoryProjectDocumentPreview({
  projectDocument,
  onOpenFolder,
}: {
  projectDocument: SceneProjectDocument;
  onOpenFolder: () => void;
}) {
  return (
    <div className="project-readme-stage">
      <article className="project-readme-page">
        <div className="project-readme-header">
          <div>
            <p className="project-readme-kicker">Inventory Project</p>
            <h2>{projectDocument.inventoryName}</h2>
          </div>
          <div className="project-readme-file">{projectDocument.manifestFileName}</div>
        </div>

        <section className="project-readme-section">
          <h3>Project State</h3>
          <p>
            This Inventory is open and ready. No source folders are loaded yet, so the workspace, scene, and inspector are waiting
            for assets.
          </p>
        </section>

        <section className="project-readme-section">
          <h3>Project Folder</h3>
          <p className="project-readme-path">{projectDocument.rootPath}</p>
        </section>

        <section className="project-readme-grid">
          <div>
            <h3>Library</h3>
            <p>Master Library is clean. New folders and placements will be saved into this Inventory.</p>
          </div>
          <div>
            <h3>Source Folders</h3>
            <p>None loaded.</p>
          </div>
        </section>

        <div className="project-readme-footer">
          <button className="primary-button" type="button" onClick={onOpenFolder}>
            <FolderOpen size={16} aria-hidden="true" />
            <span>Add Source Folder</span>
          </button>
          <span>Page 1</span>
        </div>
      </article>
    </div>
  );
}

function AssetPreview<TAsset extends SceneViewerAsset>({
  asset,
  modelTransformOverride,
  onModelInspectorResult,
  previewBackground,
}: {
  asset: TAsset;
  modelTransformOverride?: ModelTransform;
  onModelInspectorResult: (asset: TAsset, result: ModelInspectorResult) => void;
  previewBackground: string;
}) {
  const Icon = typeIcons[asset.type];

  if (asset.type === "Document" && (asset.extension.toLowerCase() === "nvd" || asset.extension.toLowerCase() === "nvv")) {
    return <div className="min-h-full" />;
  }

  if (asset.type === "Image" && isVectorImageExtension(asset.extension)) {
    return <VectorImagePreview asset={asset} />;
  }

  if (asset.type === "Image") {
    return <RasterImagePreview asset={asset} />;
  }

  if (asset.type === "Document" && asset.extension === "pdf") {
    return <PdfPreview asset={asset} />;
  }

  if (asset.type === "Document" && isMarkdownExtension(asset.extension)) {
    return <MarkdownPreview asset={asset} previewBackground={previewBackground} />;
  }

  if (asset.type === "3D") {
    return (
      <ThreePreview
        asset={asset}
        onInspectorResult={onModelInspectorResult}
        previewBackground={previewBackground}
        transformOverride={modelTransformOverride}
      />
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="flex h-52 w-52 items-center justify-center rounded-sm border border-line bg-surface text-ink">
        <Icon size={96} strokeWidth={1.4} aria-hidden="true" />
      </div>
    </div>
  );
}

function EmptyPreview({
  canOpenFolder,
  isScanning,
  onOpenFolder,
}: {
  canOpenFolder: boolean;
  isScanning: boolean;
  onOpenFolder: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="max-w-md text-center text-ink">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm bg-surface">
          <FolderSearch size={28} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          {canOpenFolder ? (isScanning ? "Scanning source folder..." : "Open a source folder") : "No Inventory Open"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {canOpenFolder
            ? "Scanned files will appear in the asset shelf below. The left panel is reserved for the library structure you create."
            : "Create or open an Inventory to load source folders."}
        </p>
        {canOpenFolder ? (
          <button className="primary-button mx-auto mt-5" disabled={isScanning} onClick={onOpenFolder}>
            <FolderOpen size={16} aria-hidden="true" />
            <span>{isScanning ? "Scanning" : "Open Folder"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AssetThumbnail({
  asset,
  nvdDocument,
}: {
  asset: SceneViewerAsset;
  nvdDocument?: OpenedNvdDocument | null;
}) {
  if (asset.type === "Audio") {
    return <AudioThumbnail asset={asset} />;
  }

  if (asset.type === "Image") {
    return <ImageThumbnail asset={asset} />;
  }

  if (asset.type === "3D" && ["glb", "gltf", "obj", "stl"].includes(asset.extension.toLowerCase())) {
    return <ThreeThumbnail asset={asset} />;
  }

  return <FallbackThumbnail asset={asset} />;
}

function ImageThumbnail({ asset }: { asset: SceneViewerAsset }) {
  const [failed, setFailed] = useState(false);
  const [fitMode, setFitMode] = useState<"contain" | "cover">(() => getThumbnailFitMode(asset.extension));

  useEffect(() => {
    setFailed(false);
    setFitMode(getThumbnailFitMode(asset.extension));
  }, [asset.extension, asset.path]);

  if (failed) {
    return <FallbackThumbnail asset={asset} />;
  }

  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-sm border border-line ${
        fitMode === "contain" ? "transparent-checkerboard bg-surface" : "bg-preview"
      }`}
    >
      <img
        alt=""
        className={fitMode === "contain" ? "h-full w-full p-3 object-contain" : "h-full w-full object-cover"}
        decoding="async"
        loading="lazy"
        src={getAssetFileUrl(asset.path)}
        onLoad={(event) => {
          setFitMode(getThumbnailFitMode(asset.extension, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight));
        }}
        onError={() => setFailed(true)}
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function getThumbnailFitMode(extension: string, width?: number, height?: number) {
  const normalizedExtension = extension.toLowerCase();

  if (normalizedExtension === "svg") {
    return "contain";
  }

  if (!width || !height) {
    return "cover";
  }

  const maxDimension = Math.max(width, height);
  const pixelArea = width * height;

  if (maxDimension <= 320 || pixelArea <= 160_000) {
    return "contain";
  }

  return "cover";
}

function FallbackThumbnail({ asset }: { asset: SceneViewerAsset }) {
  const Icon = typeIcons[asset.type];

  return (
    <div className={`flex aspect-[4/3] items-center justify-center rounded-sm ${asset.color} text-white`}>
      <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

function getBaseName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
