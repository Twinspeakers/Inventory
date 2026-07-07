import { useEffect, useMemo, useRef } from "react";
import { Extension, type Editor } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { closeHistory, isHistoryTransaction, redoDepth, undoDepth } from "@tiptap/pm/history";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { NvdPageLayout, NvdTextAlignment, NvdTextRun } from "../../inventoryProject";
import { getNvdFontCssFamilyName, getNvdFontCssStack, getNvdFontFamily } from "../fonts";
import { getNvdFontSizeCssValue, getNvdFontSizePt } from "../primitives/nvdFontSize";
import {
  DEFAULT_NVD_CHARACTER_SPACING_PT,
  getNvdCharacterSpacingPt,
} from "../primitives/nvdCharacterSpacing";
import { DEFAULT_NVD_LINE_HEIGHT, getNvdLineHeight } from "../primitives/nvdLineHeight";
import { getNvdParagraphSpacingPt } from "../primitives/nvdParagraphSpacing";
import type { NvdStyleDefinition } from "../core/nvdStyles";
import {
  DEFAULT_NVD_TEXT_ALIGNMENT,
  NVD_TEXT_ALIGNMENTS,
  getNvdEditorSelection,
  getNvdTextAlignment,
  getNvdTextRunsText,
  normalizeNvdTextRuns,
  nvdTextRunsToTiptapContent,
  tiptapContentToNvdBlockLayouts,
  tiptapContentToNvdTextRuns,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "../core/nvdRichText";
import type { NvdPageBreak } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import { getProseMirrorPositionsForTextOffsets } from "./nvdProseMirror";
import { createNvdStyleHistoryAnchorTransaction } from "../core/nvdStyleHistory";

export type NvdEditorController = {
  canRedo: boolean;
  canUndo: boolean;
  characterSpacingPt: number | null;
  fontFamily: string;
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  lineHeight: number | null;
  spaceAfterPt: number | null;
  spaceBeforePt: number | null;
  textAlign: NvdTextAlignment | null;
  applyStyle: (style: NvdStyleDefinition) => void;
  focusBlock: (blockIndex: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setFontSizePt: (fontSizePt: number) => void;
  setCharacterSpacingPt: (characterSpacingPt: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setSpaceAfterPt: (spaceAfterPt: number) => void;
  setSpaceBeforePt: (spaceBeforePt: number) => void;
  setTextAlign: (textAlign: NvdTextAlignment) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  redo: () => void;
  undo: () => void;
  updateStyle: (
    style: NvdStyleDefinition,
    previousStyle: NvdStyleDefinition,
    onHistoryChange: (style: NvdStyleDefinition) => void,
  ) => void;
};

type NvdStyleHistoryTransition = {
  nextStyle: NvdStyleDefinition;
  onHistoryChange: (style: NvdStyleDefinition) => void;
  previousStyle: NvdStyleDefinition;
};

export function NvdRichTextEditor({
  ariaLabel,
  autoFocus = false,
  className,
  defaultFontFamily,
  defaultFontSizePt,
  documentKey,
  pageBreaks = [],
  pageLayout,
  requestedSelection,
  surfaceClassName,
  onActivate,
  onCompositionStateChange,
  onControllerChange,
  onRunsChange,
  onSelectionChange,
  runs,
  blockLayouts,
}: {
  ariaLabel: string;
  autoFocus?: boolean;
  className: string;
  defaultFontFamily: string;
  defaultFontSizePt: number;
  documentKey: string;
  pageBreaks?: NvdPageBreak[];
  pageLayout?: Partial<NvdPageLayout> | null;
  requestedSelection?: NvdTextSelection | null;
  surfaceClassName?: string;
  onActivate: () => void;
  onCompositionStateChange?: (isComposing: boolean) => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onRunsChange: (
    runs: NvdTextRun[],
    selection: NvdTextSelection,
    blockLayouts: NvdBlockLayout[],
  ) => void;
  onSelectionChange?: (selection: NvdTextSelection) => void;
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
}) {
  const normalizedDefaultFontFamily = getNvdFontFamily(defaultFontFamily);
  const normalizedDefaultFontSizePt = getNvdFontSizePt(defaultFontSizePt);
  const normalizedRuns = useMemo(() => normalizeNvdTextRuns(runs), [runs]);
  const contentSignature = useMemo(
    () => serializeContent(normalizedRuns, blockLayouts),
    [blockLayouts, normalizedRuns],
  );
  const onActivateRef = useRef(onActivate);
  const onCompositionStateChangeRef = useRef(onCompositionStateChange);
  const onControllerChangeRef = useRef(onControllerChange);
  const onRunsChangeRef = useRef(onRunsChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const defaultFontFamilyRef = useRef(normalizedDefaultFontFamily);
  const defaultFontSizePtRef = useRef(normalizedDefaultFontSizePt);
  const pageBreaksRef = useRef(pageBreaks);
  const pageLayoutRef = useRef(pageLayout);
  const pageBreaksSignatureRef = useRef("");
  const decorationCacheRef = useRef<{
    decorations: DecorationSet;
    doc: Editor["state"]["doc"];
    pageBreaksSignature: string;
  } | null>(null);
  const contentSignatureRef = useRef(contentSignature);
  const focusedDocumentKeyRef = useRef<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const appliedSelectionSignatureRef = useRef<string | null>(null);
  const styleRedoTransitionsRef = useRef(new Map<number, NvdStyleHistoryTransition>());
  const styleUndoTransitionsRef = useRef(new Map<number, NvdStyleHistoryTransition>());
  const undoDepthRef = useRef(0);
  const redoDepthRef = useRef(0);

  onActivateRef.current = onActivate;
  onCompositionStateChangeRef.current = onCompositionStateChange;
  onControllerChangeRef.current = onControllerChange;
  onRunsChangeRef.current = onRunsChange;
  onSelectionChangeRef.current = onSelectionChange;
  defaultFontFamilyRef.current = normalizedDefaultFontFamily;
  defaultFontSizePtRef.current = normalizedDefaultFontSizePt;
  pageBreaksRef.current = pageBreaks;
  pageLayoutRef.current = pageLayout;
  pageBreaksSignatureRef.current = serializePageBreaks(pageBreaks);

  const editor: Editor | null = useEditor(
    {
      extensions: createNvdEditorExtensions(),
      content: nvdTextRunsToTiptapContent(normalizedRuns, blockLayouts),
      editorProps: {
        attributes: {
          "aria-label": ariaLabel,
          class: `nvd-rich-text-content ${className}`,
          spellcheck: "true",
        },
        decorations: (state) => {
          const cachedDecorations = decorationCacheRef.current;
          const pageBreaksSignature = pageBreaksSignatureRef.current;

          if (
            cachedDecorations?.doc === state.doc &&
            cachedDecorations.pageBreaksSignature === pageBreaksSignature
          ) {
            return cachedDecorations.decorations;
          }

          const positions = getProseMirrorPositionsForTextOffsets(
            state.doc,
            pageBreaksRef.current.map((pageBreak) => pageBreak.offset),
          );
          const decorations = DecorationSet.create(
            state.doc,
            pageBreaksRef.current.map((pageBreakDefinition, index) =>
              Decoration.widget(
                positions[index],
                () => {
                  const pageBreak = document.createElement("span");
                  pageBreak.className = "nvd-a4-page-break";
                  pageBreak.dataset.nextPage = String(index + 2);
                  pageBreak.contentEditable = "false";
                  const pageLayoutPx = getNvdPageLayoutPx(pageLayoutRef.current);
                  pageBreak.style.height = `${pageBreakDefinition.heightPx}px`;
                  pageBreak.style.marginLeft = `${-pageLayoutPx.marginLeftPx}px`;
                  pageBreak.style.width = `${pageLayoutPx.widthPx}px`;
                  return pageBreak;
                },
                {
                  ignoreSelection: true,
                  key: `nvd-a4-page-break-${index}-${pageBreakDefinition.offset}-${pageBreakDefinition.heightPx}`,
                  side: -1,
                },
              ),
            ),
          );
          decorationCacheRef.current = {
            decorations,
            doc: state.doc,
            pageBreaksSignature,
          };
          return decorations;
        },
        handleDOMEvents: {
          compositionend: () => {
            onCompositionStateChangeRef.current?.(false);
            return false;
          },
          compositionstart: () => {
            onCompositionStateChangeRef.current?.(true);
            return false;
          },
          pointerdown: () => {
            onActivateRef.current();
            return false;
          },
        },
      },
      onCreate: ({ editor: createdEditor }) => {
        editorRef.current = createdEditor;
        undoDepthRef.current = undoDepth(createdEditor.state);
        redoDepthRef.current = redoDepth(createdEditor.state);
        publishController(createdEditor);
      },
      onTransaction: ({ editor: updatedEditor, transaction }) => {
        const previousUndoDepth = undoDepthRef.current;
        const previousRedoDepth = redoDepthRef.current;
        const nextUndoDepth = undoDepth(updatedEditor.state);
        const nextRedoDepth = redoDepth(updatedEditor.state);

        if (isHistoryTransaction(transaction)) {
          if (nextUndoDepth < previousUndoDepth) {
            const transition = styleUndoTransitionsRef.current.get(previousUndoDepth);

            if (transition) {
              styleUndoTransitionsRef.current.delete(previousUndoDepth);
              styleRedoTransitionsRef.current.set(nextRedoDepth, transition);
              transition.onHistoryChange({ ...transition.previousStyle });
            }
          } else if (nextRedoDepth < previousRedoDepth) {
            const transition = styleRedoTransitionsRef.current.get(previousRedoDepth);

            if (transition) {
              styleRedoTransitionsRef.current.delete(previousRedoDepth);
              styleUndoTransitionsRef.current.set(nextUndoDepth, transition);
              transition.onHistoryChange({ ...transition.nextStyle });
            }
          }
        } else if (previousRedoDepth > 0 && nextRedoDepth === 0) {
          styleRedoTransitionsRef.current.clear();
        }

        undoDepthRef.current = nextUndoDepth;
        redoDepthRef.current = nextRedoDepth;
      },
      onFocus: ({ editor: focusedEditor }) => {
        onActivateRef.current();
        publishController(focusedEditor);
      },
      onSelectionUpdate: ({ editor: updatedEditor }) => {
        const selection = getNvdEditorSelection(updatedEditor);
        onSelectionChangeRef.current?.(selection);
        publishController(updatedEditor);
      },
      onUpdate: ({ editor: updatedEditor }) => {
        const nextRuns = tiptapContentToNvdTextRuns(updatedEditor.getJSON());
        const nextBlockLayouts = tiptapContentToNvdBlockLayouts(updatedEditor.getJSON());
        const selection = getNvdEditorSelection(updatedEditor);
        contentSignatureRef.current = serializeContent(nextRuns, nextBlockLayouts);
        onRunsChangeRef.current(nextRuns, selection, nextBlockLayouts);
        onSelectionChangeRef.current?.(selection);
        publishController(updatedEditor);
      },
    },
    [documentKey],
  );

  useEffect(() => {
    if (!editor || contentSignatureRef.current === contentSignature) {
      return;
    }

    contentSignatureRef.current = contentSignature;
    editor.commands.setContent(nvdTextRunsToTiptapContent(normalizedRuns, blockLayouts), { emitUpdate: false });
  }, [blockLayouts, contentSignature, editor, normalizedRuns]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...editor.options.editorProps.attributes,
          "aria-label": ariaLabel,
          class: `nvd-rich-text-content ${className}`,
          spellcheck: "true",
        },
      },
    });
  }, [ariaLabel, className, editor]);

  const pageBreaksSignature = serializePageBreaks(pageBreaks);
  const requestedSelectionSignature =
    requestedSelection ? `${requestedSelection.start}:${requestedSelection.end}` : "";

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.view.updateState(editor.state);
  }, [editor, pageBreaksSignature]);

  useEffect(() => {
    if (!editor || !autoFocus || focusedDocumentKeyRef.current === documentKey) {
      return;
    }

    focusedDocumentKeyRef.current = documentKey;
    const frame = window.requestAnimationFrame(() => {
      editor.commands.focus("start");
      publishController(editor);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, documentKey, editor]);

  useEffect(() => {
    if (!editor || !requestedSelection) {
      return;
    }

    const signature = `${requestedSelection.start}:${requestedSelection.end}`;
    const currentSelection = getNvdEditorSelection(editor);
    const currentSignature = `${currentSelection.start}:${currentSelection.end}`;

    if (signature === currentSignature || signature === appliedSelectionSignatureRef.current) {
      appliedSelectionSignatureRef.current = signature;
      return;
    }

    const [from, to] = getProseMirrorPositionsForTextOffsets(editor.state.doc, [
      requestedSelection.start,
      requestedSelection.end,
    ]);
    editor.chain().focus().setTextSelection({ from, to }).run();
    appliedSelectionSignatureRef.current = signature;
  }, [editor, requestedSelection, requestedSelectionSignature]);

  useEffect(
    () => () => {
      onCompositionStateChangeRef.current?.(false);
    },
    [],
  );

  function publishController(activeEditor: Editor) {
    const activeTextStyle = activeEditor.getAttributes("textStyle");
    const activeFontFamily = activeTextStyle.fontFamily;
    const activeFontSize = activeTextStyle.fontSize;

    onControllerChangeRef.current({
      canRedo: activeEditor.can().redo(),
      canUndo: activeEditor.can().undo(),
      characterSpacingPt: getActiveNvdCharacterSpacingPt(activeEditor),
      fontFamily: getNvdFontFamily(typeof activeFontFamily === "string" ? activeFontFamily : defaultFontFamilyRef.current),
      fontSizePt: getNvdFontSizePt(typeof activeFontSize === "string" ? activeFontSize : defaultFontSizePtRef.current),
      isBold: activeEditor.isActive("bold"),
      isItalic: activeEditor.isActive("italic"),
      lineHeight: getActiveNvdLineHeight(activeEditor),
      spaceAfterPt: getActiveNvdBlockNumber(activeEditor, "spaceAfterPt", getNvdParagraphSpacingPt),
      spaceBeforePt: getActiveNvdBlockNumber(activeEditor, "spaceBeforePt", getNvdParagraphSpacingPt),
      textAlign: getActiveNvdTextAlignment(activeEditor),
      applyStyle: (style) => {
        applyNvdStyleToTouchedBlocks(activeEditor, style);
        publishController(activeEditor);
      },
      focusBlock: (blockIndex) => {
        focusNvdBlock(activeEditor, blockIndex);
        publishController(activeEditor);
      },
      setFontFamily: (fontFamily) => {
        activeEditor.chain().focus().setFontFamily(getNvdFontCssFamilyName(fontFamily)).run();
        publishController(activeEditor);
      },
      setFontSizePt: (fontSizePt) => {
        activeEditor.chain().focus().setFontSize(getNvdFontSizeCssValue(fontSizePt)).run();
        publishController(activeEditor);
      },
      setCharacterSpacingPt: (characterSpacingPt) => {
        setNvdCharacterSpacingOnTouchedBlocks(activeEditor, characterSpacingPt);
        publishController(activeEditor);
      },
      setLineHeight: (lineHeight) => {
        setNvdBlockAttributeOnTouchedBlocks(activeEditor, "lineHeight", getNvdLineHeight(lineHeight));
        publishController(activeEditor);
      },
      setSpaceAfterPt: (spaceAfterPt) => {
        setNvdBlockAttributeOnTouchedBlocks(
          activeEditor,
          "spaceAfterPt",
          getNvdParagraphSpacingPt(spaceAfterPt),
        );
        publishController(activeEditor);
      },
      setSpaceBeforePt: (spaceBeforePt) => {
        setNvdBlockAttributeOnTouchedBlocks(
          activeEditor,
          "spaceBeforePt",
          getNvdParagraphSpacingPt(spaceBeforePt),
        );
        publishController(activeEditor);
      },
      setTextAlign: (textAlign) => {
        activeEditor.chain().focus().setTextAlign(getNvdTextAlignment(textAlign)).run();
        publishController(activeEditor);
      },
      toggleBold: () => {
        activeEditor.chain().focus().toggleBold().run();
        publishController(activeEditor);
      },
      toggleItalic: () => {
        activeEditor.chain().focus().toggleItalic().run();
        publishController(activeEditor);
      },
      redo: () => {
        activeEditor.chain().focus().redo().run();
        publishController(activeEditor);
      },
      undo: () => {
        activeEditor.chain().focus().undo().run();
        publishController(activeEditor);
      },
      updateStyle: (style, previousStyle, onHistoryChange) => {
        const previousStyleHistoryDepth = undoDepth(activeEditor.state);
        activeEditor.view.dispatch(closeHistory(activeEditor.state.tr));
        updateNvdStyleBlocks(activeEditor, style, previousStyle);
        if (undoDepth(activeEditor.state) === previousStyleHistoryDepth) {
          addNvdStyleHistoryAnchor(activeEditor);
        }
        activeEditor.view.dispatch(closeHistory(activeEditor.state.tr));
        const styleHistoryDepth = undoDepth(activeEditor.state);

        if (styleHistoryDepth > previousStyleHistoryDepth) {
          styleUndoTransitionsRef.current.set(styleHistoryDepth, {
            nextStyle: { ...style },
            onHistoryChange,
            previousStyle: { ...previousStyle },
          });
          styleRedoTransitionsRef.current.clear();
        }

        undoDepthRef.current = styleHistoryDepth;
        redoDepthRef.current = redoDepth(activeEditor.state);
        publishController(activeEditor);
      },
    });
  }

    return (
      <div
        className={surfaceClassName ? `nvd-rich-text-editor ${surfaceClassName}` : "nvd-rich-text-editor"}
        style={{
          fontFamily: getNvdFontCssStack(normalizedDefaultFontFamily),
          fontSize: getNvdFontSizeCssValue(normalizedDefaultFontSizePt),
        }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

function createNvdEditorExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      heading: {
        levels: [1, 2, 3],
      },
      horizontalRule: false,
      link: false,
      listItem: false,
      orderedList: false,
      strike: false,
    }),
    TextStyle,
    FontFamily,
    FontSize,
    NvdCharacterSpacing,
    NvdLineHeight,
    TextAlign.configure({
      alignments: NVD_TEXT_ALIGNMENTS,
      defaultAlignment: DEFAULT_NVD_TEXT_ALIGNMENT,
      types: ["paragraph", "heading"],
    }),
  ];
}

function applyNvdStyleToTouchedBlocks(editor: Editor, style: NvdStyleDefinition) {
  const { selection } = editor.state;

  applyNvdStyleToBlocks(
    editor,
    style,
    (blockPosition, blockEnd) =>
      selection.empty
        ? selection.from >= blockPosition && selection.from <= blockEnd
        : selection.to > blockPosition && selection.from < blockEnd,
    selection.empty,
    true,
  );
}

function updateNvdStyleBlocks(
  editor: Editor,
  style: NvdStyleDefinition,
  previousStyle: NvdStyleDefinition,
) {
  applyNvdStyleToBlocks(
    editor,
    style,
    (_blockPosition, _blockEnd, block) =>
      block.type.name === (style.role === "p" ? "paragraph" : "heading") &&
      (style.role === "p" || block.attrs.level === Number(style.role.slice(1))) &&
      blockMatchesNvdStyle(block, previousStyle),
    false,
    false,
  );
}

function addNvdStyleHistoryAnchor(editor: Editor) {
  const transaction = createNvdStyleHistoryAnchorTransaction(editor.state);

  if (transaction) {
    editor.view.dispatch(transaction);
  }
}

function blockMatchesNvdStyle(block: Editor["state"]["doc"], style: NvdStyleDefinition) {
  if (
    Boolean(block.attrs.keepLinesTogether) !== style.keepLinesTogether ||
    Boolean(block.attrs.keepWithNext) !== style.keepWithNext ||
    getNvdTextAlignment(block.attrs.textAlign) !== style.textAlign ||
    getNvdLineHeight(block.attrs.lineHeight) !== style.lineHeight ||
    Math.max(2, Number(block.attrs.orphanLineCount ?? 2)) !== style.orphanLineCount ||
    getNvdParagraphSpacingPt(block.attrs.spaceAfterPt) !== style.spaceAfterPt ||
    getNvdParagraphSpacingPt(block.attrs.spaceBeforePt) !== style.spaceBeforePt ||
    Math.max(2, Number(block.attrs.widowLineCount ?? 2)) !== style.widowLineCount
  ) {
    return false;
  }

  let matches = true;

  block.descendants((node) => {
    if (!node.isText) {
      return matches;
    }

    const textStyle = node.marks.find((mark) => mark.type.name === "textStyle")?.attrs;
    matches =
      node.marks.some((mark) => mark.type.name === "bold") === style.bold &&
      node.marks.some((mark) => mark.type.name === "italic") === style.italic &&
      getNvdFontFamily(textStyle?.fontFamily) === getNvdFontFamily(style.fontFamily) &&
      getNvdFontSizePt(textStyle?.fontSize) === getNvdFontSizePt(style.fontSizePt) &&
      getNvdCharacterSpacingPt(textStyle?.characterSpacingPt) === style.characterSpacingPt;
    return matches;
  });

  return matches;
}

function applyNvdStyleToBlocks(
  editor: Editor,
  style: NvdStyleDefinition,
  shouldApply: (
    blockPosition: number,
    blockEnd: number,
    block: Editor["state"]["doc"],
  ) => boolean,
  updateStoredMarks: boolean,
  scrollIntoView: boolean,
) {
  const { doc, schema } = editor.state;
  const paragraphType = schema.nodes.paragraph;
  const headingType = schema.nodes.heading;
  const boldType = schema.marks.bold;
  const italicType = schema.marks.italic;
  const textStyleType = schema.marks.textStyle;
  const transaction = editor.state.tr;
  const desiredMarks = [
    ...(style.bold ? [boldType.create()] : []),
    ...(style.italic ? [italicType.create()] : []),
    textStyleType.create({
      characterSpacingPt: style.characterSpacingPt,
      fontFamily: getNvdFontCssFamilyName(style.fontFamily),
      fontSize: getNvdFontSizeCssValue(style.fontSizePt),
    }),
  ];
  let blockPosition = 0;

  for (let index = 0; index < doc.childCount; index += 1) {
    const block = doc.child(index);
    const blockEnd = blockPosition + block.nodeSize;
    if (shouldApply(blockPosition, blockEnd, block)) {
      const nodeType = style.role === "p" ? paragraphType : headingType;
      const attrs = {
        ...block.attrs,
        ...(style.role === "p" ? {} : { level: Number(style.role.slice(1)) }),
        keepLinesTogether: style.keepLinesTogether,
        keepWithNext: style.keepWithNext,
        lineHeight: style.lineHeight,
        orphanLineCount: style.orphanLineCount,
        spaceAfterPt: style.spaceAfterPt,
        spaceBeforePt: style.spaceBeforePt,
        textAlign: style.textAlign,
        widowLineCount: style.widowLineCount,
      };
      const contentStart = blockPosition + 1;
      const contentEnd = blockEnd - 1;

      transaction.setNodeMarkup(blockPosition, nodeType, attrs);
      transaction.removeMark(contentStart, contentEnd, boldType);
      transaction.removeMark(contentStart, contentEnd, italicType);
      transaction.removeMark(contentStart, contentEnd, textStyleType);
      desiredMarks.forEach((mark) => transaction.addMark(contentStart, contentEnd, mark));
    }

    blockPosition = blockEnd;
  }

  if (updateStoredMarks) {
    transaction.setStoredMarks(desiredMarks);
  }

  editor.view.dispatch(scrollIntoView ? transaction.scrollIntoView() : transaction);

  if (scrollIntoView) {
    editor.commands.focus();
  }
}

function focusNvdBlock(editor: Editor, blockIndex: number) {
  if (blockIndex < 0 || blockIndex >= editor.state.doc.childCount) {
    return;
  }

  let position = 1;

  for (let index = 0; index < blockIndex; index += 1) {
    position += editor.state.doc.child(index).nodeSize;
  }

  editor.commands.focus(position, { scrollIntoView: true });
}

function getActiveNvdTextAlignment(editor: Editor) {
  return NVD_TEXT_ALIGNMENTS.find((textAlign) => editor.isActive({ textAlign })) ?? null;
}

const NvdLineHeight = Extension.create({
  name: "nvdLineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: DEFAULT_NVD_LINE_HEIGHT,
            parseHTML: (element) => getNvdLineHeight(element.style.lineHeight),
            renderHTML: () => ({}),
          },
          keepLinesTogether: {
            default: false,
            parseHTML: (element) => element.getAttribute("data-keep-lines-together") === "true",
            renderHTML: (attributes) =>
              attributes.keepLinesTogether ? { "data-keep-lines-together": "true" } : {},
          },
          keepWithNext: {
            default: false,
            parseHTML: (element) => element.getAttribute("data-keep-with-next") === "true",
            renderHTML: (attributes) =>
              attributes.keepWithNext ? { "data-keep-with-next": "true" } : {},
          },
          orphanLineCount: {
            default: 2,
            parseHTML: (element) => Number(element.getAttribute("data-orphan-line-count") ?? 2),
            renderHTML: (attributes) =>
              Number(attributes.orphanLineCount) > 2
                ? { "data-orphan-line-count": String(Number(attributes.orphanLineCount)) }
                : {},
          },
          spaceAfterPt: {
            default: 0,
            parseHTML: (element) => getNvdParagraphSpacingPt(element.style.marginBottom),
            renderHTML: () => ({}),
          },
          spaceBeforePt: {
            default: 0,
            parseHTML: (element) => getNvdParagraphSpacingPt(element.style.marginTop),
            renderHTML: (attributes) => ({
              style: [
                `line-height: ${getNvdLineHeight(attributes.lineHeight)}`,
                `margin-top: ${getNvdParagraphSpacingPt(attributes.spaceBeforePt)}pt`,
                `margin-bottom: ${getNvdParagraphSpacingPt(attributes.spaceAfterPt)}pt`,
              ].join("; "),
            }),
          },
          widowLineCount: {
            default: 2,
            parseHTML: (element) => Number(element.getAttribute("data-widow-line-count") ?? 2),
            renderHTML: (attributes) =>
              Number(attributes.widowLineCount) > 2
                ? { "data-widow-line-count": String(Number(attributes.widowLineCount)) }
                : {},
          },
        },
      },
    ];
  },
});

const NvdCharacterSpacing = Extension.create({
  name: "nvdCharacterSpacing",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          characterSpacingPt: {
            default: DEFAULT_NVD_CHARACTER_SPACING_PT,
            parseHTML: (element) => getNvdCharacterSpacingPt(element.style.letterSpacing),
            renderHTML: (attributes) => ({
              style: `letter-spacing: ${getNvdCharacterSpacingPt(attributes.characterSpacingPt)}pt`,
            }),
          },
        },
      },
    ];
  },
});

function getActiveNvdLineHeight(editor: Editor) {
  const lineHeights = getTouchedNvdBlocks(editor).map(({ block }) =>
    getNvdLineHeight(block.attrs.lineHeight),
  );
  const firstLineHeight = lineHeights[0] ?? DEFAULT_NVD_LINE_HEIGHT;

  return lineHeights.every((lineHeight) => lineHeight === firstLineHeight)
    ? firstLineHeight
    : null;
}

function setNvdBlockAttributeOnTouchedBlocks(editor: Editor, attribute: string, value: number) {
  const transaction = editor.state.tr;

  getTouchedNvdBlocks(editor).forEach(({ block, position }) => {
    transaction.setNodeMarkup(position, undefined, {
      ...block.attrs,
      [attribute]: value,
    });
  });

  editor.view.dispatch(transaction.scrollIntoView());
  editor.commands.focus();
}

function getActiveNvdCharacterSpacingPt(editor: Editor) {
  const values: number[] = [];

  getTouchedNvdBlocks(editor).forEach(({ block }) => {
    block.descendants((node) => {
      if (node.isText) {
        const textStyle = node.marks.find((mark) => mark.type.name === "textStyle")?.attrs;
        values.push(getNvdCharacterSpacingPt(textStyle?.characterSpacingPt));
      }
    });
  });

  if (values.length === 0) {
    return getNvdCharacterSpacingPt(editor.getAttributes("textStyle").characterSpacingPt);
  }

  return values.every((value) => value === values[0]) ? values[0] : null;
}

function setNvdCharacterSpacingOnTouchedBlocks(editor: Editor, characterSpacingPt: number) {
  const textStyleType = editor.state.schema.marks.textStyle;
  const transaction = editor.state.tr;
  const normalizedCharacterSpacingPt = getNvdCharacterSpacingPt(characterSpacingPt);

  getTouchedNvdBlocks(editor).forEach(({ block, position }) => {
    block.descendants((node, relativePosition) => {
      if (!node.isText) {
        return;
      }

      const textStyle = node.marks.find((mark) => mark.type === textStyleType);
      const start = position + 1 + relativePosition;
      transaction.addMark(
        start,
        start + node.nodeSize,
        textStyleType.create({
          ...textStyle?.attrs,
          characterSpacingPt: normalizedCharacterSpacingPt,
        }),
      );
    });
  });

  transaction.setStoredMarks([
    ...(editor.state.storedMarks ?? editor.state.selection.$from.marks()).filter(
      (mark) => mark.type !== textStyleType,
    ),
    textStyleType.create({
      ...editor.getAttributes("textStyle"),
      characterSpacingPt: normalizedCharacterSpacingPt,
    }),
  ]);
  editor.view.dispatch(transaction.scrollIntoView());
  editor.commands.focus();
}

function getActiveNvdBlockNumber(
  editor: Editor,
  attribute: string,
  normalize: (value: number | string | null | undefined) => number,
) {
  const values = getTouchedNvdBlocks(editor).map(({ block }) => normalize(block.attrs[attribute]));
  const firstValue = values[0] ?? normalize(undefined);

  return values.every((value) => value === firstValue) ? firstValue : null;
}

function getTouchedNvdBlocks(editor: Editor) {
  const { doc, selection } = editor.state;
  const blocks: { block: Editor["state"]["doc"]; position: number }[] = [];
  let position = 0;

  for (let index = 0; index < doc.childCount; index += 1) {
    const block = doc.child(index);
    const blockEnd = position + block.nodeSize;
    const isTouched = selection.empty
      ? selection.from >= position && selection.from <= blockEnd
      : selection.to > position && selection.from < blockEnd;

    if (isTouched) {
      blocks.push({ block, position });
    }

    position = blockEnd;
  }

  return blocks;
}

function serializeContent(runs: NvdTextRun[], blockLayouts: NvdBlockLayout[]) {
  return JSON.stringify({
    blockLayouts,
    runs: normalizeNvdTextRuns(runs),
  });
}

function serializePageBreaks(pageBreaks: readonly NvdPageBreak[]) {
  return pageBreaks
    .map((pageBreak) => `${pageBreak.offset}:${pageBreak.heightPx}`)
    .join(",");
}
