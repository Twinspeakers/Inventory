import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import type { NvdTextRun } from "../../inventoryProject";
import { getNvdCharacterSpacingPt } from "../primitives/nvdCharacterSpacing";
import {
  applyNvdTextEdit,
  deleteNvdBackward,
  deleteNvdForward,
} from "../document/nvdDocumentController";
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
import type { NvdEditorController } from "../adapters/NvdRichTextEditor";
import {
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
  blockLayouts: NvdBlockLayout[];
  runs: NvdTextRun[];
  selection: NvdTextSelection;
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

export function useNvdA4DocumentController({
  blockLayouts,
  defaultFontFamily,
  defaultFontSizePt,
  documentKey,
  layoutSnapshot,
  onControllerChange,
  onRunsChange,
  onSelectionRequest,
  runs,
  selection,
  styleDefinitions,
}: {
  blockLayouts: NvdBlockLayout[];
  defaultFontFamily: string;
  defaultFontSizePt: number;
  documentKey: string;
  layoutSnapshot: NvdDocumentLayoutSnapshot | null;
  onControllerChange: (controller: NvdEditorController) => void;
  onRunsChange: (runs: NvdTextRun[], blockLayouts?: NvdBlockLayout[]) => void;
  onSelectionRequest: (selection: NvdTextSelection) => void;
  runs: NvdTextRun[];
  selection: NvdTextSelection | null;
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
}) {
  const effectiveSelection = selection ?? { start: 0, end: 0 };
  const normalizedRuns = useMemo(() => normalizeNvdTextRuns(runs), [runs]);
  const text = useMemo(() => getNvdTextRunsText(normalizedRuns), [normalizedRuns]);
  const historyRef = useRef<{ documentKey: string; redoStack: NvdHistoryEntry[]; undoStack: NvdHistoryEntry[] }>({
    documentKey,
    redoStack: [],
    undoStack: [],
  });
  const typingStyleRef = useRef<NvdResolvedTypingStyle | null>(null);
  const [compositionState, setCompositionState] = useState<NvdCompositionState>(null);
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
    () => getTouchedParagraphIndexes(text, blockLayouts, effectiveSelection),
    [blockLayouts, effectiveSelection, text],
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
    onRunsChange(snapshot.runs, snapshot.blockLayouts);
    onSelectionRequest(snapshot.selection);
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
    const before = createSnapshot(normalizedRuns, blockLayouts, effectiveSelection);
    const after = createSnapshot(nextRuns, nextBlockLayouts, nextSelection);
    const changed = !snapshotsEqual(before, after);

    if (!changed) {
      onSelectionRequest(nextSelection);
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
    const nextBlockLayouts = blockLayouts.map((layout, index) =>
      touchedParagraphIndexes.includes(index) ? update(layout) : layout,
    );
    commitContentChange(normalizedRuns, nextBlockLayouts, effectiveSelection);
  }

  function applyStyleToTouchedParagraphs(style: NvdStyleDefinition) {
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

  function insertParagraphBreak() {
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
    if (!insertedText) {
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
    [activeTypingStyle, blockLayouts, effectiveSelection, normalizedRuns],
  );

  const onInput = useMemo<FormEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
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
    [activeTypingStyle, blockLayouts, effectiveSelection, normalizedRuns],
  );

  const onKeyDown = useMemo<KeyboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (compositionState) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onSelectionRequest({
          end: text.length,
          start: 0,
        });
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

      if (event.key === "Backspace") {
        event.preventDefault();
        applyDocumentEdit(deleteNvdBackward(normalizedRuns, blockLayouts, effectiveSelection));
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
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
        onSelectionRequest(moveSelectionHorizontally(effectiveSelection, -1));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelectionRequest(moveSelectionHorizontally(effectiveSelection, 1, text.length));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowUp") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        onSelectionRequest(moveSelectionVertically(layoutSnapshot, effectiveSelection, -1));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "ArrowDown") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        onSelectionRequest(moveSelectionVertically(layoutSnapshot, effectiveSelection, 1));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "Home") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        onSelectionRequest(moveSelectionToLineBoundary(layoutSnapshot, effectiveSelection, "start"));
        typingStyleRef.current = null;
        refreshController();
        return;
      }

      if (event.key === "End") {
        if (!layoutSnapshot) {
          return;
        }

        event.preventDefault();
        onSelectionRequest(moveSelectionToLineBoundary(layoutSnapshot, effectiveSelection, "end"));
        typingStyleRef.current = null;
        refreshController();
      }
    },
    [activeTypingStyle, blockLayouts, compositionState, commitInlineStyleChange, effectiveSelection, layoutSnapshot, normalizedRuns, onSelectionRequest, text.length],
  );

  const onPaste = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      const pastedText = event.clipboardData.getData("text/plain");

      if (!pastedText) {
        return;
      }

      event.preventDefault();
      applyDocumentEdit(
        applyNvdTextEdit(normalizedRuns, blockLayouts, effectiveSelection, [
          createStyledInsertRun(pastedText, activeTypingStyle),
        ]),
      );
    },
    [activeTypingStyle, blockLayouts, effectiveSelection, normalizedRuns],
  );

  const onCopy = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (effectiveSelection.end <= effectiveSelection.start) {
        return;
      }

      event.preventDefault();
      event.clipboardData.setData("text/plain", text.slice(effectiveSelection.start, effectiveSelection.end));
    },
    [effectiveSelection.end, effectiveSelection.start, text],
  );

  const onCut = useMemo<ClipboardEventHandler<HTMLTextAreaElement>>(
    () => (event) => {
      if (effectiveSelection.end <= effectiveSelection.start) {
        return;
      }

      event.preventDefault();
      event.clipboardData.setData("text/plain", text.slice(effectiveSelection.start, effectiveSelection.end));
      applyDocumentEdit(applyNvdTextEdit(normalizedRuns, blockLayouts, effectiveSelection, []));
    },
    [blockLayouts, effectiveSelection, normalizedRuns, text],
  );

  const selectedText = useMemo(() => {
    if (effectiveSelection.end <= effectiveSelection.start) {
      return "";
    }

    return text.slice(effectiveSelection.start, effectiveSelection.end);
  }, [effectiveSelection.end, effectiveSelection.start, text]);

  const onCompositionStart = useMemo<CompositionEventHandler<HTMLTextAreaElement>>(
    () => () => {
      setCompositionState({
        baseBlockLayouts: blockLayouts.map((layout) => ({ ...layout })),
        baseRuns: normalizeNvdTextRuns(normalizedRuns),
        baseSelection: { ...effectiveSelection },
        text: "",
      });
    },
    [blockLayouts, effectiveSelection, normalizedRuns],
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

  const controller = useMemo<NvdEditorController>(() => ({
    canRedo: historyRef.current.redoStack.length > 0,
    canUndo: historyRef.current.undoStack.length > 0,
    characterSpacingPt: getUniformInlineValue(
      normalizedRuns,
      effectiveSelection,
      defaultFontFamily,
      defaultFontSizePt,
      "characterSpacingPt",
    ) as number | null,
    fontFamily: activeTypingStyle.fontFamily,
    fontSizePt: activeTypingStyle.fontSizePt,
    isBold: activeTypingStyle.bold,
    isItalic: activeTypingStyle.italic,
    lineHeight: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "lineHeight"),
    spaceAfterPt: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "spaceAfterPt"),
    spaceBeforePt: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "spaceBeforePt"),
    textAlign: getUniformBlockValue(blockLayouts, touchedParagraphIndexes, "textAlign"),
    applyStyle: applyStyleToTouchedParagraphs,
    focusBlock: (blockIndex) => {
      const nextSelection = getBlockSelection(text, blockLayouts, blockIndex);

      if (!nextSelection) {
        return;
      }

      typingStyleRef.current = null;
      onSelectionRequest(nextSelection);
      refreshController();
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
    updateStyle: updateDocumentStyleDefinition,
  }), [
    activeTypingStyle,
    blockLayouts,
    defaultFontFamily,
    defaultFontSizePt,
    effectiveSelection,
    normalizedRuns,
    onSelectionRequest,
    styleDefinitions,
    text,
    touchedParagraphIndexes,
  ]);

  useEffect(() => {
    onControllerChange(controller);
  }, [controller, onControllerChange]);

  return {
    displayBlockLayouts: compositionPreview?.blockLayouts ?? blockLayouts,
    displayRuns: compositionPreview?.runs ?? runs,
    displaySelection: compositionPreview?.selection ?? effectiveSelection,
    onBeforeInput,
    onInput,
    onCompositionEnd,
    onCompositionStart,
    onCompositionUpdate,
    onCopy,
    onCut,
    onKeyDown,
    onPaste,
    selectedText,
  };
}

function createSnapshot(
  runs: readonly NvdTextRun[],
  blockLayouts: readonly NvdBlockLayout[],
  selection: NvdTextSelection,
): NvdHistorySnapshot {
  return {
    blockLayouts: blockLayouts.map((layout) => ({ ...layout })),
    runs: normalizeNvdTextRuns([...runs]),
    selection: { ...selection },
  };
}

function snapshotsEqual(left: NvdHistorySnapshot, right: NvdHistorySnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
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
