import { ChevronDown, ChevronRight, ImagePlus, Square, X } from "lucide-react";
import { useState } from "react";
import type {
  NvdPageObject,
  NvdPageObjectAsset,
} from "../../../../features/inventoryProject";
import type {
  NvdDraftPageObject,
  NvdPageObjectToolMode,
} from "../../../../features/nvdEditor";
import type { Asset } from "../../../appTypes";
import {
  canAssignWorkspaceAssetToNvdPageObject,
  createNvdPageObjectAssetFromWorkspaceAsset,
} from "../../../workspace/nvdPageObjectAssets";

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
  onSaveDraft: () => void;
  onToolModeChange: (mode: NvdPageObjectToolMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isFrameToolActive = pageObjectToolMode === "frame";
  const hasSelectedPageObject = selectionKind === "page-object";
  const selectedPageObjectAsset = selectedPageObject?.asset ?? null;
  const canAssignWorkspaceAsset = Boolean(
    workspaceSelectedAsset && canAssignWorkspaceAssetToNvdPageObject(workspaceSelectedAsset),
  );

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
                    workspaceSelectedAsset && canAssignWorkspaceAssetToNvdPageObject(workspaceSelectedAsset)
                      ? onAssignAsset(createNvdPageObjectAssetFromWorkspaceAsset(workspaceSelectedAsset))
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
                  ? canAssignWorkspaceAssetToNvdPageObject(workspaceSelectedAsset)
                    ? `Selected in workspace: ${workspaceSelectedAsset.name}`
                    : `Selected in workspace: ${workspaceSelectedAsset.name} cannot be placed in a frame yet.`
                  : "Select an image, vector, 3D asset, or document in the workspace to assign it here."}
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
