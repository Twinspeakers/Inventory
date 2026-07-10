import type {
  NvdAssetEmbed,
  NvdPageObject,
  NvdPageObjectAsset,
  NvdPageObjectWrapMode,
  NvdPageObjectZMode,
  NvdTextAlignment,
} from "../../inventoryProject";
import type { NvdDocumentSelection } from "../document/nvdDocumentSelection";
import type { NvdDraftPageObject } from "../document/nvdPageObjectModel";
import type { NvdStyleDefinition } from "../document/nvdStyles";

export type NvdPageObjectToolMode = "frame" | "text";

export type NvdEditorController = {
  canRedo: boolean;
  canUndo: boolean;
  canSaveDraftPageObject: boolean;
  characterSpacingPt: number | null;
  draftPageObject: NvdDraftPageObject | null;
  fontFamily: string;
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  lineHeight: number | null;
  pageObjectToolMode: NvdPageObjectToolMode;
  selectedPageObject: NvdPageObject | null;
  selection: NvdDocumentSelection | null;
  selectionKind: "block" | "insertion" | "none" | "page-object" | "text";
  spaceAfterPt: number | null;
  spaceBeforePt: number | null;
  textAlign: NvdTextAlignment | null;
  applyStyle: (style: NvdStyleDefinition) => void;
  assignAssetToSelectedPageObject: (asset: NvdPageObjectAsset | null) => void;
  deleteSelectedPageObject: () => void;
  discardDraftPageObject: () => void;
  focusBlock: (blockIndex: number) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  removeSelectedBlock: () => void;
  saveDraftPageObject: () => void;
  setInsertionPoint: (blockIndex: number) => void;
  setPageObjectToolMode: (mode: NvdPageObjectToolMode) => void;
  setSelection: (selection: NvdDocumentSelection) => void;
  setSelectedPageObjectWrapMode: (wrapMode: NvdPageObjectWrapMode) => void;
  setSelectedPageObjectZMode: (zMode: NvdPageObjectZMode) => void;
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
  updateSelectedEmbed: (updates: Partial<NvdAssetEmbed>) => void;
  updateStyle: (
    style: NvdStyleDefinition,
    previousStyle: NvdStyleDefinition,
    onHistoryChange: (style: NvdStyleDefinition) => void,
  ) => void;
};
