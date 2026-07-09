import { useMemo } from "react";
import { FileText } from "lucide-react";
import type {
  NvdBlock,
  NvdDocument,
  NvdTextRun,
  OpenedNvdDocument,
} from "../../inventoryProject";
import { getNvdFontFamily, useNvdFontsReady } from "../fonts";
import { getNvdFontSizePt } from "../primitives/nvdFontSize";
import { getNvdDocumentStyleDefinitions } from "../document/nvdStyles";
import { NvdA4PageEditorSurface } from "./NvdA4PageEditorSurface";
import { clampNvdPageLayout, getNvdPageLayout } from "../layout/nvdPageLayout";
import type { NvdEditorController } from "../adapters/NvdRichTextEditor";
import {
  createNvdDocumentBlocks,
  getNvdDocumentBlockLayouts,
  getNvdDocumentFontFamilies,
  getNvdDocumentRuns,
  type NvdBlockLayout,
  type NvdTextSelection,
} from "../document/nvdRichText";

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
  const styleDefinitions = getNvdDocumentStyleDefinitions(document.styles);
  const paragraphStyle = styleDefinitions.p;
  const runs = getNvdDocumentRuns(document);
  const blockLayouts = getNvdDocumentBlockLayouts(document);
  const fontFamilies = getNvdDocumentFontFamilies(document);
  const pageLayout = getNvdPageLayout(document.pageLayout);

  function updateBlocks(nextBlocks: NvdBlock[]) {
    onDocumentChange({
      ...document,
      fontFamily,
      fontSize: `${fontSizePt}pt`,
      layoutMode: "a4",
      blocks: nextBlocks,
    });
  }

  function updatePageLayout(nextPageLayout: ReturnType<typeof getNvdPageLayout>) {
    onDocumentChange({
      ...document,
      fontFamily,
      fontSize: `${fontSizePt}pt`,
      layoutMode: "a4",
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
          pageLayout={pageLayout}
          onPageLayoutChange={updatePageLayout}
          onActivate={onActivate}
          onControllerChange={onControllerChange}
          onBlocksChange={updateBlocks}
          onSelectionChange={onSelectionChange}
          blocks={document.blocks}
          runs={runs}
          blockLayouts={blockLayouts}
          styleDefinitions={styleDefinitions}
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
  styleDefinitions: ReturnType<typeof getNvdDocumentStyleDefinitions>;
}) {
  const fontsReady = useNvdFontsReady(fontFamilies);

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
      onBlocksChange={onBlocksChange}
      onSelectionChange={onSelectionChange}
      blocks={blocks}
      runs={runs}
      blockLayouts={blockLayouts}
      styleDefinitions={styleDefinitions}
    />
  );
}
