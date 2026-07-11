import { describe, expect, it } from "vitest";
import {
  hsvaToRgba,
  normalizeNvdFrameBackgroundColor,
  parseNvdFrameBackgroundColor,
  rgbaToHsva,
  toNvdFrameBackgroundColor,
} from "./frameColorUtils";

describe("frame color utils", () => {
  it("normalizes six-digit colors to uppercase hex with alpha", () => {
    expect(normalizeNvdFrameBackgroundColor("#cc8855")).toBe("#CC8855FF");
    expect(normalizeNvdFrameBackgroundColor("#11223344")).toBe("#11223344");
    expect(normalizeNvdFrameBackgroundColor("rgba(0,0,0,0.5)")).toBeNull();
  });

  it("round-trips rgba colors through hsva", () => {
    const rgba = parseNvdFrameBackgroundColor("#CC885580");
    const hsva = rgbaToHsva(rgba);
    const roundTrip = hsvaToRgba(hsva);

    expect(toNvdFrameBackgroundColor(roundTrip)).toBe("#CC885580");
  });
});
