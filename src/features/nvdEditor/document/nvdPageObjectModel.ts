import type {
  NvdAssetFrameObject,
  NvdPageObjectAssetAlignment,
  NvdPageObjectAssetDisplayUpdate,
  NvdPageObjectAsset,
  NvdPageObjectAssetFitMode,
  NvdPageObjectFrameUpdate,
  NvdPageObject,
} from "../../inventoryProject";

export const DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE: NvdPageObjectAssetFitMode = "contain";
export const DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT: NvdPageObjectAssetAlignment = "center";
export const DEFAULT_NVD_PAGE_OBJECT_ASSET_SCALE = 1;
export const DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX = 12;
export const DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX = 12;
export const MIN_NVD_PAGE_OBJECT_ASSET_SCALE = 0.25;
export const MAX_NVD_PAGE_OBJECT_ASSET_SCALE = 4;

export type NvdPageObjectBounds = {
  bottomPx: number;
  leftPx: number;
  rightPx: number;
  topPx: number;
};

export type NvdDraftPageObject = {
  pageIndex: number;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
};

export function createNvdAssetFrameObjectFromDraft(
  draft: NvdDraftPageObject,
): NvdAssetFrameObject {
  return {
    assetAlignment: DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT,
    assetFitMode: DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE,
    assetOffsetXPx: 0,
    assetOffsetYPx: 0,
    assetScale: DEFAULT_NVD_PAGE_OBJECT_ASSET_SCALE,
    framePaddingPx: DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX,
    heightPx: normalizePositiveSize(draft.heightPx),
    id: createNvdPageObjectId(),
    kind: "asset-frame",
    pageIndex: Math.max(0, Math.floor(draft.pageIndex)),
    rotationDeg: 0,
    widthPx: normalizePositiveSize(draft.widthPx),
    wrapMode: "none",
    wrapPaddingPx: DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX,
    xPx: Math.max(0, Math.floor(draft.xPx)),
    yPx: Math.max(0, Math.floor(draft.yPx)),
    zMode: "in-front-of-text",
  };
}

export function normalizeNvdPageObjects(
  pageObjects: readonly NvdPageObject[] | null | undefined,
) {
  return pageObjects ? pageObjects.map(normalizePageObject) : [];
}

export function findNvdPageObjectById(
  pageObjects: readonly NvdPageObject[],
  objectId: string,
) {
  return pageObjects.find((pageObject) => pageObject.id === objectId) ?? null;
}

export function insertNvdPageObject(
  pageObjects: readonly NvdPageObject[],
  pageObject: NvdPageObject,
) {
  return [...pageObjects, clonePageObject(pageObject)];
}

export function removeNvdPageObjectById(
  pageObjects: readonly NvdPageObject[],
  objectId: string,
) {
  return pageObjects.filter((pageObject) => pageObject.id !== objectId);
}

export function updateNvdPageObjectById(
  pageObjects: readonly NvdPageObject[],
  objectId: string,
  update: (pageObject: NvdPageObject) => NvdPageObject,
) {
  return pageObjects.map((pageObject) =>
    pageObject.id === objectId ? clonePageObject(update(clonePageObject(pageObject))) : clonePageObject(pageObject),
  );
}

export function createNvdPageObjectAsset(payload: {
  assetId: number;
  assetKind?: string;
  assetName: string;
  assetPath: string;
  sourceDocumentKind?: string;
}): NvdPageObjectAsset {
  return {
    assetId: payload.assetId,
    assetKind: payload.assetKind ?? "image",
    assetName: payload.assetName,
    assetPath: payload.assetPath,
    sourceDocumentKind: payload.sourceDocumentKind,
  };
}

export function applyNvdPageObjectAssetDisplayUpdate(
  pageObject: NvdPageObject,
  updates: NvdPageObjectAssetDisplayUpdate,
) {
  return normalizePageObject({
    ...clonePageObject(pageObject),
    ...updates,
  });
}

export function applyNvdPageObjectFrameUpdate(
  pageObject: NvdPageObject,
  updates: NvdPageObjectFrameUpdate,
) {
  return normalizePageObject({
    ...clonePageObject(pageObject),
    ...updates,
  });
}

export function getNvdPageObjectRotationDeg(pageObject: Pick<NvdPageObject, "rotationDeg">) {
  return normalizeRotationDeg(pageObject.rotationDeg);
}

export function getNvdPageObjectAssetFitMode(
  pageObject: Pick<NvdPageObject, "assetFitMode">,
) {
  return normalizeAssetFitMode(pageObject.assetFitMode);
}

export function getNvdPageObjectAssetAlignment(
  pageObject: Pick<NvdPageObject, "assetAlignment">,
) {
  return normalizeAssetAlignment(pageObject.assetAlignment);
}

export function getNvdPageObjectAssetScale(
  pageObject: Pick<NvdPageObject, "assetScale">,
) {
  return normalizeAssetScale(pageObject.assetScale);
}

export function getNvdPageObjectAssetOffsetXPx(
  pageObject: Pick<NvdPageObject, "assetOffsetXPx">,
) {
  return normalizeAssetOffsetPx(pageObject.assetOffsetXPx);
}

export function getNvdPageObjectAssetOffsetYPx(
  pageObject: Pick<NvdPageObject, "assetOffsetYPx">,
) {
  return normalizeAssetOffsetPx(pageObject.assetOffsetYPx);
}

export function getNvdPageObjectFramePaddingPx(
  pageObject: Pick<NvdPageObject, "framePaddingPx">,
) {
  return normalizePaddingPx(
    pageObject.framePaddingPx,
    DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX,
  );
}

export function getNvdPageObjectWrapPaddingPx(
  pageObject: Pick<NvdPageObject, "wrapPaddingPx">,
) {
  return normalizePaddingPx(
    pageObject.wrapPaddingPx,
    DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX,
  );
}

export function getNvdPageObjectBounds(pageObject: Pick<NvdPageObject, "heightPx" | "rotationDeg" | "widthPx" | "xPx" | "yPx">): NvdPageObjectBounds {
  const rotationDeg = getNvdPageObjectRotationDeg(pageObject);

  if (rotationDeg === 0) {
    return {
      bottomPx: pageObject.yPx + pageObject.heightPx,
      leftPx: pageObject.xPx,
      rightPx: pageObject.xPx + pageObject.widthPx,
      topPx: pageObject.yPx,
    };
  }

  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidthPx = pageObject.widthPx / 2;
  const halfHeightPx = pageObject.heightPx / 2;
  const centerX = pageObject.xPx + halfWidthPx;
  const centerY = pageObject.yPx + halfHeightPx;
  const corners = [
    { x: -halfWidthPx, y: -halfHeightPx },
    { x: halfWidthPx, y: -halfHeightPx },
    { x: halfWidthPx, y: halfHeightPx },
    { x: -halfWidthPx, y: halfHeightPx },
  ].map(({ x, y }) => ({
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  }));
  const xValues = corners.map((corner) => corner.x);
  const yValues = corners.map((corner) => corner.y);

  return {
    bottomPx: Math.max(...yValues),
    leftPx: Math.min(...xValues),
    rightPx: Math.max(...xValues),
    topPx: Math.min(...yValues),
  };
}

function clonePageObject(pageObject: NvdPageObject): NvdPageObject {
  return JSON.parse(JSON.stringify(pageObject)) as NvdPageObject;
}

function normalizePageObject(pageObject: NvdPageObject) {
  const clonedPageObject = clonePageObject(pageObject);
  clonedPageObject.assetAlignment = normalizeAssetAlignment(clonedPageObject.assetAlignment);
  clonedPageObject.assetFitMode = normalizeAssetFitMode(clonedPageObject.assetFitMode);
  clonedPageObject.assetOffsetXPx = normalizeAssetOffsetPx(clonedPageObject.assetOffsetXPx);
  clonedPageObject.assetOffsetYPx = normalizeAssetOffsetPx(clonedPageObject.assetOffsetYPx);
  clonedPageObject.assetScale = normalizeAssetScale(clonedPageObject.assetScale);
  clonedPageObject.framePaddingPx = normalizePaddingPx(
    clonedPageObject.framePaddingPx,
    DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX,
  );
  clonedPageObject.heightPx = normalizePositiveSize(clonedPageObject.heightPx);
  clonedPageObject.pageIndex = normalizePageIndex(clonedPageObject.pageIndex);
  clonedPageObject.rotationDeg = normalizeRotationDeg(clonedPageObject.rotationDeg);
  clonedPageObject.widthPx = normalizePositiveSize(clonedPageObject.widthPx);
  clonedPageObject.wrapPaddingPx = normalizePaddingPx(
    clonedPageObject.wrapPaddingPx,
    DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX,
  );
  clonedPageObject.xPx = normalizePositionPx(clonedPageObject.xPx);
  clonedPageObject.yPx = normalizePositionPx(clonedPageObject.yPx);
  return clonedPageObject;
}

function createNvdPageObjectId() {
  return `object-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePositiveSize(value: number) {
  return Math.max(1, Math.floor(value));
}

function normalizePageIndex(value: number) {
  return Math.max(0, Math.floor(value));
}

function normalizePositionPx(value: number) {
  return Math.max(0, Math.floor(value));
}

function normalizeRotationDeg(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalizedValue = (((value ?? 0) % 360) + 360) % 360;
  return normalizedValue > 180 ? normalizedValue - 360 : normalizedValue;
}

function normalizeAssetFitMode(value: NvdPageObjectAssetFitMode | undefined) {
  return ["contain", "cover", "stretch", "tile"].includes(value ?? "")
    ? (value as NvdPageObjectAssetFitMode)
    : DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE;
}

function normalizeAssetAlignment(value: NvdPageObjectAssetAlignment | undefined) {
  return value === "top-left" ? "top-left" : DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT;
}

function normalizeAssetScale(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return DEFAULT_NVD_PAGE_OBJECT_ASSET_SCALE;
  }

  return Math.min(MAX_NVD_PAGE_OBJECT_ASSET_SCALE, Math.max(MIN_NVD_PAGE_OBJECT_ASSET_SCALE, value ?? 1));
}

function normalizeAssetOffsetPx(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value ?? 0) * 10) / 10;
}

function normalizePaddingPx(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value ?? fallback));
}
