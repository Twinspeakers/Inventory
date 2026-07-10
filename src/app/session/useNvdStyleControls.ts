import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef, useState } from "react";
import type { EditorSaveState } from "../../features/editors";
import type { PersistedOpenedNvdDocument, NvdHistoryState } from "../appTypes";
import type {
  NvdPageObject,
  NvdPageObjectAsset,
  NvdPageObjectWrapMode,
  NvdPageObjectZMode,
} from "../../features/inventoryProject";
import {
  DEFAULT_NVD_STYLE_DEFINITIONS,
  getNvdTextSelectionFromDocumentSelection,
  getNvdDocumentStyleDefinitions,
  type NvdDraftPageObject,
  type NvdDocumentSelection,
  type NvdEditorController,
  type NvdPageObjectToolMode,
  type NvdStyleDefinition,
  type NvdStyleRole,
  type NvdTextSelection,
} from "../../features/nvdEditor";

export function useNvdStyleControls({
  nvdStyleResetConfirmationEnabled,
  setActiveNvdDocument,
  setNvdHistoryState,
  setNvdSaveState,
  setStatusMessage,
  updateNvdStyleResetConfirmationEnabled,
}: {
  nvdStyleResetConfirmationEnabled: boolean;
  setActiveNvdDocument: Dispatch<SetStateAction<PersistedOpenedNvdDocument | null>>;
  setNvdHistoryState: Dispatch<SetStateAction<NvdHistoryState>>;
  setNvdSaveState: Dispatch<SetStateAction<EditorSaveState>>;
  setStatusMessage: (message: string) => void;
  updateNvdStyleResetConfirmationEnabled: (enabled: boolean) => void;
}) {
  const [activeNvdSelection, setActiveNvdSelection] = useState<NvdDocumentSelection | null>(null);
  const [activeNvdTextSelection, setActiveNvdTextSelection] = useState<NvdTextSelection | null>(null);
  const [activeNvdDraftPageObject, setActiveNvdDraftPageObject] =
    useState<NvdDraftPageObject | null>(null);
  const [activeNvdCanSaveDraftPageObject, setActiveNvdCanSaveDraftPageObject] =
    useState(false);
  const [activeNvdPageObjectToolMode, setActiveNvdPageObjectToolMode] =
    useState<NvdPageObjectToolMode>("text");
  const [activeNvdSelectedPageObject, setActiveNvdSelectedPageObject] =
    useState<NvdPageObject | null>(null);
  const [nvdStyleDefinitions, setNvdStyleDefinitions] = useState(() => ({ ...DEFAULT_NVD_STYLE_DEFINITIONS }));
  const [activeNvdStyleRole, setActiveNvdStyleRole] = useState<NvdStyleRole | null>(null);
  const [nvdStyleDraft, setNvdStyleDraft] = useState<NvdStyleDefinition | null>(null);
  const [activeNvdCharacterSpacingPt, setActiveNvdCharacterSpacingPt] = useState<number | null>(null);
  const [activeNvdLineHeight, setActiveNvdLineHeight] = useState<number | null>(null);
  const [activeNvdSelectionKind, setActiveNvdSelectionKind] =
    useState<"block" | "insertion" | "none" | "page-object" | "text">("none");
  const [activeNvdSpaceAfterPt, setActiveNvdSpaceAfterPt] = useState<number | null>(null);
  const [activeNvdSpaceBeforePt, setActiveNvdSpaceBeforePt] = useState<number | null>(null);
  const [pendingNvdStyleResetRole, setPendingNvdStyleResetRole] = useState<NvdStyleRole | null>(null);
  const [hideFutureNvdStyleResetConfirmations, setHideFutureNvdStyleResetConfirmations] = useState(true);
  const nvdEditorControllerRef = useRef<NvdEditorController | null>(null);

  const handleNvdSelectionChange = useCallback((selection: NvdDocumentSelection | null) => {
    setActiveNvdSelection((currentSelection) =>
      JSON.stringify(currentSelection) === JSON.stringify(selection) ? currentSelection : selection,
    );
    const textSelection = getNvdTextSelectionFromDocumentSelection(selection);
    const nextSelection =
      textSelection && textSelection.end > textSelection.start
        ? {
            start: textSelection.start,
            end: textSelection.end,
          }
        : null;

    setActiveNvdTextSelection((currentSelection) =>
      currentSelection?.start === nextSelection?.start && currentSelection?.end === nextSelection?.end
        ? currentSelection
        : nextSelection,
    );
  }, []);

  const handleNvdEditorControllerChange = useCallback((controller: NvdEditorController | null) => {
    nvdEditorControllerRef.current = controller;
    setActiveNvdCanSaveDraftPageObject(controller?.canSaveDraftPageObject ?? false);
    setActiveNvdCharacterSpacingPt(controller?.characterSpacingPt ?? null);
    setActiveNvdDraftPageObject(controller?.draftPageObject ?? null);
    setActiveNvdLineHeight(controller?.lineHeight ?? null);
    setActiveNvdPageObjectToolMode(controller?.pageObjectToolMode ?? "text");
    setActiveNvdSelectedPageObject(controller?.selectedPageObject ?? null);
    setActiveNvdSelectionKind(controller?.selectionKind ?? "none");
    setActiveNvdSpaceAfterPt(controller?.spaceAfterPt ?? null);
    setActiveNvdSpaceBeforePt(controller?.spaceBeforePt ?? null);
    setNvdHistoryState((historyState) => {
      const nextHistoryState = {
        canRedo: controller?.canRedo ?? false,
        canUndo: controller?.canUndo ?? false,
      };

      return historyState.canRedo === nextHistoryState.canRedo && historyState.canUndo === nextHistoryState.canUndo
        ? historyState
        : nextHistoryState;
    });
  }, [setNvdHistoryState]);

  function clearNvdSelection() {
    setActiveNvdSelection(null);
    setActiveNvdTextSelection(null);
  }

  function clearNvdStyleSelection() {
    setActiveNvdStyleRole(null);
    setNvdStyleDraft(null);
  }

  function loadNvdStyleDefinitions(styles: Parameters<typeof getNvdDocumentStyleDefinitions>[0]) {
    setNvdStyleDefinitions(getNvdDocumentStyleDefinitions(styles));
    clearNvdStyleSelection();
  }

  function selectNvdStyle(role: NvdStyleRole) {
    if (activeNvdStyleRole === role) {
      clearNvdStyleSelection();
      return;
    }

    setActiveNvdStyleRole(role);
    setNvdStyleDraft({ ...nvdStyleDefinitions[role] });
  }

  function applyNvdStyle(role: NvdStyleRole) {
    const controller = nvdEditorControllerRef.current;

    if (!controller) {
      setStatusMessage("Place the cursor in an NVD paragraph before applying a style.");
      return;
    }

    clearNvdStyleSelection();
    controller.applyStyle(nvdStyleDefinitions[role]);
    setStatusMessage(`Applied ${nvdStyleDefinitions[role].label}.`);
  }

  function navigateToNvdBlock(blockIndex: number) {
    nvdEditorControllerRef.current?.focusBlock(blockIndex);
  }

  function updateNvdStyleDraft(style: NvdStyleDefinition) {
    setNvdStyleDraft(style);
  }

  function changeNvdLineHeight(lineHeight: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, lineHeight };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setLineHeight(lineHeight);
  }

  function changeNvdCharacterSpacingPt(characterSpacingPt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, characterSpacingPt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setCharacterSpacingPt(characterSpacingPt);
  }

  function changeNvdSpaceAfterPt(spaceAfterPt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, spaceAfterPt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setSpaceAfterPt(spaceAfterPt);
  }

  function changeNvdSpaceBeforePt(spaceBeforePt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, spaceBeforePt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setSpaceBeforePt(spaceBeforePt);
  }

  function acceptNvdStyleDraft() {
    if (!activeNvdStyleRole || !nvdStyleDraft) {
      return;
    }

    acceptNvdStyleDefinition(nvdStyleDraft);
  }

  function acceptNvdStyleDefinition(style: NvdStyleDefinition) {
    if (!activeNvdStyleRole) {
      return;
    }

    const nextStyleDefinitions = {
      ...nvdStyleDefinitions,
      [activeNvdStyleRole]: { ...style },
    };

    nvdEditorControllerRef.current?.updateStyle(
      style,
      nvdStyleDefinitions[activeNvdStyleRole],
      restoreNvdStyleFromHistory,
    );
    setNvdStyleDefinitions(nextStyleDefinitions);
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...openedDocument.document,
              styles: nextStyleDefinitions,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
    setStatusMessage(`Updated ${style.label} throughout the document.`);
  }

  function resetNvdStyle(role: NvdStyleRole) {
    if (nvdStyleResetConfirmationEnabled) {
      setHideFutureNvdStyleResetConfirmations(true);
      setPendingNvdStyleResetRole(role);
      return;
    }

    performNvdStyleReset(role);
  }

  function performNvdStyleReset(role: NvdStyleRole) {
    const previousStyle = nvdStyleDefinitions[role];
    const defaultStyle = { ...DEFAULT_NVD_STYLE_DEFINITIONS[role] };
    const nextStyleDefinitions = {
      ...nvdStyleDefinitions,
      [role]: defaultStyle,
    };

    nvdEditorControllerRef.current?.updateStyle(defaultStyle, previousStyle, restoreNvdStyleFromHistory);
    setNvdStyleDefinitions(nextStyleDefinitions);
    setActiveNvdStyleRole((activeRole) => (activeRole === role ? null : activeRole));
    setNvdStyleDraft((styleDraft) => (styleDraft?.role === role ? null : styleDraft));
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...openedDocument.document,
              styles: nextStyleDefinitions,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
    setStatusMessage(`Reset ${defaultStyle.label} to its default style.`);
  }

  function confirmNvdStyleReset() {
    if (!pendingNvdStyleResetRole) {
      return;
    }

    const role = pendingNvdStyleResetRole;
    setPendingNvdStyleResetRole(null);

    if (hideFutureNvdStyleResetConfirmations) {
      updateNvdStyleResetConfirmationEnabled(false);
    }

    performNvdStyleReset(role);
  }

  function restoreNvdStyleFromHistory(style: NvdStyleDefinition) {
    setNvdStyleDefinitions((styleDefinitions) => ({
      ...styleDefinitions,
      [style.role]: { ...style },
    }));
    setNvdStyleDraft((styleDraft) => (styleDraft?.role === style.role ? { ...style } : styleDraft));
    setActiveNvdDocument((openedDocument) => {
      if (!openedDocument) {
        return openedDocument;
      }

      return {
        ...openedDocument,
        document: {
          ...openedDocument.document,
          styles: {
            ...getNvdDocumentStyleDefinitions(openedDocument.document.styles),
            [style.role]: { ...style },
          },
        },
      };
    });
    setNvdSaveState("dirty");
    setStatusMessage(`Restored ${style.label} through document history.`);
  }

  function undoNvd() {
    nvdEditorControllerRef.current?.undo();
  }

  function redoNvd() {
    nvdEditorControllerRef.current?.redo();
  }

  function setNvdPageObjectToolMode(mode: NvdPageObjectToolMode) {
    nvdEditorControllerRef.current?.setPageObjectToolMode(mode);
  }

  function saveDraftNvdPageObject() {
    nvdEditorControllerRef.current?.saveDraftPageObject();
  }

  function discardDraftNvdPageObject() {
    nvdEditorControllerRef.current?.discardDraftPageObject();
  }

  function deleteSelectedNvdPageObject() {
    nvdEditorControllerRef.current?.deleteSelectedPageObject();
  }

  function assignAssetToSelectedNvdPageObject(asset: NvdPageObjectAsset | null) {
    nvdEditorControllerRef.current?.assignAssetToSelectedPageObject(asset);
  }

  function setSelectedNvdPageObjectWrapMode(wrapMode: NvdPageObjectWrapMode) {
    nvdEditorControllerRef.current?.setSelectedPageObjectWrapMode(wrapMode);
  }

  function setSelectedNvdPageObjectZMode(zMode: NvdPageObjectZMode) {
    nvdEditorControllerRef.current?.setSelectedPageObjectZMode(zMode);
  }

  return {
    activeNvdCanSaveDraftPageObject,
    activeNvdCharacterSpacingPt,
    activeNvdDraftPageObject,
    activeNvdLineHeight,
    activeNvdPageObjectToolMode,
    activeNvdSelectedPageObject,
    activeNvdSelection,
    activeNvdSelectionKind,
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
    assignAssetToSelectedNvdPageObject,
    changeNvdCharacterSpacingPt,
    changeNvdLineHeight,
    changeNvdSpaceAfterPt,
    changeNvdSpaceBeforePt,
    clearNvdStyleSelection,
    clearNvdSelection,
    confirmNvdStyleReset,
    deleteSelectedNvdPageObject,
    discardDraftNvdPageObject,
    handleNvdEditorControllerChange,
    handleNvdSelectionChange,
    loadNvdStyleDefinitions,
    navigateToNvdBlock,
    redoNvd,
    resetNvdStyle,
    saveDraftNvdPageObject,
    selectNvdStyle,
    setSelectedNvdPageObjectWrapMode,
    setSelectedNvdPageObjectZMode,
    setNvdPageObjectToolMode,
    setHideFutureNvdStyleResetConfirmations,
    setPendingNvdStyleResetRole,
    undoNvd,
    updateNvdStyleDraft,
  };
}

