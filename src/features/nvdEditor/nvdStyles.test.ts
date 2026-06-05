import { describe, expect, it } from "vitest";
import {
  DEFAULT_NVD_STYLE_DEFINITIONS,
  NVD_STYLE_ROLES,
  getNvdDocumentStyleDefinitions,
} from "./nvdStyles";

describe("NVD semantic style definitions", () => {
  it("provides one valid default definition for every supported role", () => {
    expect(NVD_STYLE_ROLES).toEqual(["p", "h1", "h2", "h3"]);

    NVD_STYLE_ROLES.forEach((role) => {
      const definition = DEFAULT_NVD_STYLE_DEFINITIONS[role];

      expect(definition.role).toBe(role);
      expect(definition.characterSpacingPt).toBe(0);
      expect(definition.fontFamily.length).toBeGreaterThan(0);
      expect(definition.fontSizePt).toBeGreaterThan(0);
      expect(definition.lineHeight).toBeGreaterThan(0);
      expect(definition.spaceAfterPt).toBeGreaterThanOrEqual(0);
      expect(definition.spaceBeforePt).toBeGreaterThanOrEqual(0);
    });
  });

  it("defaults paragraphs to Google Sans", () => {
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.p.fontFamily).toBe("Google Sans");
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.p.lineHeight).toBe(1.4);
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.p.spaceAfterPt).toBe(8);
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.p.spaceBeforePt).toBe(0);
  });

  it("gives headings a descending document rhythm", () => {
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.h1).toMatchObject({
      lineHeight: 1.15,
      spaceAfterPt: 12,
      spaceBeforePt: 24,
    });
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.h2).toMatchObject({
      lineHeight: 1.2,
      spaceAfterPt: 8,
      spaceBeforePt: 18,
    });
    expect(DEFAULT_NVD_STYLE_DEFINITIONS.h3).toMatchObject({
      lineHeight: 1.3,
      spaceAfterPt: 6,
      spaceBeforePt: 12,
    });
  });

  it("hydrates saved document styles while safely defaulting missing roles", () => {
    const styles = getNvdDocumentStyleDefinitions({
      h1: {
        bold: false,
        characterSpacingPt: 24,
        fontFamily: "Caveat",
        fontSizePt: 42,
        italic: true,
        label: "Hero",
        lineHeight: 9,
        spaceAfterPt: 18,
        spaceBeforePt: 6,
        role: "h1",
        textAlign: "center",
      },
    });

    expect(styles.h1).toMatchObject({
      bold: false,
      characterSpacingPt: 20,
      fontFamily: "Caveat",
      fontSizePt: 42,
      italic: true,
      label: "Hero",
      lineHeight: 4,
      spaceAfterPt: 18,
      spaceBeforePt: 6,
      role: "h1",
      textAlign: "center",
    });
    expect(styles.h2).toEqual(DEFAULT_NVD_STYLE_DEFINITIONS.h2);
  });

  it("uses role-specific defaults for missing values in a partial saved style", () => {
    const styles = getNvdDocumentStyleDefinitions({
      h1: {
        bold: false,
        fontFamily: "Caveat",
        fontSizePt: 42,
        italic: true,
        label: "Hero",
        role: "h1",
        textAlign: "center",
      },
    });

    expect(styles.h1).toMatchObject({
      characterSpacingPt: DEFAULT_NVD_STYLE_DEFINITIONS.h1.characterSpacingPt,
      lineHeight: DEFAULT_NVD_STYLE_DEFINITIONS.h1.lineHeight,
      spaceAfterPt: DEFAULT_NVD_STYLE_DEFINITIONS.h1.spaceAfterPt,
      spaceBeforePt: DEFAULT_NVD_STYLE_DEFINITIONS.h1.spaceBeforePt,
    });
  });
});
