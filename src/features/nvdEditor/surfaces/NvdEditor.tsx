import { useMemo } from "react";
import { FileText } from "lucide-react";
import type {
  NvdDocument,
  NvdTextRun,
  OpenedNvdDocument,
} from "../../inventoryProject";
import { getNvdFontFamily, useNvdFontsReady } from "../fonts";
import { getNvdFontSizePt } from "../primitives/nvdFontSize";
import { getNvdDocumentStyleDefinitions } from "../core/nvdStyles";
import { getNvdLayoutMode } from "../layout/nvdLayout";
import { NvdA4PageEditorSurface } from "./NvdA4PageEditorSurface";
import { NvdPagelessEditorSurface } from "./NvdPagelessEditorSurface";
import { clampNvdPageLayout, getNvdPageLayout } from "../layout/nvdPageLayout";
import type { NvdEditorController } from "../adapters/NvdRichTextEditor";
import {
  createNvdDocumentBlocks,
  getNvdDocumentBlockLayouts,
  getNvdDocumentFontFamilies,
  getNvdDocumentRuns,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "../core/nvdRichText";

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
  const pageLayout = getNvdPageLayout(document.pageLayout);

  function updateRuns(nextRuns: NvdTextRun[], nextBlockLayouts = blockLayouts) {
    onDocumentChange({
      ...document,
      fontFamily,
      fontSize: `${fontSizePt}pt`,
      layoutMode,
      blocks: createNvdDocumentBlocks(nextRuns, document.blocks, nextBlockLayouts),
    });
  }

  function updatePageLayout(nextPageLayout: ReturnType<typeof getNvdPageLayout>) {
    onDocumentChange({
      ...document,
      fontFamily,
      fontSize: `${fontSizePt}pt`,
      layoutMode,
      pageLayout: clampNvdPageLayout(nextPageLayout),
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
          pageLayout={pageLayout}
          onPageLayoutChange={updatePageLayout}
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
  layoutMode: "a4" | "pageless";
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

  if (layoutMode === "a4") {
    return (
      <NvdA4PageEditorSurface
        defaultFontFamily={defaultFontFamily}
        defaultFontSizePt={defaultFontSizePt}
        documentPath={documentPath}
        fontFamilies={fontFamilies}
        pageLayout={pageLayout}
        onPageLayoutChange={onPageLayoutChange}
        onActivate={onActivate}
        onControllerChange={onControllerChange}
        onRunsChange={onRunsChange}
        onSelectionChange={onSelectionChange}
        runs={runs}
        blockLayouts={blockLayouts}
      />
    );
  }

  return (
    <NvdPagelessEditorSurface
      defaultFontFamily={defaultFontFamily}
      defaultFontSizePt={defaultFontSizePt}
      documentPath={documentPath}
      onActivate={onActivate}
      onControllerChange={onControllerChange}
      onRunsChange={onRunsChange}
      onSelectionChange={onSelectionChange}
      runs={runs}
      blockLayouts={blockLayouts}
    />
  );
}
