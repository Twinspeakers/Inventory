import { useMemo } from "react";
import { FileText } from "lucide-react";
import type {
  NvdDocument,
  NvdTextRun,
  OpenedNvdDocument,
} from "../inventoryProject";
import { getNvdFontFamily, useNvdFontsReady } from "./fonts";
import { getNvdFontSizePt } from "./nvdFontSize";
import { getNvdDocumentStyleDefinitions } from "./nvdStyles";
import {
  getNvdLayoutMode,
  getNvdA4PageBreaks,
  NVD_A4_PAGE_GAP_PX,
  NVD_A4_PAGE_HEIGHT_PX,
  paginateNvdTextRuns,
} from "./nvdLayout";
import { NvdRichTextEditor, type NvdEditorController } from "./NvdRichTextEditor";
import {
  createNvdDocumentBlocks,
  getNvdDocumentBlockLayouts,
  getNvdDocumentFontFamilies,
  getNvdDocumentRuns,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "./nvdRichText";

export function NvdEditor({
  openedDocument,
  onActivate,
  onControllerChange,
  onDocumentChange,
  onSelectionChange,
  zoomPercent,
}: {
  openedDocument: OpenedNvdDocument | null;
  onActivate: () => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onDocumentChange: (document: NvdDocument) => void;
  onSelectionChange: (selection: NvdTextSelection) => void;
  zoomPercent: number;
}) {
  if (!openedDocument) {
    return (
      <div className="nvd-editor-stage">
        <div className="nvd-editor-empty">
          <FileText size={42} strokeWidth={1.4} aria-hidden="true" />
          <h2>NVD Workspace</h2>
          <p>No NVD document is open.</p>
        </div>
      </div>
    );
  }

  const { document } = openedDocument;
  const fontFamily = getNvdFontFamily(document.fontFamily);
  const fontSizePt = getNvdFontSizePt(document.fontSize);
  const paragraphStyle = getNvdDocumentStyleDefinitions(document.styles).p;
  const layoutMode = getNvdLayoutMode(document.layoutMode);
  const runs = getNvdDocumentRuns(document);
  const blockLayouts = getNvdDocumentBlockLayouts(document);
  const fontFamilies = getNvdDocumentFontFamilies(document);

  function updateRuns(nextRuns: NvdTextRun[], nextBlockLayouts = blockLayouts) {
    onDocumentChange({
      ...document,
      fontFamily,
      fontSize: `${fontSizePt}pt`,
      layoutMode,
      blocks: createNvdDocumentBlocks(nextRuns, document.blocks, nextBlockLayouts),
    });
  }

  return (
    <div className="nvd-editor-stage">
      <div className="nvd-editor-layout" style={{ zoom: `${zoomPercent}%` }}>
        <NvdDocumentSurface
          defaultFontFamily={paragraphStyle.fontFamily}
          defaultFontSizePt={paragraphStyle.fontSizePt}
          documentPath={openedDocument.path}
          fontFamilies={fontFamilies}
          layoutMode={layoutMode}
          onActivate={onActivate}
          onControllerChange={onControllerChange}
          onRunsChange={updateRuns}
          onSelectionChange={onSelectionChange}
          runs={runs}
          blockLayouts={blockLayouts}
        />
      </div>
    </div>
  );
}

function NvdDocumentSurface({
  defaultFontFamily,
  defaultFontSizePt,
  documentPath,
  fontFamilies,
  layoutMode,
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
  layoutMode: "a4" | "pageless";
  onActivate: () => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onRunsChange: (runs: NvdTextRun[], blockLayouts?: NvdBlockLayout[]) => void;
  onSelectionChange: (selection: NvdTextSelection) => void;
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
}) {
  const fontsReady = useNvdFontsReady(fontFamilies);
  const isA4 = layoutMode === "a4";
  const pages = useMemo(
    () =>
      isA4 && fontsReady
        ? paginateNvdTextRuns(runs, defaultFontFamily, defaultFontSizePt, blockLayouts)
        : [],
    [blockLayouts, defaultFontFamily, defaultFontSizePt, fontsReady, isA4, runs],
  );

  return (
    <article
      aria-label={isA4 ? `${pages.length} A4 page${pages.length === 1 ? "" : "s"}` : undefined}
      className={isA4 ? "nvd-editor-a4-document" : "nvd-editor-page nvd-editor-page-pageless"}
      onPointerDown={onActivate}
      style={
        isA4
          ? {
              minHeight:
                pages.length * NVD_A4_PAGE_HEIGHT_PX +
                Math.max(0, pages.length - 1) * NVD_A4_PAGE_GAP_PX,
            }
          : undefined
      }
    >
      {isA4 ? (
        <div className="nvd-a4-page-sheets" aria-hidden="true">
          {pages.map((page) => (
            <span
              className="nvd-a4-page-sheet"
              key={page.index}
              style={{
                top: page.index * (NVD_A4_PAGE_HEIGHT_PX + NVD_A4_PAGE_GAP_PX),
              }}
            />
          ))}
        </div>
      ) : null}
      {isA4 && !fontsReady ? <NvdA4FontLoadingDocument /> : null}
      <NvdRichTextEditor
        ariaLabel="Document text"
        autoFocus
        className={isA4 ? "nvd-rich-text-content-a4-continuous" : "nvd-rich-text-content-pageless"}
        defaultFontFamily={defaultFontFamily}
        defaultFontSizePt={defaultFontSizePt}
        documentKey={documentPath}
        pageBreaks={isA4 ? getNvdA4PageBreaks(pages) : []}
        onActivate={onActivate}
        onControllerChange={onControllerChange}
        onRunsChange={(nextRuns, _selection, nextBlockLayouts) =>
          onRunsChange(nextRuns, nextBlockLayouts)
        }
        onSelectionChange={onSelectionChange}
        runs={runs}
        blockLayouts={blockLayouts}
      />
    </article>
  );
}

function NvdA4FontLoadingDocument() {
  return (
    <div className="nvd-editor-pages absolute inset-0 z-10" aria-label="Loading document fonts">
      <article className="nvd-editor-page nvd-editor-page-a4">
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
