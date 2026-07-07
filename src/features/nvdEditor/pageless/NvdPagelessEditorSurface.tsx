import type { NvdTextRun } from "../../inventoryProject";
import { NvdRichTextEditor, type NvdEditorController } from "../adapters/NvdRichTextEditor";
import type { NvdBlockLayout, NvdTextSelection } from "../document/nvdRichText";

export function NvdPagelessEditorSurface({
  defaultFontFamily,
  defaultFontSizePt,
  documentPath,
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
  onActivate: () => void;
  onControllerChange: (controller: NvdEditorController) => void;
  onRunsChange: (runs: NvdTextRun[], blockLayouts?: NvdBlockLayout[]) => void;
  onSelectionChange: (selection: NvdTextSelection) => void;
  runs: NvdTextRun[];
  blockLayouts: NvdBlockLayout[];
}) {
  return (
    <article
      className="nvd-editor-pageless-document"
      onPointerDown={onActivate}
    >
      <NvdRichTextEditor
        ariaLabel="Document text"
        autoFocus
        className="nvd-rich-text-content-pageless"
        defaultFontFamily={defaultFontFamily}
        defaultFontSizePt={defaultFontSizePt}
        documentKey={documentPath}
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
