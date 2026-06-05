import type { ReactNode, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ChevronDown } from "lucide-react";
import { readPreviewBytes } from "./previewIo";

export type PdfDocumentAsset = {
  path: string;
};

export function PdfPreview({ asset }: { asset: PdfDocumentAsset }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState("Loading PDF...");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    setDocumentProxy(null);
    setPageNumber(1);
    setZoom(1);
    setMessage("Loading PDF...");

    async function loadPdf() {
      try {
        const [pdfjsLib, workerModule, fileBytes] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.mjs?url"),
          readPreviewBytes(asset.path),
        ]);

        if (cancelled) {
          return;
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
        loadingTask = pdfjsLib.getDocument({ data: fileBytes });
        const pdf = await loadingTask.promise;

        if (cancelled) {
          void pdf.cleanup();
          return;
        }

        setDocumentProxy(pdf);
        setMessage("");
      } catch (error) {
        if (!cancelled) {
          setMessage(`Could not render PDF: ${String(error)}`);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();

      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [asset.path]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    const canvas = canvasRef.current;
    const pdf = documentProxy;

    async function renderPage() {
      try {
        renderTaskRef.current?.cancel();
        setMessage("Rendering page...");

        const page = await pdf.getPage(pageNumber);

        if (cancelled) {
          return;
        }

        const parentWidth = canvas.parentElement?.clientWidth ?? 760;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.35, Math.min(2.2, (parentWidth - 32) / baseViewport.width));
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          setMessage("Could not create a canvas context for the PDF.");
          return;
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          setMessage("");
        }
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
          setMessage(`Could not render page: ${String(error)}`);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [documentProxy, pageNumber, zoom]);

  const pageCount = documentProxy?.numPages ?? 0;
  const canGoToPreviousPage = Boolean(documentProxy && pageNumber > 1);
  const canGoToNextPage = Boolean(documentProxy && pageNumber < pageCount);

  function goToPreviousPage() {
    setPageNumber((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setPageNumber((page) => Math.min(pageCount, page + 1));
  }

  function handlePdfWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom((value) => clampNumber(Number((value * zoomFactor).toFixed(3)), 0.35, 4));
  }

  return (
    <div className="relative h-full min-h-full bg-preview">
      <div className="h-full min-h-0 overflow-auto bg-preview p-6" onWheel={handlePdfWheel}>
        {message ? <div className="mb-3 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-muted">{message}</div> : null}
        <div className="flex min-h-full justify-center pb-16 pt-10">
          <canvas className="h-fit max-w-none rounded-sm bg-white shadow-soft" ref={canvasRef} />
        </div>
      </div>
      <button
        aria-label="Previous PDF page"
        className="icon-button absolute left-1/2 top-3 z-20 -translate-x-1/2 shadow-soft"
        disabled={!canGoToPreviousPage}
        onClick={goToPreviousPage}
        title="Previous page"
      >
        <ChevronDown className="rotate-180" size={16} aria-hidden="true" />
      </button>
      <button
        aria-label="Next PDF page"
        className="icon-button absolute bottom-3 left-1/2 z-20 -translate-x-1/2 shadow-soft"
        disabled={!canGoToNextPage}
        onClick={goToNextPage}
        title="Next page"
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-sm border border-line bg-surface/90 px-2 py-1 text-xs font-medium text-muted shadow-soft">
        {pageCount > 0 ? `${pageNumber} / ${pageCount}` : "- / -"} / {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export function PdfThumbnail({ asset, fallback }: { asset: PdfDocumentAsset; fallback: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function renderThumbnail() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      try {
        const [pdfjsLib, workerModule, fileBytes] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.mjs?url"),
          readPreviewBytes(asset.path),
        ]);

        if (cancelled) {
          return;
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
        loadingTask = pdfjsLib.getDocument({ data: fileBytes });
        const documentProxy = await loadingTask.promise;
        const page = await documentProxy.getPage(1);

        if (cancelled) {
          void documentProxy.cleanup();
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 260;
        const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
        const context = canvas.getContext("2d");

        if (!context) {
          setFailed(true);
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        void documentProxy.cleanup();

        if (!cancelled) {
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void renderThumbnail();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [asset.path]);

  if (failed) {
    return fallback;
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-line bg-preview">
      <canvas className="max-h-full max-w-full bg-white shadow-soft" ref={canvasRef} />
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
