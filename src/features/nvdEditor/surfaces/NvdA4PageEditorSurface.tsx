import { useMemo } from "react";
import type { NvdPageLayout, NvdTextRun } from "../../inventoryProject";
import { useNvdFontsReady } from "../fonts";
import { NVD_A4_PAGE_GAP_PX, layoutNvdTextRuns } from "../layout/nvdLayout";
import { NvdA4InfrastructureEditor } from "../a4/NvdA4InfrastructureEditor";
import { NvdA4PageHostLayer } from "../a4/NvdA4PageHostLayer";
import { NvdA4ProjectedTextLayer } from "../a4/NvdA4ProjectedTextLayer";
import { NvdA4SelectionOverlay } from "../a4/NvdA4SelectionOverlay";
import { NvdPageRulers } from "../controls/NvdPageRulers";
import { getNvdPageLayout, getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdEditorController } from "../adapters/NvdRichTextEditor";
import type { NvdBlockLayout, NvdTextSelection } from "../core/nvdRichText";
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
  onRunsChange,
  onSelectionChange,
  runs,
  blockLayouts,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  documentPath: string;
  fontFamilies: string[];
  pageLayout: ReturnType<typeof getNvdPageLayout>;
  onPageLayoutChange: (pageLayout: ReturnType<typeof getNvdPageLayout>) => void;
  onActivate: () => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onRunsChange: (runs: NvdTextRun[], blockLayouts?: NvdBlockLayout[]) => void;
  onSelectionChange: (selection: NvdTextSelection) => void;
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
}) {
  const fontsReady = useNvdFontsReady(fontFamilies);
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const {
    activeSelection,
    bridgeFocusRequestKey,
    handleSelectionRequest,
  } = useNvdA4SelectionController({ onSelectionChange });
  const baseLayoutSnapshot = useMemo(
    () =>
      fontsReady
        ? layoutNvdTextRuns(runs, defaultFontFamily, defaultFontSizePt, blockLayouts, pageLayout)
        : null,
    [blockLayouts, defaultFontFamily, defaultFontSizePt, fontsReady, pageLayout, runs],
  );
  const {
    displayBlockLayouts,
    displayRuns,
    displaySelection,
    onBeforeInput,
    onCompositionEnd,
    onCompositionStart,
    onCompositionUpdate,
    onCopy,
    onCut,
    onKeyDown,
    onPaste,
    selectedText,
  } = useNvdA4DocumentController({
    blockLayouts,
    defaultFontFamily,
    defaultFontSizePt,
    documentKey: documentPath,
    layoutSnapshot: baseLayoutSnapshot,
    onControllerChange,
    onRunsChange,
    onSelectionRequest: handleSelectionRequest,
    runs,
    selection: activeSelection,
  });
  const layoutSnapshot = useMemo(
    () =>
      fontsReady
        ? layoutNvdTextRuns(
            displayRuns,
            defaultFontFamily,
            defaultFontSizePt,
            displayBlockLayouts,
            pageLayout,
          )
        : null,
    [
      defaultFontFamily,
      defaultFontSizePt,
      displayBlockLayouts,
      displayRuns,
      fontsReady,
      pageLayout,
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
          onSelectionRequest={handleSelectionRequest}
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
          selection={activeSelection ? displaySelection : null}
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
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCopy={onCopy}
        onCut={onCut}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
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
