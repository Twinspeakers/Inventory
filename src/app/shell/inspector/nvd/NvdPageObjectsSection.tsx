import { ChevronDown, ChevronRight, ImagePlus, Layers2, Square, X } from "lucide-react";
import { useState } from "react";
import type {
  NvdPageObject,
  NvdPageObjectAsset,
  NvdPageObjectZMode,
} from "../../../../features/inventoryProject";
import type {
  NvdDraftPageObject,
  NvdPageObjectToolMode,
} from "../../../../features/nvdEditor";
import { createNvdPageObjectAsset as createAssetFrameBinding } from "../../../../features/nvdEditor";
import type { Asset } from "../../../appTypes";

export function NvdPageObjectsSection({
  canSaveDraft,
  draftPageObject,
  pageObjectToolMode,
  selectedPageObject,
  selectionKind,
  workspaceSelectedAsset,
  onAssignAsset,
  onDeleteSelectedPageObject,
  onDiscardDraft,
  onSetWrapMode,
  onSetZMode,
  onSaveDraft,
  onToolModeChange,
}: {
  canSaveDraft: boolean;
  draftPageObject: NvdDraftPageObject | null;
  pageObjectToolMode: NvdPageObjectToolMode;
  selectedPageObject: NvdPageObject | null;
  selectionKind: "block" | "insertion" | "none" | "page-object" | "text";
  workspaceSelectedAsset: Asset | null;
  onAssignAsset: (asset: NvdPageObjectAsset | null) => void;
  onDeleteSelectedPageObject: () => void;
  onDiscardDraft: () => void;
  onSetWrapMode: (wrapMode: "none" | "rectangle") => void;
  onSetZMode: (zMode: NvdPageObjectZMode) => void;
  onSaveDraft: () => void;
  onToolModeChange: (mode: NvdPageObjectToolMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isFrameToolActive = pageObjectToolMode === "frame";
  const hasSelectedPageObject = selectionKind === "page-object";
  const selectedPageObjectAsset = selectedPageObject?.asset ?? null;
  const canAssignWorkspaceAsset = Boolean(
    workspaceSelectedAsset && isAssignableWorkspaceAsset(workspaceSelectedAsset),
  );
  const layerMode = selectedPageObject?.zMode ?? "in-front-of-text";
  const wrapMode = selectedPageObject?.wrapMode ?? "none";

  return (
    <section className="mt-3">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Frames</span>
      </button>
      {isOpen ? (
        <div className="nvd-frame-section-body" aria-label="Frame tools">
          <button
            aria-pressed={isFrameToolActive}
            className="command-button justify-between"
            type="button"
            onClick={() => onToolModeChange(isFrameToolActive ? "text" : "frame")}
          >
            <span className="inline-flex items-center gap-2">
              <Square size={14} aria-hidden="true" />
              <span>{isFrameToolActive ? "Frame Tool On" : "Frame Tool Off"}</span>
            </span>
            <span className="text-[10px] uppercase text-muted">
              {isFrameToolActive ? "Text" : "Frame"}
            </span>
          </button>

          {draftPageObject ? (
            <>
              <div className="nvd-frame-readout">
                <span>Draft selection</span>
                <span>{Math.round(draftPageObject.widthPx)} x {Math.round(draftPageObject.heightPx)}</span>
              </div>
              <div className="nvd-frame-section-actions">
                <button
                  className="command-button"
                  disabled={!canSaveDraft}
                  type="button"
                  onClick={onSaveDraft}
                >
                  Save Selection
                </button>
                <button className="command-button" type="button" onClick={onDiscardDraft}>
                  Cancel
                </button>
              </div>
            </>
          ) : null}

          {hasSelectedPageObject ? (
            <>
              <div className="nvd-frame-readout">
                <span>Assigned asset</span>
                <span>{selectedPageObjectAsset?.assetName?.trim() || "None"}</span>
              </div>

              <div className="nvd-frame-section-actions">
                <button
                  className="command-button"
                  disabled={!canAssignWorkspaceAsset}
                  type="button"
                  onClick={() =>
                    workspaceSelectedAsset && isAssignableWorkspaceAsset(workspaceSelectedAsset)
                      ? onAssignAsset(createPageObjectAssetFromWorkspaceAsset(workspaceSelectedAsset))
                      : undefined
                  }
                >
                  <ImagePlus size={14} aria-hidden="true" />
                  <span>Use Selected Asset</span>
                </button>
                <button
                  className="command-button"
                  disabled={!selectedPageObjectAsset}
                  type="button"
                  onClick={() => onAssignAsset(null)}
                >
                  <X size={14} aria-hidden="true" />
                  <span>Clear Asset</span>
                </button>
              </div>

              <div className="nvd-frame-assignment-note">
                {workspaceSelectedAsset
                  ? isAssignableWorkspaceAsset(workspaceSelectedAsset)
                    ? `Selected in workspace: ${workspaceSelectedAsset.name}`
                    : `Selected in workspace: ${workspaceSelectedAsset.name} cannot be placed in a frame yet.`
                  : "Select an image, vector, 3D asset, or document in the workspace to assign it here."}
              </div>

              <div className="nvd-frame-option-group">
                <div className="nvd-frame-option-label">
                  <Layers2 size={13} aria-hidden="true" />
                  <span>Layer</span>
                </div>
                <div className="nvd-frame-section-actions">
                  <button
                    aria-pressed={layerMode === "in-front-of-text"}
                    className={`command-button ${
                      layerMode === "in-front-of-text" ? "nvd-frame-option-active" : ""
                    }`}
                    type="button"
                    onClick={() => onSetZMode("in-front-of-text")}
                  >
                    In Front
                  </button>
                  <button
                    aria-pressed={layerMode === "behind-text"}
                    className={`command-button ${
                      layerMode === "behind-text" ? "nvd-frame-option-active" : ""
                    }`}
                    type="button"
                    onClick={() => onSetZMode("behind-text")}
                  >
                    Behind Text
                  </button>
                </div>
              </div>

              <div className="nvd-frame-option-group">
                <div className="nvd-frame-option-label">
                  <span>Text Wrap</span>
                </div>
                <div className="nvd-frame-section-actions">
                  <button
                    aria-pressed={wrapMode === "none"}
                    className={`command-button ${
                      wrapMode === "none" ? "nvd-frame-option-active" : ""
                    }`}
                    type="button"
                    onClick={() => onSetWrapMode("none")}
                  >
                    None
                  </button>
                  <button
                    aria-pressed={wrapMode === "rectangle"}
                    className={`command-button ${
                      wrapMode === "rectangle" ? "nvd-frame-option-active" : ""
                    }`}
                    type="button"
                    onClick={() => onSetWrapMode("rectangle")}
                  >
                    Rectangle
                  </button>
                </div>
              </div>

              <button className="command-button" type="button" onClick={onDeleteSelectedPageObject}>
                Delete Frame
              </button>
            </>
          ) : null}

          {!draftPageObject && !hasSelectedPageObject ? (
            <p className="nvd-frame-section-note">
              Switch to the frame tool, then drag on the page to create a selection.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function isAssignableWorkspaceAsset(asset: Asset) {
  return asset.type !== "Audio" && asset.type !== "Archive";
}

function createPageObjectAssetFromWorkspaceAsset(asset: Asset) {
  return createAssetFrameBinding({
    assetId: asset.id,
    assetKind: asset.type === "Image" ? "image" : asset.type.toLowerCase(),
    assetName: asset.name,
    assetPath: asset.path,
    sourceDocumentKind:
      asset.extension.toLowerCase() === "nvv"
        ? "nvv"
        : asset.extension.toLowerCase() === "nvd"
          ? "nvd"
          : undefined,
  });
}
