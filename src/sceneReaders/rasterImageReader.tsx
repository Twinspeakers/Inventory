import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { getImageMimeType, readPreviewBytes, toArrayBuffer } from "./previewIo";

export type RasterImageAsset = {
  extension: string;
  name: string;
  path: string;
};

type PanOffset = {
  x: number;
  y: number;
};

export function RasterImagePreview({ asset }: { asset: RasterImageAsset }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [decodeErrorMessage, setDecodeErrorMessage] = useState<string | null>(null);
  const { errorMessage, imageUrl, isLoading } = useRasterImageObjectUrl(asset);
  const dragStartRef = useRef<{ offsetX: number; offsetY: number; pointerId: number; x: number; y: number } | null>(null);
  const message = errorMessage ?? decodeErrorMessage ?? (isLoading ? "Loading image..." : "");

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDecodeErrorMessage(null);
    dragStartRef.current = null;
  }, [asset.path]);

  useEffect(() => {
    return () => {
      dragStartRef.current = null;
    };
  }, [asset.path]);

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.12 : 0.12;
    setScale((value) => clampNumber(Number((value * (1 + zoomDelta)).toFixed(3)), 0.1, 8));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      offsetX: offset.x,
      offsetY: offset.y,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;

    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: dragStart.offsetX + event.clientX - dragStart.x,
      y: dragStart.offsetY + event.clientY - dragStart.y,
    });
  }

  function stopPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  return (
    <div
      className="transparent-checkerboard transparent-preview relative h-full min-h-full overflow-hidden"
      onPointerCancel={stopPan}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPan}
      onWheel={handleWheel}
    >
      {imageUrl && !decodeErrorMessage ? (
        <img
          alt={asset.name}
          className="absolute left-1/2 top-1/2 max-h-[82%] max-w-[82%] select-none object-contain"
          draggable={false}
          src={imageUrl}
          style={{
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
          onError={() => {
            setDecodeErrorMessage(`Could not render image: .${asset.extension} is not supported by the preview renderer yet.`);
          }}
        />
      ) : null}
      {message ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-sm border border-line bg-surface/90 px-3 py-2 text-center text-sm font-medium text-muted shadow-soft">
          {message}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-sm border border-line bg-surface/90 px-2 py-1 text-xs font-medium text-muted shadow-soft">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

export function RasterImageThumbnail({ asset, fallback }: { asset: RasterImageAsset; fallback: ReactNode }) {
  const [decodeFailed, setDecodeFailed] = useState(false);
  const { errorMessage, imageUrl } = useRasterImageObjectUrl(asset);

  useEffect(() => {
    setDecodeFailed(false);
  }, [asset.path]);

  if (errorMessage || decodeFailed) {
    return fallback;
  }

  return (
    <div className="transparent-checkerboard relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-line">
      {imageUrl ? (
        <img
          alt=""
          className="max-h-[84%] max-w-[84%] object-contain"
          loading="lazy"
          src={imageUrl}
          onError={() => setDecodeFailed(true)}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function useRasterImageObjectUrl(asset: RasterImageAsset) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setErrorMessage(null);
    setIsLoading(true);

    async function loadImage() {
      try {
        const bytes = await readPreviewBytes(asset.path);
        const nextUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: getImageMimeType(asset.extension) }));

        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        objectUrl = nextUrl;
        setImageUrl(nextUrl);
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`Could not render image: ${String(error)}`);
          setIsLoading(false);
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [asset.extension, asset.path]);

  return { errorMessage, imageUrl, isLoading };
}

function isPrimaryPointer(event: ReactPointerEvent<HTMLElement>) {
  return event.isPrimary && (event.pointerType !== "mouse" || event.button === 0);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
