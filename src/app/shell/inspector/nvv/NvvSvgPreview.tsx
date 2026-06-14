import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { NvvDocument } from "../../../../features/inventoryProject";
import { getNvvDocumentSvg } from "../../../../features/nvvEditor";

export function NvvSvgPreview({ document }: { document: NvvDocument }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<NvvDocument | null>(null);
  const isStale = Boolean(preview && previewDocument !== document);

  useEffect(() => {
    setPreview(null);
    setPreviewDocument(null);
  }, [document.createdAtUnix, document.title]);

  function refreshPreview() {
    setPreview(getNvvDocumentSvg(document));
    setPreviewDocument(document);
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="section-label">SVG Preview</div>
        <button className="nvv-svg-preview-refresh" type="button" onClick={refreshPreview}>
          <RefreshCw size={12} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>
      {preview ? (
        <>
          {isStale ? <p className="nvv-svg-preview-note">Preview may be out of date.</p> : null}
          <pre className="nvv-svg-preview-code" aria-label={`${document.title} SVG preview`}>
            <code>{preview}</code>
          </pre>
        </>
      ) : (
        <div className="nvv-svg-preview-empty">Refresh to generate SVG markup.</div>
      )}
    </section>
  );
}
