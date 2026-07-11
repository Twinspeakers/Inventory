import { useMemo, useRef } from "react";
import type { NvdBlock, NvdTextRun } from "../../inventoryProject";
import { useNvdFontsReady } from "../fonts";
import { NVD_PAGE_GAP_PX, layoutNvdDocument } from "../layout/nvdLayout";
import {
  NvdPagedInfrastructureEditor,
  type NvdPagedInfrastructureEditorHandle,
} from "./NvdPagedInfrastructureEditor";
import { NvdPagedHostLayer } from "./NvdPagedHostLayer";
import { NvdPagedObjectLayer } from "./NvdPagedObjectLayer";
import { NvdPagedTextLayer } from "./NvdPagedTextLayer";
import { NvdPagedSelectionOverlay } from "./NvdPagedSelectionOverlay";
import { NvdPageRulers } from "../controls/NvdPageRulers";
import { getNvdPageLayout, getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdEditorController } from "../contracts/NvdEditorController";
import type { NvdDocumentSelection } from "../document/nvdDocumentSelection";
import {
  createNvdDocumentBlocks,
  type NvdBlockLayout,
} from "../document/nvdRichText";
import type { NvdPageObjectAssetPointerDragController } from "../document/nvdPageObjectAssetBinding";
import type { NvdStyleDefinition, NvdStyleRole } from "../document/nvdStyles";
import { useNvdPagedDocumentController } from "./useNvdPagedDocumentController";
import { useNvdPagedSelectionController } from "./useNvdPagedSelectionController";
import {
  isNvdPageObjectDocumentSelection,
} from "../document/nvdDocumentSelection";
import type { NvdPageObject } from "../../inventoryProject";

export function NvdPagedEditor({
  defaultFontFamily,
  defaultFontSizePt,
  documentPath,
  fontFamilies,
  pageLayout,
  onPageLayoutChange,
  onActivate,
  onControllerChange,
  onBlocksChange,
  onPageObjectsChange,
  onPageObjectAssetPointerDragTargetChange,
  onPageObjectContextMenu,
  onSelectionChange,
  pageObjectAssetPointerDragController,
  pageObjectAssetPointerDropTargetId,
  blocks,
  pageObjects,
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
  onPageObjectsChange: (pageObjects: NvdPageObject[]) => void;
  onPageObjectAssetPointerDragTargetChange: (objectId: string | null) => void;
  onPageObjectContextMenu: (payload: { objectId: string; x: number; y: number; label: string }) => void;
  onSelectionChange: (selection: NvdDocumentSelection | null) => void;
  pageObjectAssetPointerDragController: NvdPageObjectAssetPointerDragController;
  pageObjectAssetPointerDropTargetId: string | null;
  blocks: NvdBlock[];
  pageObjects: NvdPageObject[];
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
}) {
  const fontsReady = useNvdFontsReady(fontFamilies);
  const infrastructureEditorRef = useRef<NvdPagedInfrastructureEditorHandle | null>(null);
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const {
    activeDocumentSelection,
    bridgeFocusRequestKey,
    handleDocumentSelectionRequest,
    handleTextSelectionRequest,
  } = useNvdPagedSelectionController({ onSelectionChange });
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
            pageObjects,
            pageLayout,
            styles: styleDefinitions,
          })
        : null,
    [baseBlocks, defaultFontFamily, defaultFontSizePt, fontsReady, pageLayout, styleDefinitions],
  );
  const {
    clearPageObjectPreview,
    displayPageObjects,
    displayBlockLayouts,
    displayRuns,
    handleDraftPageObjectChange,
    handlePageObjectPreviewChange,
    handlePageObjectSelectionRequest,
    handlePageObjectTransformCommit,
    onBeforeInput,
    onInput,
    onCompositionEnd,
    onCompositionStart,
    onCompositionUpdate,
    onCopy,
    onCut,
    draftPageObject,
    onKeyDown,
    onPaste,
    pageObjectToolMode,
    selectedText,
  } = useNvdPagedDocumentController({
    blocks,
    blockLayouts,
    defaultFontFamily,
    defaultFontSizePt,
    documentKey: documentPath,
    layoutSnapshot: baseLayoutSnapshot,
    onBlocksChange,
    onControllerChange,
    onDocumentSelectionRequest: handleDocumentSelectionRequest,
    onPageObjectsChange,
    pageObjects,
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
            pageObjects: displayPageObjects,
            pageLayout,
            styles: styleDefinitions,
          })
        : null,
    [
      displayBlocks,
      displayPageObjects,
      defaultFontFamily,
      defaultFontSizePt,
      fontsReady,
      pageLayout,
      styleDefinitions,
    ],
  );
  const pages = layoutSnapshot?.pages ?? [];
  const selectedPageObjectId =
    activeDocumentSelection && isNvdPageObjectDocumentSelection(activeDocumentSelection)
      ? activeDocumentSelection.objectId
      : null;

  return (
    <article
      aria-label={`${pages.length} page${pages.length === 1 ? "" : "s"}`}
      className="nvd-editor-paged-document"
      onPointerDown={onActivate}
      style={{
        minHeight:
          pages.length * pageLayoutPx.heightPx +
          Math.max(0, pages.length - 1) * NVD_PAGE_GAP_PX,
        paddingBottom: `${pageLayoutPx.marginBottomPx}px`,
        paddingLeft: `${pageLayoutPx.marginLeftPx}px`,
        paddingRight: `${pageLayoutPx.marginRightPx}px`,
        paddingTop: `${pageLayoutPx.marginTopPx}px`,
        width: `${pageLayoutPx.widthPx}px`,
      }}
    >
      <div className="nvd-paged-page-sheets" aria-hidden="true">
        {pages.map((page) => (
          <span
            className="nvd-paged-page-sheet"
            key={page.index}
            style={{
              height: `${pageLayoutPx.heightPx}px`,
              top: page.index * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX),
              width: `${pageLayoutPx.widthPx}px`,
            }}
          />
        ))}
      </div>
      {layoutSnapshot ? (
        <NvdPagedHostLayer
          assetPointerDragController={pageObjectAssetPointerDragController}
          draftPageObject={draftPageObject}
          layout={layoutSnapshot}
          onAssetPointerDragTargetChange={onPageObjectAssetPointerDragTargetChange}
          onDocumentSelectionRequest={handleDocumentSelectionRequest}
          onDraftPageObjectChange={handleDraftPageObjectChange}
          onPageObjectContextMenu={onPageObjectContextMenu}
          onPageObjectPreviewChange={handlePageObjectPreviewChange}
          onPageObjectSelectionRequest={handlePageObjectSelectionRequest}
          onPageObjectTransformCancel={clearPageObjectPreview}
          onPageObjectTransformCommit={handlePageObjectTransformCommit}
          onPointerInteractionStart={() => {
            infrastructureEditorRef.current?.focusBridge();
          }}
          onTextSelectionRequest={handleTextSelectionRequest}
          pageObjects={displayPageObjects}
          pageObjectToolMode={pageObjectToolMode}
          pageLayout={pageLayout}
          pages={pages}
          selectedPageObjectId={selectedPageObjectId}
        />
      ) : null}
      <NvdPagedObjectLayer
        draftPageObject={null}
        dropTargetPageObjectId={pageObjectAssetPointerDropTargetId}
        pageLayout={pageLayout}
        pageObjects={displayPageObjects}
        selectedPageObjectId={selectedPageObjectId}
        zMode="behind-text"
      />
      {pages.length > 0 ? (
        <NvdPagedTextLayer
          defaultFontFamily={defaultFontFamily}
          defaultFontSizePt={defaultFontSizePt}
          pageLayout={pageLayout}
          pages={pages}
        />
      ) : null}
      <NvdPagedObjectLayer
        draftPageObject={draftPageObject}
        dropTargetPageObjectId={pageObjectAssetPointerDropTargetId}
        pageLayout={pageLayout}
        pageObjects={displayPageObjects}
        selectedPageObjectId={selectedPageObjectId}
        zMode="in-front-of-text"
      />
      {layoutSnapshot ? (
        <NvdPagedSelectionOverlay
          layout={layoutSnapshot}
          pageLayout={pageLayout}
          selection={activeDocumentSelection}
        />
      ) : null}
      <NvdPageRulers
        pageCount={Math.max(1, pages.length)}
        pageGapPx={NVD_PAGE_GAP_PX}
        pageLayout={pageLayout}
        onPageLayoutChange={onPageLayoutChange}
      />
      {!fontsReady ? <NvdPagedFontLoadingDocument pageLayout={pageLayout} /> : null}
      <NvdPagedInfrastructureEditor
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

function NvdPagedFontLoadingDocument({
  pageLayout,
}: {
  pageLayout: ReturnType<typeof getNvdPageLayout>;
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);

  return (
    <div className="nvd-editor-pages absolute inset-0 z-10" aria-label="Loading document fonts">
      <article
        className="nvd-editor-page nvd-editor-page-paged"
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
