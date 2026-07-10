import type {
  NvdAssetFrameObject,
  NvdPageObjectAsset,
  NvdPageObject,
} from "../../inventoryProject";

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
    heightPx: normalizePositiveSize(draft.heightPx),
    id: createNvdPageObjectId(),
    kind: "asset-frame",
    pageIndex: Math.max(0, Math.floor(draft.pageIndex)),
    rotationDeg: 0,
    widthPx: normalizePositiveSize(draft.widthPx),
    wrapMode: "none",
    wrapPaddingPx: 12,
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

export function getNvdPageObjectRotationDeg(pageObject: Pick<NvdPageObject, "rotationDeg">) {
  return normalizeRotationDeg(pageObject.rotationDeg);
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
  clonedPageObject.rotationDeg = normalizeRotationDeg(clonedPageObject.rotationDeg);
  return clonedPageObject;
}

function createNvdPageObjectId() {
  return `object-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePositiveSize(value: number) {
  return Math.max(1, Math.floor(value));
}

function normalizeRotationDeg(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalizedValue = (((value ?? 0) % 360) + 360) % 360;
  return normalizedValue > 180 ? normalizedValue - 360 : normalizedValue;
}
