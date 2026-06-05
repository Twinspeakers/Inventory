import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_PARAGRAPH_SPACING_PT,
  MAX_NVD_PARAGRAPH_SPACING_PT,
  getNvdParagraphSpacingPt,
} from "./nvdParagraphSpacing";

describe("NVD paragraph spacing", () => {
  it("defaults invalid values, reads point values, and clamps custom values", () => {
    expect(getNvdParagraphSpacingPt(undefined)).toBe(DEFAULT_NVD_PARAGRAPH_SPACING_PT);
    expect(getNvdParagraphSpacingPt("not a number")).toBe(DEFAULT_NVD_PARAGRAPH_SPACING_PT);
    expect(getNvdParagraphSpacingPt("-4")).toBe(0);
    expect(getNvdParagraphSpacingPt("18pt")).toBe(18);
    expect(getNvdParagraphSpacingPt(200)).toBe(MAX_NVD_PARAGRAPH_SPACING_PT);
  });
});
