import type { NvdAssetEmbed, NvdTextAlignment } from "../../inventoryProject";
import type { NvdDocumentSelection } from "../document/nvdDocumentSelection";
import type { NvdStyleDefinition } from "../document/nvdStyles";
import type { NvdInsertAssetPayload } from "../document/nvdDocumentOperations";

export type NvdEditorController = {
  canRedo: boolean;
  canUndo: boolean;
  canInsertAsset: boolean;
  characterSpacingPt: number | null;
  fontFamily: string;
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  lineHeight: number | null;
  selection: NvdDocumentSelection | null;
  selectionKind: "block" | "insertion" | "none" | "text";
  spaceAfterPt: number | null;
  spaceBeforePt: number | null;
  textAlign: NvdTextAlignment | null;
  applyStyle: (style: NvdStyleDefinition) => void;
  focusBlock: (blockIndex: number) => void;
  insertAsset: (asset: NvdInsertAssetPayload) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  removeSelectedBlock: () => void;
  setInsertionPoint: (blockIndex: number) => void;
  setSelection: (selection: NvdDocumentSelection) => void;
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
