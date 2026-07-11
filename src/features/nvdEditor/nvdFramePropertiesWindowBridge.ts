import type {
  NvdPageObjectAssetAlignment,
  NvdPageObjectAssetDisplayUpdate,
  NvdPageObjectAssetFitMode,
  NvdPageObjectFrameUpdate,
  NvdPageObjectWrapMode,
  NvdPageObjectZMode,
} from "../inventoryProject";

export const NVD_FRAME_PROPERTIES_WINDOW_LABEL = "nvd-frame-properties";
export const NVD_FRAME_PROPERTIES_WINDOW_ROUTE_PARAM = "nvd-frame-properties-window";
export const NVD_FRAME_PROPERTIES_WINDOW_READY_EVENT = "nvd-frame-properties:ready";
export const NVD_FRAME_PROPERTIES_WINDOW_STATE_EVENT = "nvd-frame-properties:state";
export const NVD_FRAME_PROPERTIES_WINDOW_SET_DISPLAY_MODE_EVENT = "nvd-frame-properties:set-display-mode";
export const NVD_FRAME_PROPERTIES_WINDOW_UPDATE_IMAGE_FIT_EVENT = "nvd-frame-properties:update-image-fit";
export const NVD_FRAME_PROPERTIES_WINDOW_UPDATE_DIMENSIONS_EVENT = "nvd-frame-properties:update-dimensions";
export const NVD_FRAME_PROPERTIES_WINDOW_SET_WRAP_MODE_EVENT = "nvd-frame-properties:set-wrap-mode";
export const NVD_FRAME_PROPERTIES_WINDOW_SET_Z_MODE_EVENT = "nvd-frame-properties:set-z-mode";
export type NvdFramePropertiesWindowDisplayMode = "behind-text" | "in-front-of-text" | "text-wrap";

export type NvdFramePropertiesWindowFrameSnapshot = {
  assetAlignment: NvdPageObjectAssetAlignment;
  assetFitMode: NvdPageObjectAssetFitMode;
  assetOffsetXPx: number;
  assetOffsetYPx: number;
  assetScale: number;
  assetName: string | null;
  framePaddingPx: number;
  heightPx: number;
  id: string;
  pageIndex: number;
  rotationDeg: number;
  wrapMode: NvdPageObjectWrapMode;
  wrapPaddingPx: number;
  widthPx: number;
  xPx: number;
  yPx: number;
  zMode: NvdPageObjectZMode;
};

export type NvdFramePropertiesWindowStatePayload = {
  documentTitle: string | null;
  frame: NvdFramePropertiesWindowFrameSnapshot | null;
  pageCount: number;
};

export type NvdFramePropertiesWindowSetWrapModePayload = {
  objectId: string;
  wrapMode: NvdPageObjectWrapMode;
};

export type NvdFramePropertiesWindowSetDisplayModePayload = {
  mode: NvdFramePropertiesWindowDisplayMode;
  objectId: string;
};

export type NvdFramePropertiesWindowUpdateImageFitPayload = {
  objectId: string;
  updates: NvdPageObjectAssetDisplayUpdate;
};

export type NvdFramePropertiesWindowUpdateDimensionsPayload = {
  objectId: string;
  updates: NvdPageObjectFrameUpdate;
};

export type NvdFramePropertiesWindowSetZModePayload = {
  objectId: string;
  zMode: NvdPageObjectZMode;
};

export function isNvdFramePropertiesWindowRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get(NVD_FRAME_PROPERTIES_WINDOW_ROUTE_PARAM) === "1";
}

export function buildNvdFramePropertiesWindowUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(NVD_FRAME_PROPERTIES_WINDOW_ROUTE_PARAM, "1");
  return url.toString();
}
