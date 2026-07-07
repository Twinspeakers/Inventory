import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_CHARACTER_SPACING_PT,
  MAX_NVD_CHARACTER_SPACING_PT,
  MIN_NVD_CHARACTER_SPACING_PT,
  getNvdCharacterSpacingPt,
} from "./nvdCharacterSpacing";

describe("NVD character spacing", () => {
  it("defaults invalid values, reads point values, and clamps expanded or condensed text", () => {
    expect(getNvdCharacterSpacingPt(undefined)).toBe(DEFAULT_NVD_CHARACTER_SPACING_PT);
    expect(getNvdCharacterSpacingPt("not a number")).toBe(DEFAULT_NVD_CHARACTER_SPACING_PT);
    expect(getNvdCharacterSpacingPt("-10pt")).toBe(MIN_NVD_CHARACTER_SPACING_PT);
    expect(getNvdCharacterSpacingPt("2.5pt")).toBe(2.5);
    expect(getNvdCharacterSpacingPt(30)).toBe(MAX_NVD_CHARACTER_SPACING_PT);
  });
});
