import { describe, expect, it } from "vitest";
import {
  getNvdPageObjectAssetPreviewStyle,
  getNvdPageObjectAssetPreviewViewportStyle,
  isSupportedPageObjectAssetPreviewPath,
} from "./nvdPageObjectAssetPreview";

describe("NVD page object asset preview", () => {
  it("centers contained artwork and applies manual offsets", () => {
    const style = getNvdPageObjectAssetPreviewStyle(
      {
        assetAlignment: "center",
        assetFitMode: "contain",
        assetOffsetXPx: 12,
        assetOffsetYPx: -6,
        assetScale: 1,
        heightPx: 200,
        widthPx: 300,
      },
      "asset://image.jpg",
      { heightPx: 100, widthPx: 100 },
    );

    expect(style.left).toBe("12px");
    expect(style.top).toBe("12px");
    expect(style.width).toBe("276px");
    expect(style.height).toBe("176px");
    expect(style.backgroundSize).toBe("176px 176px");
    expect(style.backgroundPosition).toBe("62px -6px");
    expect(style.backgroundRepeat).toBe("no-repeat");
  });

  it("repeats tiled artwork at the scaled native size", () => {
    const style = getNvdPageObjectAssetPreviewStyle(
      {
        assetAlignment: "top-left",
        assetFitMode: "tile",
        assetOffsetXPx: 8,
        assetOffsetYPx: 10,
        assetScale: 1.5,
        heightPx: 160,
        widthPx: 240,
      },
      "asset://image.jpg",
      { heightPx: 60, widthPx: 40 },
    );

    expect(style.backgroundSize).toBe("60px 90px");
    expect(style.backgroundPosition).toBe("8px 10px");
    expect(style.backgroundRepeat).toBe("repeat");
  });

  it("insets the preview into the frame padding area", () => {
    const style = getNvdPageObjectAssetPreviewStyle(
      {
        assetAlignment: "center",
        assetFitMode: "contain",
        assetOffsetXPx: 0,
        assetOffsetYPx: 0,
        assetScale: 1,
        framePaddingPx: 12,
        heightPx: 200,
        widthPx: 300,
      },
      "asset://image.jpg",
      { heightPx: 100, widthPx: 100 },
    );

    expect(style.left).toBe("12px");
    expect(style.top).toBe("12px");
    expect(style.width).toBe("276px");
    expect(style.height).toBe("176px");
    expect(style.backgroundSize).toBe("176px 176px");
    expect(style.backgroundPosition).toBe("50px 0px");
  });

  it("exposes the padded viewport bounds for selection guides", () => {
    const style = getNvdPageObjectAssetPreviewViewportStyle({
      framePaddingPx: 12,
      heightPx: 200,
      widthPx: 300,
    });

    expect(style.left).toBe("12px");
    expect(style.top).toBe("12px");
    expect(style.width).toBe("276px");
    expect(style.height).toBe("176px");
  });

  it("accepts the supported raster and vector preview file types", () => {
    expect(isSupportedPageObjectAssetPreviewPath("horse.JPG")).toBe(true);
    expect(isSupportedPageObjectAssetPreviewPath("graphic.svg")).toBe(true);
    expect(isSupportedPageObjectAssetPreviewPath("clip.psd")).toBe(false);
  });
});
