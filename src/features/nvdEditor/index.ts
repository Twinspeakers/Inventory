export { NvdEditor } from "./surfaces/NvdEditor";
export type {
  NvdEditorController,
  NvdPageObjectDisplayMode,
  NvdPageObjectToolMode,
} from "./contracts/NvdEditorController";
export {
  buildNvdFramePropertiesWindowUrl,
  isNvdFramePropertiesWindowRoute,
  NVD_FRAME_PROPERTIES_WINDOW_LABEL,
  NVD_FRAME_PROPERTIES_WINDOW_READY_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_SET_DISPLAY_MODE_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_UPDATE_DIMENSIONS_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_UPDATE_IMAGE_FIT_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_SET_WRAP_MODE_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_SET_Z_MODE_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_STATE_EVENT,
} from "./nvdFramePropertiesWindowBridge";
export type {
  NvdFramePropertiesWindowDisplayMode,
  NvdFramePropertiesWindowFrameSnapshot,
  NvdFramePropertiesWindowSetDisplayModePayload,
  NvdFramePropertiesWindowUpdateDimensionsPayload,
  NvdFramePropertiesWindowUpdateImageFitPayload,
  NvdFramePropertiesWindowSetWrapModePayload,
  NvdFramePropertiesWindowSetZModePayload,
  NvdFramePropertiesWindowStatePayload,
} from "./nvdFramePropertiesWindowBridge";
export {
  DEFAULT_NVD_CHARACTER_SPACING_PT,
  MAX_NVD_CHARACTER_SPACING_PT,
  MIN_NVD_CHARACTER_SPACING_PT,
  getNvdCharacterSpacingPt,
} from "./primitives/nvdCharacterSpacing";
export {
  DEFAULT_NVD_LINE_HEIGHT,
  MAX_NVD_LINE_HEIGHT,
  MIN_NVD_LINE_HEIGHT,
  getNvdLineHeight,
} from "./primitives/nvdLineHeight";
export {
  DEFAULT_NVD_PARAGRAPH_SPACING_PT,
  MAX_NVD_PARAGRAPH_SPACING_PT,
  MIN_NVD_PARAGRAPH_SPACING_PT,
  getNvdParagraphSpacingPt,
} from "./primitives/nvdParagraphSpacing";
export { NvdFontSelector } from "./controls/NvdFontSelector";
export { NvdFontSizeSelector } from "./controls/NvdFontSizeSelector";
export { NvdZoomSelector } from "./controls/NvdZoomSelector";
export { NvdThumbnail } from "./preview/NvdThumbnail";
export { NvdPageFragmentView } from "./rendering/NvdPageFragmentView";
export { NvdPagedHostLayer } from "./paged/NvdPagedHostLayer";
export { NvdPagedTextLayer } from "./paged/NvdPagedTextLayer";
export { NvdPagedSelectionOverlay } from "./paged/NvdPagedSelectionOverlay";
export { NvdPagedEditor } from "./paged/NvdPagedEditor";
export { NvdPagedInfrastructureEditor } from "./paged/NvdPagedInfrastructureEditor";
export { NvdInputBridge } from "./paged/NvdInputBridge";
export { useNvdPagedSelectionController } from "./paged/useNvdPagedSelectionController";
export { useNvdPagedDocumentController } from "./paged/useNvdPagedDocumentController";
export type { NvdInputBridgeHandle } from "./paged/NvdInputBridge";
export {
  DEFAULT_NVD_PAGE_LAYOUT,
  NVD_DEFAULT_PAGE_HEIGHT_PT,
  NVD_DEFAULT_PAGE_WIDTH_PT,
  NVD_DEFAULT_PAGE_MARGIN_PT,
  NVD_MM_PER_INCH,
  NVD_MIN_PAGE_CONTENT_SIZE_PT,
  NVD_PT_PER_INCH,
  NVD_PT_TO_MM,
  NVD_PT_TO_PX,
  clampNvdPageLayout,
  getNvdPageContentBoxPt,
  getNvdPageLayout,
  getNvdPageLengthMm,
  getNvdPageLayoutPx,
  getNvdPageLengthPx,
  getNvdPageSizePreset,
  type NvdPageLayoutPx,
} from "./layout/nvdPageLayout";
export {
  DEFAULT_NVD_FONT_SIZE_PT,
  MAX_NVD_FONT_SIZE_PT,
  MIN_NVD_FONT_SIZE_PT,
  NVD_FONT_SIZE_PRESETS_PT,
  clampNvdFontSizePt,
  getNvdFontSizeCssValue,
  getNvdFontSizePx,
  getNvdFontSizePt,
  normalizeNvdFontSizePt,
} from "./primitives/nvdFontSize";
export {
  BUNDLED_NVD_FONTS,
  DEFAULT_NVD_FONT_FAMILY,
  NVD_FONTS,
  SYSTEM_NVD_FONTS,
  findNvdFontDefinition,
  getNvdFontCssFamilyName,
  getNvdFontCssStack,
  getNvdFontFamily,
  getNvdFontMenuGroups,
  readRecentNvdFontFamilies,
  rememberRecentNvdFontFamily,
  useNvdFontReady,
  useNvdFontsReady,
  type NvdFontCategory,
  type NvdFontDefinition,
  type NvdFontMenuGroups,
  type NvdFontSource,
} from "./fonts";
export {
  DEFAULT_NVD_LAYOUT_MODE,
  findNvdPageIndexForOffset,
  getNvdPageBreaks,
  getNvdDocumentText,
  getNvdLayoutMode,
  NVD_DEFAULT_CONTENT_HEIGHT_PX,
  NVD_DEFAULT_PAGE_HEIGHT_PX,
  NVD_DEFAULT_PAGE_MARGIN_X_PX,
  NVD_DEFAULT_PAGE_MARGIN_Y_PX,
  NVD_DEFAULT_PAGE_WIDTH_PX,
  NVD_PAGE_GAP_PX,
  paginateNvdDocument,
  paginateNvdText,
  paginateNvdTextRuns,
} from "./layout/nvdLayout";
export type { NvdTextPage } from "./layout/nvdLayout";
export {
  findNvdLineFragmentForOffset,
  findNvdPageFragmentForOffset,
  findNvdParagraphFragmentForOffset,
  getNvdCaretGeometry,
  getNvdInsertionGeometry,
  getNvdInsertionIndexAtPagePoint,
  getNvdOffsetAtPagePoint,
  getNvdSelectionGeometry,
  layoutNvdDocument,
  layoutNvdText,
  layoutNvdTextRuns,
} from "./layout/nvdPageLayoutEngine";
export type {
  NvdCaretGeometry,
  NvdDocumentLayoutSnapshot,
  NvdInsertionGeometry,
  NvdLineFragment,
  NvdParagraphFragment,
  NvdPageFragment,
  NvdSelectionRect,
} from "./layout/nvdPageLayoutEngine";
export {
  DEFAULT_NVD_STYLE_DEFINITIONS,
  getNvdDocumentStyleDefinitions,
  getNvdStyleRole,
  NVD_STYLE_ROLES,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "./document/nvdStyles";
export {
  DEFAULT_NVD_ZOOM_PERCENT,
  normalizeNvdZoomPercent,
  NVD_ZOOM_PRESETS_PERCENT,
  stepNvdZoomPercent,
} from "./primitives/nvdZoom";
export {
  createNvdDocumentBlocks,
  DEFAULT_NVD_TEXT_ALIGNMENT,
  getNvdDocumentBlockLayouts,
  getNvdDocumentFontFamilies,
  getNvdDocumentRuns,
  getNvdDocumentTextAlignments,
  getNvdTextBlocks,
  getNvdTextAlignment,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  isNvdTextBlock,
  NVD_TEXT_ALIGNMENTS,
  normalizeNvdTextRuns,
  replaceNvdTextRunRange,
  sliceNvdTextRuns,
  splitNvdTextRunsIntoParagraphs,
} from "./document/nvdRichText";
export type { NvdBlockLayout, NvdTextSelection } from "./document/nvdRichText";
export {
  createNvdEmbedBlock,
  findNvdBlockIndexById,
  insertNvdBlock,
  moveNvdBlock,
  removeNvdBlockAtIndex,
  removeNvdBlockById,
  removeNvdSelectedBlock,
  resolveNvdInsertionIndex,
} from "./document/nvdDocumentModel";
export type { NvdDocumentBlockOperationResult } from "./document/nvdDocumentModel";
export {
  createNvdPageObjectAssetFromSource,
} from "./document/nvdPageObjectAssetBinding";
export type {
  NvdPageObjectAssetPointerDrag,
  NvdPageObjectAssetPointerDragController,
  NvdPageObjectAssetSourceDescriptor,
} from "./document/nvdPageObjectAssetBinding";
export {
  getNvdPageObjectBackgroundColor,
  createNvdPageObjectAsset,
  createNvdAssetFrameObjectFromDraft,
  findNvdPageObjectById,
  getNvdPageObjectFramePaddingPx,
  getNvdPageObjectAssetAlignment,
  getNvdPageObjectAssetFitMode,
  getNvdPageObjectAssetOffsetXPx,
  getNvdPageObjectAssetOffsetYPx,
  getNvdPageObjectAssetScale,
  getNvdPageObjectWrapPaddingPx,
  insertNvdPageObject,
  normalizeNvdPageObjects,
  removeNvdPageObjectById,
  updateNvdPageObjectById,
} from "./document/nvdPageObjectModel";
export type { NvdDraftPageObject } from "./document/nvdPageObjectModel";
export {
  getNvdTextSelectionForBlockIndex,
  insertNvdAssetAtSelection,
  insertNvdParagraphAtSelection,
  moveSelectedNvdBlock,
  normalizeNvdDocumentSelection,
  removeSelectedNvdBlock,
  resolveNvdInsertionIndexFromSelection,
  updateSelectedNvdEmbed,
} from "./document/nvdDocumentOperations";
export type { NvdInsertAssetPayload } from "./document/nvdDocumentOperations";
export {
  createNvdBlockDocumentSelection,
  createNvdInsertionDocumentSelection,
  createNvdPageObjectDocumentSelection,
  createNvdTextDocumentSelection,
  getNvdDocumentSelectionKind,
  getNvdTextSelectionFromDocumentSelection,
  isNvdBlockDocumentSelection,
  isNvdInsertionDocumentSelection,
  isNvdPageObjectDocumentSelection,
  isNvdTextDocumentSelection,
} from "./document/nvdDocumentSelection";
export type { NvdDocumentSelection } from "./document/nvdDocumentSelection";
