import type { NvdPageObject, NvdPageLayout } from "../../inventoryProject";
import { NVD_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import {
  getNvdPageObjectBounds,
  getNvdPageObjectRotationDeg,
  type NvdDraftPageObject,
} from "../document/nvdPageObjectModel";
import { getAssetFileUrl } from "../../../sceneReaders/previewIo";

export function NvdPagedObjectLayer({
  draftPageObject,
  pageLayout,
  pageObjects,
  selectedPageObjectId,
  zMode,
}: {
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
          }`}
          key={pageObject.id}
          style={getObjectStyle(pageObject, pageLayoutPx)}
        >
          <div
            className="nvd-paged-object-frame-body"
            style={getObjectBodyStyle(pageObject)}
          >
            {shouldRenderObjectAssetPreview(pageObject) ? (
              <img
                alt=""
                className="nvd-paged-object-frame-preview"
                draggable={false}
                src={getAssetFileUrl(pageObject.asset!.assetPath)}
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
  const assetPath = pageObject.asset?.assetPath;

  if (!assetPath) {
    return false;
  }

  return ["avif", "gif", "jpg", "jpeg", "png", "svg", "webp"].includes(
    getPathExtension(assetPath),
  );
}

function getPathExtension(path: string) {
  const segments = path.split(/[\\/]/);
  const fileName = segments[segments.length - 1] ?? "";
  const extension = fileName.split(".").pop() ?? "";
  return extension.toLowerCase();
}
