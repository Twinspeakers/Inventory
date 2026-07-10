import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import type {
  NvdBlock,
  NvdPageObject,
  NvdPageObjectAsset,
  NvdPageObjectWrapMode,
  NvdPageObjectZMode,
  NvdTextRun,
} from "../../inventoryProject";
import { getNvdCharacterSpacingPt } from "../primitives/nvdCharacterSpacing";
import {
  applyNvdTextEdit,
  deleteNvdBackward,
  deleteNvdForward,
} from "../document/nvdTextOperations";
import { getNvdFontFamily } from "../fonts";
import { getNvdFontSizePt } from "../primitives/nvdFontSize";
import { getNvdLineHeight } from "../primitives/nvdLineHeight";
import { getNvdParagraphSpacingPt } from "../primitives/nvdParagraphSpacing";
import type {
  NvdDocumentLayoutSnapshot,
  NvdLineFragment,
} from "../layout/nvdPageLayoutEngine";
import {
  findNvdLineFragmentForOffset,
  findNvdPageFragmentForOffset,
  getNvdCaretGeometry,
  getNvdOffsetAtPagePoint,
} from "../layout/nvdPageLayoutEngine";
import type {
  NvdEditorController,
  NvdPageObjectToolMode,
} from "../contracts/NvdEditorController";
import {
  createNvdBlockDocumentSelection,
  createNvdInsertionDocumentSelection,
  createNvdPageObjectDocumentSelection,
  createNvdTextDocumentSelection,
  isNvdBlockDocumentSelection,
  isNvdInsertionDocumentSelection,
  isNvdPageObjectDocumentSelection,
  isNvdTextDocumentSelection,
  type NvdDocumentSelection,
} from "../document/nvdDocumentSelection";
import {
  createNvdAssetFrameObjectFromDraft,
  insertNvdPageObject,
  normalizeNvdPageObjects,
  removeNvdPageObjectById,
  updateNvdPageObjectById,
  type NvdDraftPageObject,
} from "../document/nvdPageObjectModel";
import {
  insertNvdParagraphAtSelection,
  insertNvdParagraphTextAtSelection,
  moveSelectedNvdBlock,
  normalizeNvdDocumentSelection,
  removeSelectedNvdBlock,
  updateSelectedNvdEmbed,
} from "../document/nvdDocumentOperations";
import {
  createNvdDocumentBlocks,
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  normalizeNvdTextRuns,
  replaceNvdTextRunRange,
  sliceNvdTextRuns,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "../document/nvdRichText";
import type { NvdStyleDefinition, NvdStyleRole } from "../document/nvdStyles";

type NvdHistorySnapshot = {
  blocks: NvdBlock[];
  pageObjects: NvdPageObject[];
  selection: NvdDocumentSelection | null;
};

type NvdHistoryEntry = {
  after: NvdHistorySnapshot;
  before: NvdHistorySnapshot;
  onRedo?: () => void;
  onUndo?: () => void;
};

type NvdResolvedTypingStyle = {
  bold: boolean;
  characterSpacingPt: number;
  fontFamily: string;
  fontSizePt: number;
  italic: boolean;
};

type NvdCompositionState = {
  baseBlockLayouts: NvdBlockLayout[];
  baseRuns: NvdTextRun[];
  baseSelection: NvdTextSelection;
  text: string;
} | null;

export function useNvdPagedDocumentController({
  blocks,
  blockLayouts,
  defaultFontFamily,
  defaultFontSizePt,
  documentKey,
  layoutSnapshot,
  onBlocksChange,
  onControllerChange,
  onDocumentSelectionRequest,
  onPageObjectsChange,
  pageObjects,
  runs,
  selection,
  styleDefinitions,
}: {
  blocks: NvdBlock[];
  blockLayouts: NvdBlockLayout[];
  defaultFontFamily: string;
  defaultFontSizePt: number;
  documentKey: string;
  layoutSnapshot: NvdDocumentLayoutSnapshot | null;
  onBlocksChange: (blocks: NvdBlock[]) => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onDocumentSelectionRequest: (selection: NvdDocumentSelection) => void;
  onPageObjectsChange: (pageObjects: NvdPageObject[]) => void;
  pageObjects: NvdPageObject[];
  runs: NvdTextRun[];
  selection: NvdDocumentSelection | null;
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
}) {
  const textSelection = selection && isNvdTextDocumentSelection(selection) ? selection.text : null;
  const hasTextSelection = textSelection !== null;
  const hasBlockSelection = selection ? isNvdBlockDocumentSelection(selection) : false;
  const hasInsertionSelection = selection ? isNvdInsertionDocumentSelection(selection) : false;
  const hasPageObjectSelection = selection ? isNvdPageObjectDocumentSelection(selection) : false;
  const effectiveSelection = textSelection ?? { start: 0, end: 0 };
  const normalizedRuns = useMemo(() => normalizeNvdTextRuns(runs), [runs]);
  const normalizedPageObjects = useMemo(
    () => normalizeNvdPageObjects(pageObjects),
    [pageObjects],
  );
  const text = useMemo(() => getNvdTextRunsText(normalizedRuns), [normalizedRuns]);
  const historyRef = useRef<{ documentKey: string; redoStack: NvdHistoryEntry[]; undoStack: NvdHistoryEntry[] }>({
    documentKey,
    redoStack: [],
    undoStack: [],
  });
  const typingStyleRef = useRef<NvdResolvedTypingStyle | null>(null);
  const [compositionState, setCompositionState] = useState<NvdCompositionState>(null);
  const [draftPageObject, setDraftPageObject] = useState<NvdDraftPageObject | null>(null);
  const [pageObjectToolMode, setPageObjectToolModeState] =
    useState<NvdPageObjectToolMode>("text");
  const [pageObjectPreviewState, setPageObjectPreviewState] = useState<{
    objectId: string;
    pageObjects: NvdPageObject[];
  } | null>(null);
  const [, setControllerVersion] = useState(0);

  useEffect(() => {
    if (historyRef.current.documentKey === documentKey) {
      return;
    }

    historyRef.current = {
      documentKey,
      redoStack: [],
      undoStack: [],
    };
    typingStyleRef.current = null;
    setCompositionState(null);
    setDraftPageObject(null);
    setPageObjectToolModeState("text");
    setPageObjectPreviewState(null);
    setControllerVersion((version) => version + 1);
  }, [documentKey]);

  const activeTypingStyle = useMemo(
    () =>
      mergeTypingStyle(
        resolveTypingStyleAtSelection(normalizedRuns, effectiveSelection, defaultFontFamily, defaultFontSizePt),
        typingStyleRef.current,
      ),
    [defaultFontFamily, defaultFontSizePt, effectiveSelection, normalizedRuns],
  );
  const touchedParagraphIndexes = useMemo(
    () => (hasTextSelection ? getTouchedParagraphIndexes(text, blockLayouts, effectiveSelection) : []),
    [blockLayouts, effectiveSelection, hasTextSelection, text],
  );
  const compositionPreview = useMemo(() => {
    if (!compositionState) {
      return null;
    }

    const result = applyNvdTextEdit(
      compositionState.baseRuns,
      compositionState.baseBlockLayouts,
      compositionState.baseSelection,
      compositionState.text
        ? [createStyledInsertRun(compositionState.text, activeTypingStyle)]
        : [],
    );

    return {
      blockLayouts: result.blockLayouts,
      runs: result.runs,
      selection: result.selection,
    };
  }, [activeTypingStyle, compositionState]);

  function refreshController() {
    setControllerVersion((version) => version + 1);
  }

  function applySnapshot(snapshot: NvdHistorySnapshot) {
    onBlocksChange(snapshot.blocks);
    onPageObjectsChange(snapshot.pageObjects);
    if (snapshot.selection) {
      onDocumentSelectionRequest(snapshot.selection);
    }
  }

  function commitContentChange(
    nextRuns: NvdTextRun[],
    nextBlockLayouts: NvdBlockLayout[],
    nextSelection: NvdTextSelection,
    options?: {
      onRedo?: () => void;
      onUndo?: () => void;
      trackHistory?: boolean;
    },
  ) {
    const before = createSnapshot(blocks, normalizedPageObjects, selection);
    const after = createSnapshot(
      createNvdDocumentBlocks(nextRuns, blocks, nextBlockLayouts),
      normalizedPageObjects,
      createNvdTextDocumentSelection(nextSelection.start, nextSelection.end),
    );
    const changed = !snapshotsEqual(before, after);

    if (!changed) {
      onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
      return;
    }

    if (options?.trackHistory ?? true) {
      historyRef.current.undoStack.push({
        after,
        before,
        onRedo: options?.onRedo,
        onUndo: options?.onUndo,
      });
      historyRef.current.redoStack = [];
    }

    applySnapshot(after);
    refreshController();
  }

  function commitBlockDocumentChange(
    nextBlocks: NvdBlock[],
    nextSelection: NvdDocumentSelection,
    options?: {
      onRedo?: () => void;
      onUndo?: () => void;
      trackHistory?: boolean;
    },
  ) {
    const before = createSnapshot(blocks, normalizedPageObjects, selection);
    const after = createSnapshot(nextBlocks, normalizedPageObjects, nextSelection);
    const changed = !snapshotsEqual(before, after);

    if (!changed) {
      onDocumentSelectionRequest(nextSelection);
      return;
    }

    if (options?.trackHistory ?? true) {
      historyRef.current.undoStack.push({
        after,
        before,
        onRedo: options?.onRedo,
        onUndo: options?.onUndo,
      });
      historyRef.current.redoStack = [];
    }

    applySnapshot(after);
    refreshController();
  }

  function commitDocumentOperation(
    result: { blocks: NvdBlock[]; selection: NvdDocumentSelection | null },
    options?: {
      onRedo?: () => void;
      onUndo?: () => void;
      trackHistory?: boolean;
    },
  ) {
    commitBlockDocumentChange(
      result.blocks,
      normalizeNvdDocumentSelection(result.blocks, result.selection) ??
        createNvdInsertionDocumentSelection(result.blocks.length),
      options,
    );
  }

  function commitPageObjectDocumentChange(
    nextPageObjects: NvdPageObject[],
    nextSelection: NvdDocumentSelection,
    options?: {
      onRedo?: () => void;
      onUndo?: () => void;
      trackHistory?: boolean;
    },
  ) {
    const before = createSnapshot(blocks, normalizedPageObjects, selection);
    const after = createSnapshot(blocks, nextPageObjects, nextSelection);
    const changed = !snapshotsEqual(before, after);

    if (!changed) {
      onDocumentSelectionRequest(nextSelection);
      return;
    }

    if (options?.trackHistory ?? true) {
      historyRef.current.undoStack.push({
        after,
        before,
        onRedo: options?.onRedo,
        onUndo: options?.onUndo,
      });
      historyRef.current.redoStack = [];
    }

    applySnapshot(after);
    refreshController();
  }

  function updateTypingStyle(
    update: (style: NvdResolvedTypingStyle) => NvdResolvedTypingStyle,
  ) {
    typingStyleRef.current = update(activeTypingStyle);
    refreshController();
  }

  function commitInlineStyleChange(
    update: (style: NvdResolvedTypingStyle) => NvdResolvedTypingStyle,
  ) {
    if (hasPageObjectSelection) {
      return;
    }

    if (effectiveSelection.start === effectiveSelection.end) {
      updateTypingStyle(update);
      return;
    }

    const selectedRuns = sliceNvdTextRuns(normalizedRuns, effectiveSelection.start, effectiveSelection.end).map(
      (run) => applyResolvedTypingStyleToRun(run, update(resolveTypingStyleForRun(run, defaultFontFamily, defaultFontSizePt))),
    );

    commitContentChange(
      replaceNvdTextRunRange(
        normalizedRuns,
        effectiveSelection.start,
        effectiveSelection.end,
        selectedRuns,
      ),
      blockLayouts,
      effectiveSelection,
    );
  }

  function commitBlockLayoutChange(
    update: (layout: NvdBlockLayout) => NvdBlockLayout,
  ) {
    if (hasPageObjectSelection) {
      return;
    }

    const nextBlockLayouts = blockLayouts.map((layout, index) =>
      touchedParagraphIndexes.includes(index) ? update(layout) : layout,
    );
    commitContentChange(normalizedRuns, nextBlockLayouts, effectiveSelection);
  }

  function applyStyleToTouchedParagraphs(style: NvdStyleDefinition) {
    if (hasPageObjectSelection) {
      return;
    }

    const inlineStyle = getTypingStyleFromDefinition(style);
    const nextRuns =
      effectiveSelection.start === effectiveSelection.end
        ? updateRunsForCollapsedParagraphStyleApplication(
            normalizedRuns,
            blockLayouts,
            touchedParagraphIndexes,
            text,
            style,
            styleDefinitions,
            defaultFontFamily,
            defaultFontSizePt,
          )
        : replaceNvdTextRunRange(
            normalizedRuns,
            effectiveSelection.start,
            effectiveSelection.end,
            sliceNvdTextRuns(normalizedRuns, effectiveSelection.start, effectiveSelection.end).map((run) =>
              applyResolvedTypingStyleToRun(run, inlineStyle),
            ),
          );
    const nextBlockLayouts = blockLayouts.map((layout, index) =>
      touchedParagraphIndexes.includes(index)
        ? applyStyleDefinitionToBlockLayout(layout, style)
        : layout,
    );

    typingStyleRef.current = inlineStyle;
    commitContentChange(nextRuns, nextBlockLayouts, effectiveSelection);
  }

  function updateDocumentStyleDefinition(
    style: NvdStyleDefinition,
    previousStyle: NvdStyleDefinition,
    onHistoryChange: (style: NvdStyleDefinition) => void,
  ) {
    const nextRuns = updateRunsMatchingStyle(
      normalizedRuns,
      blockLayouts,
      style,
      previousStyle,
      defaultFontFamily,
      defaultFontSizePt,
    );
    const nextBlockLayouts = blockLayouts.map((layout) =>
      layout.kind === previousStyle.role ? applyStyleDefinitionToBlockLayout(layout, style) : layout,
    );

    if (typingStyleRef.current && effectiveSelection.start === effectiveSelection.end) {
      const paragraphIndex = touchedParagraphIndexes[0];

      if (paragraphIndex !== undefined && blockLayouts[paragraphIndex]?.kind === previousStyle.role) {
        typingStyleRef.current = getTypingStyleFromDefinition(style);
      }
    }

    commitContentChange(nextRuns, nextBlockLayouts, effectiveSelection, {
      onRedo: () => onHistoryChange({ ...style }),
      onUndo: () => onHistoryChange({ ...previousStyle }),
    });
  }

  function applyDocumentEdit(result: ReturnType<typeof applyNvdTextEdit>) {
    commitContentChange(result.runs, result.blockLayouts, result.selection);
    typingStyleRef.current = null;
  }

  function insertParagraphSelection() {
    if (hasPageObjectSelection) {
      return;
    }

    commitDocumentOperation(insertNvdParagraphAtSelection(blocks, selection, styleDefinitions.p));
    typingStyleRef.current = getTypingStyleFromDefinition(styleDefinitions.p);
  }

  function insertParagraphBreak() {
    if (hasPageObjectSelection) {
      return;
    }

    if (hasBlockSelection || hasInsertionSelection) {
      insertParagraphSelection();
      return;
    }

    const paragraphRanges = getParagraphRanges(text, blockLayouts.length);
    const currentParagraphIndex = touchedParagraphIndexes[0] ?? 0;
    const currentParagraphRange = paragraphRanges[currentParagraphIndex];
    const currentBlockLayout = blockLayouts[currentParagraphIndex];
    const isCollapsed = effectiveSelection.start === effectiveSelection.end;
    const currentParagraphContentEnd = currentParagraphRange
      ? getParagraphContentEnd(text, currentParagraphRange)
      : effectiveSelection.end;
    const shouldStartParagraphAfterHeading =
      isCollapsed &&
      currentBlockLayout &&
      currentBlockLayout.kind !== "p" &&
      effectiveSelection.start === currentParagraphContentEnd;
    const result = applyNvdTextEdit(normalizedRuns, blockLayouts, effectiveSelection, [{ text: "\n" }]);

    if (shouldStartParagraphAfterHeading) {
      const nextParagraphIndex = currentParagraphIndex + 1;

      if (result.blockLayouts[nextParagraphIndex]) {
        result.blockLayouts[nextParagraphIndex] = createBlockLayoutFromStyleDefinition(styleDefinitions.p);
      }

      commitContentChange(result.runs, result.blockLayouts, result.selection);
      typingStyleRef.current = getTypingStyleFromDefinition(styleDefinitions.p);
      refreshController();
      return;
    }

    applyDocumentEdit(result);
  }

  function insertPlainText(insertedText: string) {
    if (!insertedText || hasPageObjectSelection) {
      return;
    }

    if (hasBlockSelection || hasInsertionSelection) {
      commitDocumentOperation(
        insertNvdParagraphTextAtSelection(
          blocks,
          selection,
          styleDefinitions.p,
          insertedText,
          [createStyledInsertRun(insertedText, activeTypingStyle)],
        ),
      );
      typingStyleRef.current = null;
      return;
    }

    applyDocumentEdit(
      applyNvdTextEdit(normalizedRuns, blockLayouts, effectiveSelection, [
        createStyledInsertRun(insertedText, activeTypingStyle),
      ]),
    );
  }

  function clearInputBridgeValue(element: HTMLTextAreaElement) {
    if (element.value.length > 0) {
      element.value = "";
    }
  }

  const onBeforeInput = useMemo<FormEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (hasPageObjectSelection) {
        event.preventDefault();
        clearInputBridgeValue(event.currentTarget);
        return;
      }

      const nativeEvent = event.nativeEvent as InputEvent;
      const inputType = nativeEvent.inputType;

      if (
        nativeEvent.isComposing ||
        inputType === "insertCompositionText" ||
        inputType === "insertFromComposition" ||
        inputType === "deleteCompositionText"
      ) {
        event.preventDefault();
        clearInputBridgeValue(event.currentTarget);
        return;
      }

      if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
        event.preventDefault();
        insertParagraphBreak();
        clearInputBridgeValue(event.currentTarget);
      }
    },
    [hasPageObjectSelection, insertParagraphBreak],
  );

  const onInput = useMemo<FormEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (hasPageObjectSelection) {
        event.preventDefault();
        clearInputBridgeValue(event.currentTarget);
        return;
      }

      const nativeEvent = event.nativeEvent as InputEvent;
      const inputType = nativeEvent.inputType;
      const insertedText = event.currentTarget.value;

      if (
        nativeEvent.isComposing ||
        inputType === "insertCompositionText" ||
        inputType === "insertFromComposition" ||
        inputType === "deleteCompositionText"
      ) {
        return;
      }

      if (!insertedText) {
        clearInputBridgeValue(event.currentTarget);
        return;
      }

      insertPlainText(insertedText);
      clearInputBridgeValue(event.currentTarget);
    },
    [hasPageObjectSelection, insertPlainText],
  );

  const onKeyDown = useMemo<KeyboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (compositionState) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onDocumentSelectionRequest(createNvdTextDocumentSelection(0, text.length));
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        commitInlineStyleChange((style) => ({ ...style, bold: !style.bold }));
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        commitInlineStyleChange((style) => ({ ...style, italic: !style.italic }));
        return;
      }

      if (hasPageObjectSelection) {
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          const selectedObjectId =
            selection && isNvdPageObjectDocumentSelection(selection) ? selection.objectId : null;

          if (!selectedObjectId) {
            return;
          }

          commitPageObjectDocumentChange(
            removeNvdPageObjectById(normalizedPageObjects, selectedObjectId),
            createNvdInsertionDocumentSelection(blocks.length),
          );
          return;
        }

        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
          event.preventDefault();
          return;
        }
      }

      if (event.key === "Backspace") {
        event.preventDefault();

        if (hasBlockSelection) {
          commitDocumentOperation(removeSelectedNvdBlock(blocks, selection));
          typingStyleRef.current = null;
          return;
        }

        if (hasInsertionSelection) {
          return;
        }

        applyDocumentEdit(deleteNvdBackward(normalizedRuns, blockLayouts, effectiveSelection));
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();

        if (hasBlockSelection) {
          commitDocumentOperation(removeSelectedNvdBlock(blocks, selection));
          typingStyleRef.current = null;
          return;
        }

        if (hasInsertionSelection) {
          return;
        }

        applyDocumentEdit(deleteNvdForward(normalizedRuns, blockLayouts, effectiveSelection));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        insertParagraphBreak();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
        event.preventDefault();
        insertPlainText(event.key);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (selection && isNvdBlockDocumentSelection(selection)) {
          const blockIndex = blocks.findIndex((block) => block.id === selection.blockId);
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(Math.max(0, blockIndex)));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        if (selection && isNvdInsertionDocumentSelection(selection)) {
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(Math.max(0, selection.blockIndex - 1)));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        onDocumentSelectionRequest(
          createNvdTextDocumentSelection(
            moveSelectionHorizontally(effectiveSelection, -1).start,
            moveSelectionHorizontally(effectiveSelection, -1).end,
          ),
        );
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (selection && isNvdBlockDocumentSelection(selection)) {
          const blockIndex = blocks.findIndex((block) => block.id === selection.blockId);
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(Math.max(0, blockIndex + 1)));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        if (selection && isNvdInsertionDocumentSelection(selection)) {
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(selection.blockIndex + 1));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        onDocumentSelectionRequest(
          createNvdTextDocumentSelection(
            moveSelectionHorizontally(effectiveSelection, 1, text.length).start,
            moveSelectionHorizontally(effectiveSelection, 1, text.length).end,
          ),
        );
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowUp") {
        if (selection && isNvdInsertionDocumentSelection(selection)) {
          event.preventDefault();
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(Math.max(0, selection.blockIndex - 1)));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        const nextSelection = moveSelectionVertically(layoutSnapshot, effectiveSelection, -1);
        onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowDown") {
        if (selection && isNvdInsertionDocumentSelection(selection)) {
          event.preventDefault();
          onDocumentSelectionRequest(createNvdInsertionDocumentSelection(selection.blockIndex + 1));
          typingStyleRef.current = null;
          refreshController();
          return;
        }

        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        const nextSelection = moveSelectionVertically(layoutSnapshot, effectiveSelection, 1);
        onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "Home") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        const nextSelection = moveSelectionToLineBoundary(layoutSnapshot, effectiveSelection, "start");
        onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "End") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        const nextSelection = moveSelectionToLineBoundary(layoutSnapshot, effectiveSelection, "end");
        onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
        typingStyleRef.current = null;
        refreshController();
      }
    },
    [
      blocks,
      commitDocumentOperation,
      commitInlineStyleChange,
      commitPageObjectDocumentChange,
      compositionState,
      effectiveSelection,
      hasBlockSelection,
      hasInsertionSelection,
      hasPageObjectSelection,
      insertParagraphBreak,
      insertPlainText,
      layoutSnapshot,
      normalizedPageObjects,
      normalizedRuns,
      onDocumentSelectionRequest,
      selection,
      text.length,
    ],
  );

  const onPaste = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (hasPageObjectSelection) {
        event.preventDefault();
        return;
      }

      const pastedText = event.clipboardData.getData("text/plain");

      if (!pastedText) {
        return;
      }

      event.preventDefault();
      insertPlainText(pastedText);
    },
    [hasPageObjectSelection, insertPlainText],
  );

  const onCopy = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (!hasTextSelection) {
        return;
      }

      if (effectiveSelection.end <= effectiveSelection.start) {
        return;
      }

      event.preventDefault();
      event.clipboardData.setData("text/plain", text.slice(effectiveSelection.start, effectiveSelection.end));
    },
    [effectiveSelection.end, effectiveSelection.start, hasTextSelection, text],
  );

  const onCut = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (!hasTextSelection) {
        return;
      }

      if (effectiveSelection.end <= effectiveSelection.start) {
        return;
      }

      event.preventDefault();
      event.clipboardData.setData("text/plain", text.slice(effectiveSelection.start, effectiveSelection.end));
      applyDocumentEdit(applyNvdTextEdit(normalizedRuns, blockLayouts, effectiveSelection, []));
    },
    [blockLayouts, effectiveSelection, hasTextSelection, normalizedRuns, text],
  );

  const selectedText = useMemo(() => {
    if (!hasTextSelection) {
      return "";
    }

    if (effectiveSelection.end <= effectiveSelection.start) {
      return "";
    }

    return text.slice(effectiveSelection.start, effectiveSelection.end);
  }, [effectiveSelection.end, effectiveSelection.start, hasTextSelection, text]);

  const onCompositionStart = useMemo<CompositionEventHandler<HTMLTextAreaElement>>(
    () => () => {
      if (
        !hasTextSelection ||
        hasBlockSelection ||
        hasInsertionSelection ||
        hasPageObjectSelection
      ) {
        return;
      }

      setCompositionState({
        baseBlockLayouts: blockLayouts.map((layout) => ({ ...layout })),
        baseRuns: normalizeNvdTextRuns(normalizedRuns),
        baseSelection: { ...effectiveSelection },
        text: "",
      });
    },
    [
      blockLayouts,
      effectiveSelection,
      hasBlockSelection,
      hasInsertionSelection,
      hasPageObjectSelection,
      hasTextSelection,
      normalizedRuns,
    ],
  );

  const onCompositionUpdate = useMemo<CompositionEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      const nextText = event.data ?? event.currentTarget.value ?? "";
      setCompositionState((currentState) =>
        currentState
          ? {
              ...currentState,
              text: nextText,
            }
          : currentState,
      );
    },
    [],
  );

  const onCompositionEnd = useMemo<CompositionEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      const finalText = event.data ?? event.currentTarget.value ?? "";

      setCompositionState((currentState) => {
        if (!currentState) {
          return null;
        }

        const result = applyNvdTextEdit(
          currentState.baseRuns,
          currentState.baseBlockLayouts,
          currentState.baseSelection,
          finalText ? [createStyledInsertRun(finalText, activeTypingStyle)] : [],
        );

        commitContentChange(result.runs, result.blockLayouts, result.selection);
        typingStyleRef.current = null;
        return null;
      });
    },
    [activeTypingStyle, commitContentChange],
  );

  function handleDraftPageObjectChange(nextDraftPageObject: NvdDraftPageObject | null) {
    if (
      nextDraftPageObject &&
      selection &&
      isNvdPageObjectDocumentSelection(selection)
    ) {
      onDocumentSelectionRequest(createNvdInsertionDocumentSelection(blocks.length));
    }

    setDraftPageObject(nextDraftPageObject);
    refreshController();
  }

  function handlePageObjectSelectionRequest(objectId: string) {
    typingStyleRef.current = null;
    onDocumentSelectionRequest(createNvdPageObjectDocumentSelection(objectId));
    refreshController();
  }

  const displayPageObjects = pageObjectPreviewState?.pageObjects ?? normalizedPageObjects;
  const selectedPageObject =
    selection && isNvdPageObjectDocumentSelection(selection)
      ? displayPageObjects.find((pageObject) => pageObject.id === selection.objectId) ?? null
      : null;

  function handlePageObjectPreviewChange(
    objectId: string,
    nextPageObject: NvdPageObject,
  ) {
    const basePageObjects = pageObjectPreviewState?.pageObjects ?? displayPageObjects;
    setPageObjectPreviewState({
      objectId,
      pageObjects: updateNvdPageObjectById(basePageObjects, objectId, () => nextPageObject),
    });
  }

  function handlePageObjectTransformCommit(
    objectId: string,
    nextPageObject: NvdPageObject,
  ) {
    const nextPageObjects = updateNvdPageObjectById(
      pageObjectPreviewState?.pageObjects ?? displayPageObjects,
      objectId,
      () => nextPageObject,
    );
    setPageObjectPreviewState(null);
    commitPageObjectDocumentChange(
      nextPageObjects,
      createNvdPageObjectDocumentSelection(objectId),
    );
    typingStyleRef.current = null;
  }

  function clearPageObjectPreview() {
    setPageObjectPreviewState(null);
  }

  const controller = useMemo<NvdEditorController>(() => ({
    canRedo: historyRef.current.redoStack.length > 0,
    canSaveDraftPageObject:
      Boolean(draftPageObject) &&
      (draftPageObject?.widthPx ?? 0) >= 12 &&
      (draftPageObject?.heightPx ?? 0) >= 12,
    canUndo: historyRef.current.undoStack.length > 0,
    characterSpacingPt: getUniformInlineValue(
      normalizedRuns,
      effectiveSelection,
      defaultFontFamily,
      defaultFontSizePt,
      "characterSpacingPt",
    ) as number | null,
    draftPageObject,
    fontFamily: activeTypingStyle.fontFamily,
    fontSizePt: activeTypingStyle.fontSizePt,
    isBold: activeTypingStyle.bold,
    isItalic: activeTypingStyle.italic,
    lineHeight: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "lineHeight"),
    pageObjectToolMode,
    selectedPageObject,
    selection,
    selectionKind: hasTextSelection
      ? "text"
      : hasBlockSelection
        ? "block"
        : hasInsertionSelection
          ? "insertion"
          : hasPageObjectSelection
            ? "page-object"
            : "none",
    spaceAfterPt: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "spaceAfterPt"),
    spaceBeforePt: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "spaceBeforePt"),
    textAlign: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "textAlign"),
    applyStyle: applyStyleToTouchedParagraphs,
    assignAssetToSelectedPageObject: (asset: NvdPageObjectAsset | null) => {
      if (!selectedPageObject) {
        return;
      }

      commitPageObjectDocumentChange(
        updateNvdPageObjectById(displayPageObjects, selectedPageObject.id, (pageObject) => ({
          ...pageObject,
          asset: asset ? { ...asset } : null,
        })),
        createNvdPageObjectDocumentSelection(selectedPageObject.id),
      );
      typingStyleRef.current = null;
    },
    deleteSelectedPageObject: () => {
      if (!selection || !isNvdPageObjectDocumentSelection(selection)) {
        return;
      }

      commitPageObjectDocumentChange(
        removeNvdPageObjectById(displayPageObjects, selection.objectId),
        createNvdInsertionDocumentSelection(blocks.length),
      );
      typingStyleRef.current = null;
    },
    discardDraftPageObject: () => {
      setDraftPageObject(null);
      refreshController();
    },
    focusBlock: (blockIndex) => {
      const targetBlock = blocks[blockIndex];

      if (!targetBlock) {
        return;
      }

      if (targetBlock.kind === "embed") {
        typingStyleRef.current = null;
        onDocumentSelectionRequest(createNvdBlockDocumentSelection(targetBlock.id));
        refreshController();
        return;
      }

      const nextSelection = getBlockSelection(text, blockLayouts, blockIndex);

      if (!nextSelection) {
        return;
      }

      typingStyleRef.current = null;
      onDocumentSelectionRequest(createNvdTextDocumentSelection(nextSelection.start, nextSelection.end));
      refreshController();
    },
    moveBlock: (fromIndex, toIndex) => {
      const targetBlock = blocks[fromIndex];

      if (!targetBlock) {
        return;
      }

      commitDocumentOperation(
        moveSelectedNvdBlock(blocks, createNvdBlockDocumentSelection(targetBlock.id), toIndex),
      );
      typingStyleRef.current = null;
    },
    redo: () => {
      const entry = historyRef.current.redoStack.pop();

      if (!entry) {
        return;
      }

      historyRef.current.undoStack.push(entry);
      entry.onRedo?.();
      applySnapshot(entry.after);
      typingStyleRef.current = null;
      refreshController();
    },
    removeSelectedBlock: () => {
      if (!hasBlockSelection) {
        return;
      }

      commitDocumentOperation(removeSelectedNvdBlock(blocks, selection));
      typingStyleRef.current = null;
    },
    saveDraftPageObject: () => {
      if (!draftPageObject || draftPageObject.widthPx < 12 || draftPageObject.heightPx < 12) {
        return;
      }

      const pageObject = createNvdAssetFrameObjectFromDraft(draftPageObject);
      commitPageObjectDocumentChange(
        insertNvdPageObject(displayPageObjects, pageObject),
        createNvdPageObjectDocumentSelection(pageObject.id),
      );
      setDraftPageObject(null);
      typingStyleRef.current = null;
    },
    setInsertionPoint: (blockIndex) => {
      typingStyleRef.current = null;
      onDocumentSelectionRequest(createNvdInsertionDocumentSelection(blockIndex));
      refreshController();
    },
    setPageObjectToolMode: (mode) => {
      setPageObjectToolModeState(mode);
      if (mode === "text") {
        setDraftPageObject(null);
      }
      refreshController();
    },
    setSelection: (nextSelection) => {
      typingStyleRef.current = null;
      onDocumentSelectionRequest(nextSelection);
      refreshController();
    },
    setSelectedPageObjectWrapMode: (wrapMode: NvdPageObjectWrapMode) => {
      if (!selectedPageObject) {
        return;
      }

      commitPageObjectDocumentChange(
        updateNvdPageObjectById(displayPageObjects, selectedPageObject.id, (pageObject) => ({
          ...pageObject,
          wrapMode,
        })),
        createNvdPageObjectDocumentSelection(selectedPageObject.id),
      );
      typingStyleRef.current = null;
    },
    setSelectedPageObjectZMode: (zMode: NvdPageObjectZMode) => {
      if (!selectedPageObject) {
        return;
      }

      commitPageObjectDocumentChange(
        updateNvdPageObjectById(displayPageObjects, selectedPageObject.id, (pageObject) => ({
          ...pageObject,
          zMode,
        })),
        createNvdPageObjectDocumentSelection(selectedPageObject.id),
      );
      typingStyleRef.current = null;
    },
    setCharacterSpacingPt: (characterSpacingPt) => {
      commitInlineStyleChange((style) => ({
        ...style,
        characterSpacingPt: getNvdCharacterSpacingPt(characterSpacingPt),
      }));
    },
    setFontFamily: (fontFamily) => {
      commitInlineStyleChange((style) => ({
        ...style,
        fontFamily: getNvdFontFamily(fontFamily),
      }));
    },
    setFontSizePt: (fontSizePt) => {
      commitInlineStyleChange((style) => ({
        ...style,
        fontSizePt: getNvdFontSizePt(fontSizePt),
      }));
    },
    setLineHeight: (lineHeight) => {
      commitBlockLayoutChange((layout) => ({
        ...layout,
        lineHeight: getNvdLineHeight(lineHeight),
      }));
    },
    setSpaceAfterPt: (spaceAfterPt) => {
      commitBlockLayoutChange((layout) => ({
        ...layout,
        spaceAfterPt: getNvdParagraphSpacingPt(spaceAfterPt),
      }));
    },
    setSpaceBeforePt: (spaceBeforePt) => {
      commitBlockLayoutChange((layout) => ({
        ...layout,
        spaceBeforePt: getNvdParagraphSpacingPt(spaceBeforePt),
      }));
    },
    setTextAlign: (textAlign) => {
      commitBlockLayoutChange((layout) => ({
        ...layout,
        textAlign,
      }));
    },
    toggleBold: () => {
      commitInlineStyleChange((style) => ({ ...style, bold: !style.bold }));
    },
    toggleItalic: () => {
      commitInlineStyleChange((style) => ({ ...style, italic: !style.italic }));
    },
    undo: () => {
      const entry = historyRef.current.undoStack.pop();

      if (!entry) {
        return;
      }

      historyRef.current.redoStack.push(entry);
      entry.onUndo?.();
      applySnapshot(entry.before);
      typingStyleRef.current = null;
      refreshController();
    },
    updateSelectedEmbed: (updates) => {
      commitDocumentOperation(updateSelectedNvdEmbed(blocks, selection, updates));
      typingStyleRef.current = null;
    },
    updateStyle: updateDocumentStyleDefinition,
  }), [
    activeTypingStyle,
    applyStyleToTouchedParagraphs,
    blockLayouts,
    blocks,
    commitBlockLayoutChange,
    commitDocumentOperation,
    commitInlineStyleChange,
    commitPageObjectDocumentChange,
    defaultFontFamily,
    defaultFontSizePt,
    draftPageObject,
    effectiveSelection,
    hasBlockSelection,
    hasInsertionSelection,
    hasPageObjectSelection,
    hasTextSelection,
    normalizedRuns,
    onDocumentSelectionRequest,
    pageObjectToolMode,
    displayPageObjects,
    normalizedPageObjects,
    selectedPageObject,
    selection,
    styleDefinitions,
    text,
    touchedParagraphIndexes,
    updateDocumentStyleDefinition,
  ]);

  useEffect(() => {
    onControllerChange(controller);
  }, [controller, onControllerChange]);

  return {
    clearPageObjectPreview,
    displayPageObjects,
    draftPageObject,
    displayBlockLayouts: compositionPreview?.blockLayouts ?? blockLayouts,
    displayRuns: compositionPreview?.runs ?? runs,
    displaySelection: compositionPreview?.selection ?? (hasTextSelection ? effectiveSelection : null),
    handleDraftPageObjectChange,
    handlePageObjectPreviewChange,
    handlePageObjectSelectionRequest,
    handlePageObjectTransformCommit,
    hasBlockSelection,
    onBeforeInput,
    onInput,
    onCompositionEnd,
    onCompositionStart,
    onCompositionUpdate,
    onCopy,
    onCut,
    onKeyDown,
    onPaste,
    pageObjectToolMode,
    selectedText,
  };
}

function createSnapshot(
  blocks: readonly NvdBlock[],
  pageObjects: readonly NvdPageObject[],
  selection: NvdDocumentSelection | null,
): NvdHistorySnapshot {
  return {
    blocks: cloneNvdBlocks(blocks),
    pageObjects: cloneNvdPageObjects(pageObjects),
    selection: selection ? JSON.parse(JSON.stringify(selection)) : null,
  };
}

function snapshotsEqual(left: NvdHistorySnapshot, right: NvdHistorySnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneNvdBlocks(blocks: readonly NvdBlock[]) {
  return JSON.parse(JSON.stringify(blocks)) as NvdBlock[];
}

function cloneNvdPageObjects(pageObjects: readonly NvdPageObject[]) {
  return JSON.parse(JSON.stringify(pageObjects)) as NvdPageObject[];
}

function createStyledInsertRun(text: string, style: NvdResolvedTypingStyle): NvdTextRun {
  return {
    text,
    style: {
      bold: style.bold,
      characterSpacingPt: style.characterSpacingPt,
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSizePt}pt`,
      italic: style.italic,
    },
  };
}

function resolveTypingStyleAtSelection(
  runs: readonly NvdTextRun[],
  selection: NvdTextSelection,
  defaultFontFamily: string,
  defaultFontSizePt: number,
): NvdResolvedTypingStyle {
  const targetOffset =
    selection.start === selection.end
      ? selection.start
      : selection.start;
  const run = findRunForOffset(runs, targetOffset) ?? runs[runs.length - 1] ?? { text: "" };
  return resolveTypingStyleForRun(run, defaultFontFamily, defaultFontSizePt);
}

function resolveTypingStyleForRun(
  run: NvdTextRun,
  defaultFontFamily: string,
  defaultFontSizePt: number,
): NvdResolvedTypingStyle {
  return {
    bold: isNvdTextRunBold(run),
    characterSpacingPt: getNvdTextRunCharacterSpacingPt(run),
    fontFamily: getNvdTextRunFontFamily(run, defaultFontFamily),
    fontSizePt: getNvdTextRunFontSizePt(run, defaultFontSizePt),
    italic: isNvdTextRunItalic(run),
  };
}

function mergeTypingStyle(
  baseStyle: NvdResolvedTypingStyle,
  overrideStyle: NvdResolvedTypingStyle | null,
): NvdResolvedTypingStyle {
  return overrideStyle ? { ...baseStyle, ...overrideStyle } : baseStyle;
}

function findRunForOffset(runs: readonly NvdTextRun[], offset: number) {
  let cursor = 0;

  for (const run of runs) {
    const nextCursor = cursor + run.text.length;

    if (offset < nextCursor || (offset === nextCursor && run.text.length > 0)) {
      return run;
    }

    cursor = nextCursor;
  }

  return runs[runs.length - 1] ?? null;
}

function applyResolvedTypingStyleToRun(
  run: NvdTextRun,
  style: NvdResolvedTypingStyle,
): NvdTextRun {
  return {
    ...run,
    style: {
      ...(run.style ?? {}),
      bold: style.bold,
      characterSpacingPt: style.characterSpacingPt,
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSizePt}pt`,
      italic: style.italic,
    },
  };
}

function getTypingStyleFromDefinition(style: NvdStyleDefinition): NvdResolvedTypingStyle {
  return {
    bold: style.bold,
    characterSpacingPt: getNvdCharacterSpacingPt(style.characterSpacingPt),
    fontFamily: getNvdFontFamily(style.fontFamily),
    fontSizePt: getNvdFontSizePt(style.fontSizePt),
    italic: style.italic,
  };
}

function getTouchedParagraphIndexes(
  text: string,
  blockLayouts: readonly NvdBlockLayout[],
  selection: NvdTextSelection,
) {
  const ranges = getParagraphRanges(text, blockLayouts.length);

  return ranges
    .map((range, index) => ({ ...range, index }))
    .filter((range) =>
      selection.start === selection.end
        ? selection.start >= range.start && selection.start <= range.end
        : selection.end > range.start && selection.start < range.end,
    )
    .map((range) => range.index);
}

function getParagraphRanges(text: string, paragraphCount: number) {
  const ranges: Array<{ end: number; start: number }> = [];
  let start = 0;

  for (let index = 0; index < paragraphCount; index += 1) {
    const newlineIndex = text.indexOf("\n", start);
    const end = newlineIndex === -1 ? text.length : newlineIndex + 1;
    ranges.push({ end, start });
    start = end;
  }

  return ranges.length > 0 ? ranges : [{ end: 0, start: 0 }];
}

function getParagraphContentEnd(
  text: string,
  range: { end: number; start: number },
) {
  return range.end > range.start && text[range.end - 1] === "\n" ? range.end - 1 : range.end;
}

function getUniformBlockValue<T extends keyof NvdBlockLayout>(
  blockLayouts: readonly NvdBlockLayout[],
  indexes: readonly number[],
  key: T,
) {
  const firstIndex = indexes[0];

  if (firstIndex === undefined) {
    return null;
  }

  const firstValue = blockLayouts[firstIndex]?.[key] ?? null;
  return indexes.every((index) => blockLayouts[index]?.[key] === firstValue) ? firstValue : null;
}

function getUniformInlineValue(
  runs: readonly NvdTextRun[],
  selection: NvdTextSelection,
  defaultFontFamily: string,
  defaultFontSizePt: number,
  key: keyof NvdResolvedTypingStyle,
) {
  const slice =
    selection.start === selection.end
      ? [findRunForOffset(runs, selection.start) ?? { text: "" }]
      : sliceNvdTextRuns(runs as NvdTextRun[], selection.start, selection.end);
  const values = slice.map((run) => resolveTypingStyleForRun(run, defaultFontFamily, defaultFontSizePt)[key]);
  const firstValue = values[0] ?? null;

  return values.every((value) => value === firstValue) ? firstValue : null;
}

function blockLayoutMatchesStyle(layout: NvdBlockLayout, style: NvdStyleDefinition) {
  return (
    layout.kind === style.role &&
    layout.keepLinesTogether === style.keepLinesTogether &&
    layout.keepWithNext === style.keepWithNext &&
    layout.lineHeight === getNvdLineHeight(style.lineHeight) &&
    layout.orphanLineCount === Math.max(2, style.orphanLineCount) &&
    layout.spaceAfterPt === getNvdParagraphSpacingPt(style.spaceAfterPt) &&
    layout.spaceBeforePt === getNvdParagraphSpacingPt(style.spaceBeforePt) &&
    layout.textAlign === style.textAlign &&
    layout.widowLineCount === Math.max(2, style.widowLineCount)
  );
}

function applyStyleDefinitionToBlockLayout(
  layout: NvdBlockLayout,
  style: NvdStyleDefinition,
): NvdBlockLayout {
  return {
    ...layout,
    kind: style.role,
    keepLinesTogether: style.keepLinesTogether,
    keepWithNext: style.keepWithNext,
    lineHeight: getNvdLineHeight(style.lineHeight),
    orphanLineCount: Math.max(2, style.orphanLineCount),
    spaceAfterPt: getNvdParagraphSpacingPt(style.spaceAfterPt),
    spaceBeforePt: getNvdParagraphSpacingPt(style.spaceBeforePt),
    textAlign: style.textAlign,
    widowLineCount: Math.max(2, style.widowLineCount),
  };
}

function createBlockLayoutFromStyleDefinition(style: NvdStyleDefinition): NvdBlockLayout {
  return {
    kind: style.role,
    keepLinesTogether: style.keepLinesTogether,
    keepWithNext: style.keepWithNext,
    lineHeight: getNvdLineHeight(style.lineHeight),
    orphanLineCount: Math.max(2, style.orphanLineCount),
    spaceAfterPt: getNvdParagraphSpacingPt(style.spaceAfterPt),
    spaceBeforePt: getNvdParagraphSpacingPt(style.spaceBeforePt),
    textAlign: style.textAlign,
    widowLineCount: Math.max(2, style.widowLineCount),
  };
}

function updateRunsMatchingStyle(
  runs: readonly NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  nextStyle: NvdStyleDefinition,
  previousStyle: NvdStyleDefinition,
  defaultFontFamily: string,
  defaultFontSizePt: number,
) {
  const text = getNvdTextRunsText(runs as NvdTextRun[]);
  const paragraphRanges = getParagraphRanges(text, blockLayouts.length);
  let nextRuns = normalizeNvdTextRuns([...runs]);

  paragraphRanges.forEach((range, index) => {
    if (!blockLayoutMatchesStyle(blockLayouts[index], previousStyle)) {
      return;
    }

    const paragraphRuns = sliceNvdTextRuns(nextRuns, range.start, range.end).map((run) => {
      const resolvedStyle = resolveTypingStyleForRun(run, defaultFontFamily, defaultFontSizePt);

      if (
        resolvedStyle.bold !== previousStyle.bold ||
        resolvedStyle.italic !== previousStyle.italic ||
        resolvedStyle.fontFamily !== getNvdFontFamily(previousStyle.fontFamily) ||
        resolvedStyle.fontSizePt !== getNvdFontSizePt(previousStyle.fontSizePt) ||
        resolvedStyle.characterSpacingPt !== getNvdCharacterSpacingPt(previousStyle.characterSpacingPt)
      ) {
        return run;
      }

      return applyResolvedTypingStyleToRun(run, getTypingStyleFromDefinition(nextStyle));
    });

    nextRuns = replaceNvdTextRunRange(nextRuns, range.start, range.end, paragraphRuns);
  });

  return nextRuns;
}

function updateRunsForCollapsedParagraphStyleApplication(
  runs: readonly NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  touchedParagraphIndexes: readonly number[],
  text: string,
  nextStyle: NvdStyleDefinition,
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>,
  defaultFontFamily: string,
  defaultFontSizePt: number,
) {
  const paragraphRanges = getParagraphRanges(text, blockLayouts.length);
  let nextRuns = normalizeNvdTextRuns([...runs]);

  touchedParagraphIndexes.forEach((paragraphIndex) => {
    const range = paragraphRanges[paragraphIndex];
    const paragraphRole = blockLayouts[paragraphIndex]?.kind;

    if (!range || !paragraphRole) {
      return;
    }

    nextRuns = updateRunsInRangeMatchingStyle(
      nextRuns,
      range.start,
      range.end,
      nextStyle,
      styleDefinitions[paragraphRole] ?? styleDefinitions.p,
      defaultFontFamily,
      defaultFontSizePt,
    );
  });

  return nextRuns;
}

function updateRunsInRangeMatchingStyle(
  runs: readonly NvdTextRun[],
  start: number,
  end: number,
  nextStyle: NvdStyleDefinition,
  previousStyle: NvdStyleDefinition,
  defaultFontFamily: string,
  defaultFontSizePt: number,
) {
  const normalizedRuns = normalizeNvdTextRuns([...runs]);
  const replacementRuns = sliceNvdTextRuns(normalizedRuns, start, end).map((run) => {
    const resolvedStyle = resolveTypingStyleForRun(run, defaultFontFamily, defaultFontSizePt);

    if (
      resolvedStyle.bold !== previousStyle.bold ||
      resolvedStyle.italic !== previousStyle.italic ||
      resolvedStyle.fontFamily !== getNvdFontFamily(previousStyle.fontFamily) ||
      resolvedStyle.fontSizePt !== getNvdFontSizePt(previousStyle.fontSizePt) ||
      resolvedStyle.characterSpacingPt !== getNvdCharacterSpacingPt(previousStyle.characterSpacingPt)
    ) {
      return run;
    }

    return applyResolvedTypingStyleToRun(run, getTypingStyleFromDefinition(nextStyle));
  });

  return replaceNvdTextRunRange(normalizedRuns, start, end, replacementRuns);
}

function getBlockSelection(
  text: string,
  blockLayouts: readonly NvdBlockLayout[],
  blockIndex: number,
) {
  const range = getParagraphRanges(text, blockLayouts.length)[blockIndex];

  if (!range) {
    return null;
  }

  return {
    end: range.start,
    start: range.start,
  } satisfies NvdTextSelection;
}

function moveSelectionHorizontally(
  selection: NvdTextSelection,
  direction: -1 | 1,
  textLength = Number.MAX_SAFE_INTEGER,
): NvdTextSelection {
  if (selection.start !== selection.end) {
    const collapsedOffset = direction < 0 ? selection.start : selection.end;
    return { start: collapsedOffset, end: collapsedOffset };
  }

  const nextOffset = Math.min(textLength, Math.max(0, selection.start + direction));
  return { start: nextOffset, end: nextOffset };
}

function moveSelectionVertically(
  layout: NvdDocumentLayoutSnapshot,
  selection: NvdTextSelection,
  direction: -1 | 1,
): NvdTextSelection {
  const focusOffset =
    selection.start === selection.end
      ? selection.start
      : direction < 0
        ? selection.start
        : selection.end;
  const caret = getNvdCaretGeometry(layout, focusOffset);
  const page = findNvdPageFragmentForOffset(layout.pages, focusOffset);
  const line = findNvdLineFragmentForOffset(page, focusOffset);

  if (!caret || !page || !line) {
    return { start: focusOffset, end: focusOffset };
  }

  const targetLine = findAdjacentLine(layout, page.index, line.index, direction);

  if (!targetLine) {
    return { start: focusOffset, end: focusOffset };
  }

  const nextOffset = getNvdOffsetAtPagePoint(
    layout,
    targetLine.pageIndex,
    caret.leftPx,
    targetLine.topPx + Math.min(caret.heightPx / 2, targetLine.heightPx / 2),
  );

  return { start: nextOffset, end: nextOffset };
}

function moveSelectionToLineBoundary(
  layout: NvdDocumentLayoutSnapshot,
  selection: NvdTextSelection,
  boundary: "start" | "end",
): NvdTextSelection {
  const focusOffset = boundary === "start" ? selection.start : selection.end;
  const page = findNvdPageFragmentForOffset(layout.pages, focusOffset);
  const line = findNvdLineFragmentForOffset(page, focusOffset);

  if (!line) {
    return { start: focusOffset, end: focusOffset };
  }

  const nextOffset = boundary === "start" ? line.start : getLineContentEnd(layout.text, line);
  return { start: nextOffset, end: nextOffset };
}

function findAdjacentLine(
  layout: NvdDocumentLayoutSnapshot,
  pageIndex: number,
  lineIndex: number,
  direction: -1 | 1,
) {
  if (direction < 0) {
    for (let index = pageIndex; index >= 0; index -= 1) {
      const page = layout.pages[index];

      if (!page) {
        continue;
      }

      const candidate =
        index === pageIndex ? findPreviousLine(page.lines, lineIndex) : page.lines[page.lines.length - 1];

      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (let index = pageIndex; index < layout.pages.length; index += 1) {
    const page = layout.pages[index];

    if (!page) {
      continue;
    }

    const candidate =
      index === pageIndex ? page.lines.find((line) => line.index > lineIndex) : page.lines[0];

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function findPreviousLine(lines: readonly NvdLineFragment[], lineIndex: number) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].index < lineIndex) {
      return lines[index];
    }
  }

  return null;
}

function getLineContentEnd(text: string, line: NvdLineFragment) {
  return line.end > line.start && text[line.end - 1] === "\n" ? line.end - 1 : line.end;
}
