import { useEffect, useState } from "react";
import type { NvdPageObject, NvdPageLayout } from "../../inventoryProject";
import { NVD_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import {
  getNvdPageObjectBounds,
  getNvdPageObjectRotationDeg,
  type NvdDraftPageObject,
} from "../document/nvdPageObjectModel";
import { getAssetFileUrl } from "../../../sceneReaders/previewIo";
import {
  getNvdPageObjectAssetPreviewStyle,
  getNvdPageObjectAssetPreviewViewportStyle,
  isSupportedPageObjectAssetPreviewPath,
  type NvdPageObjectAssetNaturalSize,
} from "./nvdPageObjectAssetPreview";

export function NvdPagedObjectLayer({
  dropTargetPageObjectId,
  draftPageObject,
  pageLayout,
  pageObjects,
  selectedPageObjectId,
  zMode,
}: {
  dropTargetPageObjectId: string | null;
  draftPageObject: NvdDraftPageObject | null;
  pageLayout: NvdPageLayout;
  pageObjects: readonly NvdPageObject[];
  selectedPageObjectId: string | null;
  zMode: "behind-text" | "in-front-of-text";
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const filteredPageObjects = pageObjects.filter(
    (pageObject) => (pageObject.zMode ?? "in-front-of-text") === zMode,
  );
  const shouldRenderDraft = zMode === "in-front-of-text" && draftPageObject;

  if (filteredPageObjects.length === 0 && !shouldRenderDraft) {
    return null;
  }

  return (
    <div
      className={`nvd-paged-object-layer ${
        zMode === "behind-text"
          ? "nvd-paged-object-layer-behind"
          : "nvd-paged-object-layer-front"
      }`}
      aria-hidden="true"
    >
      {filteredPageObjects.map((pageObject) => (
        <div
          className={`nvd-paged-object-frame ${
            pageObject.id === selectedPageObjectId ? "nvd-paged-object-frame-selected" : ""
          } ${
            pageObject.id === dropTargetPageObjectId ? "nvd-paged-object-frame-drop-target" : ""
          }`}
          key={pageObject.id}
          style={getObjectStyle(pageObject, pageLayoutPx)}
        >
          <div
            className="nvd-paged-object-frame-body"
            style={getObjectBodyStyle(pageObject)}
          >
            {shouldRenderObjectAssetPreview(pageObject) ? (
              <FrameAssetPreview
                pageObject={pageObject}
                selected={pageObject.id === selectedPageObjectId}
              />
            ) : null}
            <div className="nvd-paged-object-frame-badge">
              {pageObject.asset?.assetName?.trim() || "Frame"}
            </div>
            {pageObject.id === selectedPageObjectId ? (
              <div className="nvd-paged-object-frame-handles">
                <span className="nvd-paged-object-frame-rotation-stem" />
                <span className="nvd-paged-object-frame-rotation-handle" />
                {[
                  "nw",
                  "n",
                  "ne",
                  "e",
                  "se",
                  "s",
                  "sw",
                  "w",
                ].map((handle) => (
                  <span
                    className={`nvd-paged-object-frame-handle nvd-paged-object-frame-handle-${handle}`}
                    key={handle}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      {shouldRenderDraft ? (
        <div
          className="nvd-paged-object-frame nvd-paged-object-frame-draft"
          style={getObjectStyle(draftPageObject, pageLayoutPx)}
        >
          <div className="nvd-paged-object-frame-badge">Selection</div>
        </div>
      ) : null}
    </div>
  );
}

function FrameAssetPreview({
  pageObject,
  selected,
}: {
  pageObject: NvdPageObject;
  selected: boolean;
}) {
  const assetPath = pageObject.asset?.assetPath;
  const assetUrl = assetPath ? getAssetFileUrl(assetPath) : null;
  const [naturalSize, setNaturalSize] = useState<NvdPageObjectAssetNaturalSize | null>(null);

  useEffect(() => {
    if (!assetUrl) {
      setNaturalSize(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setNaturalSize({
          heightPx: image.naturalHeight || 0,
          widthPx: image.naturalWidth || 0,
        });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setNaturalSize(null);
      }
    };
    image.src = assetUrl;

    return () => {
      cancelled = true;
    };
  }, [assetUrl]);

  if (!assetUrl) {
    return null;
  }

  return (
    <div className="nvd-paged-object-frame-preview">
      <div
        className="nvd-paged-object-frame-preview-image"
        style={getNvdPageObjectAssetPreviewStyle(pageObject, assetUrl, naturalSize)}
      />
      {selected ? (
        <div
          className="nvd-paged-object-frame-padding-guide"
          style={getNvdPageObjectAssetPreviewViewportStyle(pageObject)}
        />
      ) : null}
    </div>
  );
}

function getObjectStyle(
  pageObject: Pick<NvdPageObject, "heightPx" | "pageIndex" | "rotationDeg" | "widthPx" | "xPx" | "yPx">,
  pageLayoutPx: ReturnType<typeof getNvdPageLayoutPx>,
) {
  const bounds = getNvdPageObjectBounds(pageObject);

  return {
    height: `${bounds.bottomPx - bounds.topPx}px`,
    left: `${pageLayoutPx.marginLeftPx + bounds.leftPx}px`,
    top: `${
      pageObject.pageIndex * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) +
      pageLayoutPx.marginTopPx +
      bounds.topPx
    }px`,
    width: `${bounds.rightPx - bounds.leftPx}px`,
  };
}

function getObjectBodyStyle(
  pageObject: Pick<NvdPageObject, "heightPx" | "rotationDeg" | "widthPx" | "xPx" | "yPx">,
) {
  const bounds = getNvdPageObjectBounds(pageObject);

  return {
    height: `${pageObject.heightPx}px`,
    left: `${pageObject.xPx - bounds.leftPx}px`,
    top: `${pageObject.yPx - bounds.topPx}px`,
    transform: `rotate(${getNvdPageObjectRotationDeg(pageObject)}deg)`,
    width: `${pageObject.widthPx}px`,
  };
}

function shouldRenderObjectAssetPreview(pageObject: NvdPageObject) {
  return isSupportedPageObjectAssetPreviewPath(pageObject.asset?.assetPath);
}
