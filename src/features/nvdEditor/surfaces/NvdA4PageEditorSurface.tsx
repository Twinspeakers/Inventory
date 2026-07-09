import { useMemo, useRef } from "react";
import type { NvdBlock, NvdPageLayout, NvdTextRun } from "../../inventoryProject";
import { useNvdFontsReady } from "../fonts";
import { NVD_A4_PAGE_GAP_PX, layoutNvdDocument } from "../layout/nvdLayout";
import {
  NvdA4InfrastructureEditor,
  type NvdA4InfrastructureEditorHandle,
} from "../a4/NvdA4InfrastructureEditor";
import { NvdA4PageHostLayer } from "../a4/NvdA4PageHostLayer";
import { NvdA4ProjectedTextLayer } from "../a4/NvdA4ProjectedTextLayer";
import { NvdA4SelectionOverlay } from "../a4/NvdA4SelectionOverlay";
import { NvdPageRulers } from "../controls/NvdPageRulers";
import { getNvdPageLayout, getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdEditorController } from "../adapters/NvdRichTextEditor";
import {
  createNvdDocumentBlocks,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "../document/nvdRichText";
import type { NvdStyleDefinition, NvdStyleRole } from "../document/nvdStyles";
import { useNvdA4DocumentController } from "../a4/useNvdA4DocumentController";
import { useNvdA4SelectionController } from "../a4/useNvdA4SelectionController";

export function NvdA4PageEditorSurface({
  defaultFontFamily,
  defaultFontSizePt,
  documentPath,
  fontFamilies,
  pageLayout,
  onPageLayoutChange,
  onActivate,
  onControllerChange,
  onBlocksChange,
  onSelectionChange,
  blocks,
  runs,
  blockLayouts,
  styleDefinitions,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  documentPath: string;
  fontFamilies: string[];
  pageLayout: ReturnType<typeof getNvdPageLayout>;
  onPageLayoutChange: (pageLayout: ReturnType<typeof getNvdPageLayout>) => void;
  onActivate: () => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onBlocksChange: (blocks: NvdBlock[]) => void;
  onSelectionChange: (selection: NvdTextSelection) => void;
  blocks: NvdBlock[];
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
}) {
  const fontsReady = useNvdFontsReady(fontFamilies);
  const infrastructureEditorRef = useRef<NvdA4InfrastructureEditorHandle | null>(null);
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const {
    activeDocumentSelection,
    bridgeFocusRequestKey,
    handleDocumentSelectionRequest,
    handleTextSelectionRequest,
  } = useNvdA4SelectionController({ onSelectionChange });
  const baseBlocks = useMemo(
    () => createNvdDocumentBlocks(runs, blocks, blockLayouts),
    [blockLayouts, blocks, runs],
  );
  const baseLayoutSnapshot = useMemo(
    () =>
      fontsReady
        ? layoutNvdDocument({
            blocks: baseBlocks,
            fontFamily: defaultFontFamily,
            fontSize: `${defaultFontSizePt}pt`,
            pageLayout,
            styles: styleDefinitions,
          })
        : null,
    [baseBlocks, defaultFontFamily, defaultFontSizePt, fontsReady, pageLayout, styleDefinitions],
  );
  const {
    displayBlockLayouts,
    displayRuns,
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
  } = useNvdA4DocumentController({
    blocks,
    blockLayouts,
    defaultFontFamily,
    defaultFontSizePt,
    documentKey: documentPath,
    layoutSnapshot: baseLayoutSnapshot,
    onBlocksChange,
    onControllerChange,
    onDocumentSelectionRequest: handleDocumentSelectionRequest,
    runs,
    selection: activeDocumentSelection,
    styleDefinitions,
  });
  const displayBlocks = useMemo(
    () => createNvdDocumentBlocks(displayRuns, blocks, displayBlockLayouts),
    [blocks, displayBlockLayouts, displayRuns],
  );
  const layoutSnapshot = useMemo(
    () =>
      fontsReady
        ? layoutNvdDocument({
            blocks: displayBlocks,
            fontFamily: defaultFontFamily,
            fontSize: `${defaultFontSizePt}pt`,
            pageLayout,
            styles: styleDefinitions,
          })
        : null,
    [
      displayBlocks,
      defaultFontFamily,
      defaultFontSizePt,
      fontsReady,
      pageLayout,
      styleDefinitions,
    ],
  );
  const pages = layoutSnapshot?.pages ?? [];

  return (
    <article
      aria-label={`${pages.length} A4 page${pages.length === 1 ? "" : "s"}`}
      className="nvd-editor-a4-document"
      onPointerDown={onActivate}
      style={{
        minHeight:
          pages.length * pageLayoutPx.heightPx +
          Math.max(0, pages.length - 1) * NVD_A4_PAGE_GAP_PX,
        paddingBottom: `${pageLayoutPx.marginBottomPx}px`,
        paddingLeft: `${pageLayoutPx.marginLeftPx}px`,
        paddingRight: `${pageLayoutPx.marginRightPx}px`,
        paddingTop: `${pageLayoutPx.marginTopPx}px`,
        width: `${pageLayoutPx.widthPx}px`,
      }}
    >
      <div className="nvd-a4-page-sheets" aria-hidden="true">
        {pages.map((page) => (
          <span
            className="nvd-a4-page-sheet"
            key={page.index}
            style={{
              height: `${pageLayoutPx.heightPx}px`,
              top: page.index * (pageLayoutPx.heightPx + NVD_A4_PAGE_GAP_PX),
              width: `${pageLayoutPx.widthPx}px`,
            }}
          />
        ))}
      </div>
      {layoutSnapshot ? (
        <NvdA4PageHostLayer
          layout={layoutSnapshot}
          onDocumentSelectionRequest={handleDocumentSelectionRequest}
          onPointerInteractionStart={() => {
            infrastructureEditorRef.current?.focusBridge();
          }}
          onTextSelectionRequest={handleTextSelectionRequest}
          pageLayout={pageLayout}
          pages={pages}
        />
      ) : null}
      {pages.length > 0 ? (
        <NvdA4ProjectedTextLayer
          defaultFontFamily={defaultFontFamily}
          defaultFontSizePt={defaultFontSizePt}
          pageLayout={pageLayout}
          pages={pages}
        />
      ) : null}
      {layoutSnapshot ? (
        <NvdA4SelectionOverlay
          layout={layoutSnapshot}
          pageLayout={pageLayout}
          selection={activeDocumentSelection}
        />
      ) : null}
      <NvdPageRulers
        pageCount={Math.max(1, pages.length)}
        pageGapPx={NVD_A4_PAGE_GAP_PX}
        pageLayout={pageLayout}
        onPageLayoutChange={onPageLayoutChange}
      />
      {!fontsReady ? <NvdA4FontLoadingDocument pageLayout={pageLayout} /> : null}
      <NvdA4InfrastructureEditor
        focusBridgeRequestKey={bridgeFocusRequestKey}
        onBeforeInput={onBeforeInput}
        onInput={onInput}
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCopy={onCopy}
        onCut={onCut}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        ref={infrastructureEditorRef}
        selectedText={selectedText}
      />
    </article>
  );
}

function NvdA4FontLoadingDocument({
  pageLayout,
}: {
  pageLayout: ReturnType<typeof getNvdPageLayout>;
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);

  return (
    <div className="nvd-editor-pages absolute inset-0 z-10" aria-label="Loading document fonts">
      <article
        className="nvd-editor-page nvd-editor-page-a4"
        style={{
          height: `${pageLayoutPx.heightPx}px`,
          paddingBottom: `${pageLayoutPx.marginBottomPx}px`,
          paddingLeft: `${pageLayoutPx.marginLeftPx}px`,
          paddingRight: `${pageLayoutPx.marginRightPx}px`,
          paddingTop: `${pageLayoutPx.marginTopPx}px`,
          width: `${pageLayoutPx.widthPx}px`,
        }}
      >
        <div className="space-y-2">
          <span className="block h-1 w-4/5 rounded-sm bg-surface-raised" />
          <span className="block h-1 w-full rounded-sm bg-surface-raised" />
          <span className="block h-1 w-11/12 rounded-sm bg-surface-raised" />
          <span className="block h-1 w-3/4 rounded-sm bg-surface-raised" />
        </div>
      </article>
    </div>
  );
}
