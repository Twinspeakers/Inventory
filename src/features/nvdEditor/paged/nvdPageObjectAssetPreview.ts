import type { CSSProperties } from "react";
import type { NvdPageObject } from "../../inventoryProject";
import {
  getNvdPageObjectAssetAlignment,
  getNvdPageObjectAssetFitMode,
  getNvdPageObjectAssetOffsetXPx,
  getNvdPageObjectAssetOffsetYPx,
  getNvdPageObjectAssetScale,
  getNvdPageObjectFramePaddingPx,
} from "../document/nvdPageObjectModel";

export type NvdPageObjectAssetNaturalSize = {
  heightPx: number;
  widthPx: number;
};

type NvdPageObjectAssetViewport = {
  heightPx: number;
  leftPx: number;
  topPx: number;
  paddingPx: number;
  widthPx: number;
};

export function getNvdPageObjectAssetPreviewViewportStyle(
  pageObject: Pick<NvdPageObject, "framePaddingPx" | "heightPx" | "widthPx">,
): CSSProperties {
  const viewport = getPreviewViewport(pageObject);

  return {
    height: `${viewport.heightPx}px`,
    left: `${viewport.leftPx}px`,
    top: `${viewport.topPx}px`,
    width: `${viewport.widthPx}px`,
  };
}

export function getNvdPageObjectAssetPreviewStyle(
  pageObject: Pick<
    NvdPageObject,
    | "assetAlignment"
    | "assetFitMode"
    | "assetOffsetXPx"
    | "assetOffsetYPx"
    | "assetScale"
    | "framePaddingPx"
    | "heightPx"
    | "widthPx"
  >,
  assetUrl: string,
  naturalSize: NvdPageObjectAssetNaturalSize | null,
): CSSProperties {
  const alignment = getNvdPageObjectAssetAlignment(pageObject);
  const fitMode = getNvdPageObjectAssetFitMode(pageObject);
  const offsetXPx = getNvdPageObjectAssetOffsetXPx(pageObject);
  const offsetYPx = getNvdPageObjectAssetOffsetYPx(pageObject);
  const scale = getNvdPageObjectAssetScale(pageObject);
  const viewport = getPreviewViewport(pageObject);
  const baseStyle: CSSProperties = {
    backgroundImage: `url("${assetUrl.replace(/"/g, '\\"')}")`,
    height: `${viewport.heightPx}px`,
    left: `${viewport.leftPx}px`,
    top: `${viewport.topPx}px`,
    width: `${viewport.widthPx}px`,
  };

  if (!naturalSize || naturalSize.widthPx <= 0 || naturalSize.heightPx <= 0) {
    return {
      ...baseStyle,
      backgroundPosition: getFallbackBackgroundPosition(alignment, offsetXPx, offsetYPx),
      backgroundRepeat: fitMode === "tile" ? "repeat" : "no-repeat",
      backgroundSize: getFallbackBackgroundSize(viewport, fitMode, scale),
    };
  }

  const size = getRenderedAssetSize(viewport, naturalSize, fitMode, scale);
  const position = getRenderedAssetPosition(viewport, size, alignment, offsetXPx, offsetYPx);

  return {
    ...baseStyle,
    backgroundPosition: `${position.xPx}px ${position.yPx}px`,
    backgroundRepeat: fitMode === "tile" ? "repeat" : "no-repeat",
    backgroundSize: `${size.widthPx}px ${size.heightPx}px`,
  };
}

export function isSupportedPageObjectAssetPreviewPath(assetPath: string | null | undefined) {
  if (!assetPath) {
    return false;
  }

  return ["avif", "gif", "jpg", "jpeg", "png", "svg", "webp"].includes(
    getPathExtension(assetPath),
  );
}

function getPreviewViewport(
  pageObject: Pick<NvdPageObject, "framePaddingPx" | "heightPx" | "widthPx">,
): NvdPageObjectAssetViewport {
  const paddingPx = getNvdPageObjectFramePaddingPx(pageObject);
  const maximumPaddingPx = Math.max(0, (Math.min(pageObject.widthPx, pageObject.heightPx) - 1) / 2);
  const resolvedPaddingPx = Math.min(paddingPx, maximumPaddingPx);

  return {
    heightPx: roundPreviewPx(Math.max(1, pageObject.heightPx - resolvedPaddingPx * 2)),
    leftPx: roundPreviewPx(resolvedPaddingPx),
    paddingPx: roundPreviewPx(resolvedPaddingPx),
    topPx: roundPreviewPx(resolvedPaddingPx),
    widthPx: roundPreviewPx(Math.max(1, pageObject.widthPx - resolvedPaddingPx * 2)),
  };
}

function getRenderedAssetSize(
  viewport: Pick<NvdPageObjectAssetNaturalSize, "heightPx" | "widthPx">,
  naturalSize: NvdPageObjectAssetNaturalSize,
  fitMode: ReturnType<typeof getNvdPageObjectAssetFitMode>,
  scale: number,
) {
  if (fitMode === "stretch") {
    return {
      heightPx: roundPreviewPx(viewport.heightPx * scale),
      widthPx: roundPreviewPx(viewport.widthPx * scale),
    };
  }

  if (fitMode === "tile") {
    return {
      heightPx: roundPreviewPx(naturalSize.heightPx * scale),
      widthPx: roundPreviewPx(naturalSize.widthPx * scale),
    };
  }

  const widthRatio = viewport.widthPx / naturalSize.widthPx;
  const heightRatio = viewport.heightPx / naturalSize.heightPx;
  const fitRatio = fitMode === "cover" ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);
  const scaledRatio = fitRatio * scale;

  return {
    heightPx: roundPreviewPx(naturalSize.heightPx * scaledRatio),
    widthPx: roundPreviewPx(naturalSize.widthPx * scaledRatio),
  };
}

function getRenderedAssetPosition(
  viewport: Pick<NvdPageObjectAssetNaturalSize, "heightPx" | "widthPx">,
  renderedSize: NvdPageObjectAssetNaturalSize,
  alignment: ReturnType<typeof getNvdPageObjectAssetAlignment>,
  offsetXPx: number,
  offsetYPx: number,
) {
  const baseXPx = alignment === "top-left" ? 0 : (viewport.widthPx - renderedSize.widthPx) / 2;
  const baseYPx = alignment === "top-left" ? 0 : (viewport.heightPx - renderedSize.heightPx) / 2;

  return {
    xPx: roundPreviewPx(baseXPx + offsetXPx),
    yPx: roundPreviewPx(baseYPx + offsetYPx),
  };
}

function getFallbackBackgroundPosition(
  alignment: ReturnType<typeof getNvdPageObjectAssetAlignment>,
  offsetXPx: number,
  offsetYPx: number,
) {
  if (alignment === "top-left") {
    return `${offsetXPx}px ${offsetYPx}px`;
  }

  return `calc(50% + ${offsetXPx}px) calc(50% + ${offsetYPx}px)`;
}

function getFallbackBackgroundSize(
  viewport: Pick<NvdPageObjectAssetNaturalSize, "heightPx" | "widthPx">,
  fitMode: ReturnType<typeof getNvdPageObjectAssetFitMode>,
  scale: number,
) {
  if (fitMode === "contain" || fitMode === "cover") {
    return fitMode;
  }

  if (fitMode === "stretch") {
    return `${roundPreviewPx(viewport.widthPx * scale)}px ${roundPreviewPx(viewport.heightPx * scale)}px`;
  }

  return `${roundPreviewPx(Math.max(24, viewport.widthPx * 0.42 * scale))}px auto`;
}

function getPathExtension(path: string) {
  const segments = path.split(/[\\/]/);
  const fileName = segments[segments.length - 1] ?? "";
  const extension = fileName.split(".").pop() ?? "";
  return extension.toLowerCase();
}

function roundPreviewPx(value: number) {
  return Math.round(value * 10) / 10;
}
