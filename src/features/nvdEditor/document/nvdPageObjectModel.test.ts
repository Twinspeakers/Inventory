import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT,
  DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE,
  DEFAULT_NVD_PAGE_OBJECT_ASSET_SCALE,
  DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX,
  DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX,
  MAX_NVD_PAGE_OBJECT_ASSET_SCALE,
  MIN_NVD_PAGE_OBJECT_ASSET_SCALE,
  createNvdAssetFrameObjectFromDraft,
  getNvdPageObjectAssetAlignment,
  getNvdPageObjectAssetFitMode,
  getNvdPageObjectAssetOffsetXPx,
  getNvdPageObjectAssetOffsetYPx,
  getNvdPageObjectAssetScale,
  getNvdPageObjectFramePaddingPx,
  getNvdPageObjectWrapPaddingPx,
  normalizeNvdPageObjects,
} from "./nvdPageObjectModel";

describe("NVD page object model", () => {
  it("creates new asset frames with fit-image defaults", () => {
    const frame = createNvdAssetFrameObjectFromDraft({
      heightPx: 180,
      pageIndex: 0,
      widthPx: 240,
      xPx: 16,
      yPx: 24,
    });

    expect(frame.assetAlignment).toBe(DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT);
    expect(frame.assetFitMode).toBe(DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE);
    expect(frame.assetOffsetXPx).toBe(0);
    expect(frame.assetOffsetYPx).toBe(0);
    expect(frame.assetScale).toBe(DEFAULT_NVD_PAGE_OBJECT_ASSET_SCALE);
    expect(frame.framePaddingPx).toBe(DEFAULT_NVD_PAGE_OBJECT_FRAME_PADDING_PX);
    expect(frame.wrapPaddingPx).toBe(DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX);
  });

  it("normalizes persisted fit-image settings", () => {
    const [frame] = normalizeNvdPageObjects([
      {
        assetAlignment: "elsewhere" as never,
        assetFitMode: "wild" as never,
        assetOffsetXPx: Number.NaN,
        assetOffsetYPx: 12.345,
        assetScale: 200,
        framePaddingPx: -12,
        heightPx: 120,
        id: "frame-1",
        kind: "asset-frame",
        pageIndex: 0,
        wrapPaddingPx: Number.NaN,
        widthPx: 120,
        xPx: 0,
        yPx: 0,
      },
    ]);

    expect(getNvdPageObjectAssetAlignment(frame)).toBe(DEFAULT_NVD_PAGE_OBJECT_ASSET_ALIGNMENT);
    expect(getNvdPageObjectAssetFitMode(frame)).toBe(DEFAULT_NVD_PAGE_OBJECT_ASSET_FIT_MODE);
    expect(getNvdPageObjectAssetOffsetXPx(frame)).toBe(0);
    expect(getNvdPageObjectAssetOffsetYPx(frame)).toBe(12.3);
    expect(getNvdPageObjectAssetScale(frame)).toBe(MAX_NVD_PAGE_OBJECT_ASSET_SCALE);
    expect(getNvdPageObjectFramePaddingPx(frame)).toBe(0);
    expect(getNvdPageObjectWrapPaddingPx(frame)).toBe(DEFAULT_NVD_PAGE_OBJECT_WRAP_PADDING_PX);
  });

  it("clamps scales below the minimum threshold", () => {
    const frame = {
      assetScale: 0.01,
      assetAlignment: "top-left" as const,
      assetFitMode: "cover" as const,
      assetOffsetXPx: -4,
      assetOffsetYPx: 6,
      heightPx: 64,
      id: "frame-2",
      kind: "asset-frame" as const,
      pageIndex: 0,
      widthPx: 64,
      xPx: 0,
      yPx: 0,
    };

    expect(getNvdPageObjectAssetScale(frame)).toBe(MIN_NVD_PAGE_OBJECT_ASSET_SCALE);
  });
});
