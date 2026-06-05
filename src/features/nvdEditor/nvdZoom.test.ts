import { describe, expect, it } from "vitest";
import { normalizeNvdZoomPercent, stepNvdZoomPercent } from "./nvdZoom";

describe("NVD zoom presets", () => {
  it("normalizes arbitrary values to the nearest preset", () => {
    expect(normalizeNvdZoomPercent(117)).toBe(110);
    expect(normalizeNvdZoomPercent(121)).toBe(125);
  });

  it("steps through presets and stops at the limits", () => {
    expect(stepNvdZoomPercent(100, "in")).toBe(110);
    expect(stepNvdZoomPercent(100, "out")).toBe(90);
    expect(stepNvdZoomPercent(200, "in")).toBe(200);
    expect(stepNvdZoomPercent(50, "out")).toBe(50);
  });
});
