import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_LINE_HEIGHT,
  MAX_NVD_LINE_HEIGHT,
  MIN_NVD_LINE_HEIGHT,
  getNvdLineHeight,
} from "./nvdLineHeight";

describe("NVD line height", () => {
  it("defaults invalid values and clamps custom values", () => {
    expect(getNvdLineHeight(undefined)).toBe(DEFAULT_NVD_LINE_HEIGHT);
    expect(getNvdLineHeight("not a number")).toBe(DEFAULT_NVD_LINE_HEIGHT);
    expect(getNvdLineHeight(0.2)).toBe(MIN_NVD_LINE_HEIGHT);
    expect(getNvdLineHeight(8)).toBe(MAX_NVD_LINE_HEIGHT);
    expect(getNvdLineHeight("2.25")).toBe(2.25);
  });
});
