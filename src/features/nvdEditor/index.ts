export { NvdEditor } from "./surfaces/NvdEditor";
export type { NvdEditorController } from "./adapters/NvdRichTextEditor";
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
export { NvdPageFragmentView } from "./a4/NvdPageFragmentView";
export { NvdA4PageHostLayer } from "./a4/NvdA4PageHostLayer";
export { NvdA4ProjectedTextLayer } from "./a4/NvdA4ProjectedTextLayer";
export { NvdA4SelectionOverlay } from "./a4/NvdA4SelectionOverlay";
export { NvdA4PageEditorSurface } from "./surfaces/NvdA4PageEditorSurface";
export { NvdPagelessEditorSurface } from "./surfaces/NvdPagelessEditorSurface";
export { NvdA4InfrastructureEditor } from "./a4/NvdA4InfrastructureEditor";
export { NvdInputBridge } from "./a4/NvdInputBridge";
export { useNvdA4SelectionController } from "./a4/useNvdA4SelectionController";
export { useNvdA4DocumentController } from "./a4/useNvdA4DocumentController";
export type { NvdInputBridgeHandle } from "./a4/NvdInputBridge";
export {
  DEFAULT_NVD_PAGE_LAYOUT,
  NVD_A4_PAGE_HEIGHT_PT,
  NVD_A4_PAGE_WIDTH_PT,
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
  getNvdA4PageBreaks,
  getNvdDocumentText,
  getNvdLayoutMode,
  NVD_A4_CONTENT_HEIGHT_PX,
  NVD_A4_PAGE_GAP_PX,
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
  getNvdOffsetAtPagePoint,
  getNvdSelectionGeometry,
  layoutNvdDocument,
  layoutNvdText,
  layoutNvdTextRuns,
} from "./layout/nvdPageLayoutEngine";
export type {
  NvdCaretGeometry,
  NvdDocumentLayoutSnapshot,
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
} from "./core/nvdStyles";
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
  getNvdTextAlignment,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  getNvdTextRunsText,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  NVD_TEXT_ALIGNMENTS,
  normalizeNvdTextRuns,
  replaceNvdTextRunRange,
  sliceNvdTextRuns,
  splitNvdTextRunsIntoParagraphs,
} from "./core/nvdRichText";
export type { NvdBlockLayout, NvdTextSelection } from "./core/nvdRichText";
