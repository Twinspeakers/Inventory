import { describe, expect, it } from "vitest";
import { normalizeNvvZoomPercent, stepNvvZoomPercent } from "./nvvZoom";

describe("NVV zoom presets", () => {
  it("normalizes and steps through vector zoom presets", () => {
    expect(normalizeNvvZoomPercent(112)).toBe(100);
    expect(stepNvvZoomPercent(100, "in")).toBe(125);
    expect(stepNvvZoomPercent(100, "out")).toBe(75);
    expect(stepNvvZoomPercent(400, "in")).toBe(400);
    expect(stepNvvZoomPercent(25, "out")).toBe(25);
  });
});
