import type { NvdTextAlignment } from "../inventoryProject";
import type { NvdDocumentStyleDefinition } from "../inventoryProject";
import { getNvdFontFamily } from "./fonts";
import { getNvdFontSizePt } from "./nvdFontSize";
import { DEFAULT_NVD_LINE_HEIGHT, getNvdLineHeight } from "./nvdLineHeight";
import { DEFAULT_NVD_PARAGRAPH_SPACING_PT, getNvdParagraphSpacingPt } from "./nvdParagraphSpacing";
import { DEFAULT_NVD_CHARACTER_SPACING_PT, getNvdCharacterSpacingPt } from "./nvdCharacterSpacing";

export type NvdStyleRole = "p" | "h1" | "h2" | "h3";

export type NvdStyleDefinition = {
  bold: boolean;
  characterSpacingPt: number;
  fontFamily: string;
  fontSizePt: number;
  italic: boolean;
  label: string;
  lineHeight: number;
  spaceAfterPt: number;
  spaceBeforePt: number;
  role: NvdStyleRole;
  textAlign: NvdTextAlignment;
};

export const NVD_STYLE_ROLES: NvdStyleRole[] = ["p", "h1", "h2", "h3"];

export function getNvdStyleRole(value: string | null | undefined): NvdStyleRole {
  if (NVD_STYLE_ROLES.includes(value as NvdStyleRole)) {
    return value as NvdStyleRole;
  }

  return value === "heading" ? "h1" : "p";
}

export const DEFAULT_NVD_STYLE_DEFINITIONS: Record<NvdStyleRole, NvdStyleDefinition> = {
  p: {
    bold: false,
    characterSpacingPt: DEFAULT_NVD_CHARACTER_SPACING_PT,
    fontFamily: "Google Sans",
    fontSizePt: 12,
    italic: false,
    label: "Paragraph",
    lineHeight: 1.4,
    spaceAfterPt: 8,
    spaceBeforePt: 0,
    role: "p",
    textAlign: "left",
  },
  h1: {
    bold: true,
    characterSpacingPt: DEFAULT_NVD_CHARACTER_SPACING_PT,
    fontFamily: "Google Sans Flex",
    fontSizePt: 36,
    italic: false,
    label: "Heading 1",
    lineHeight: 1.15,
    spaceAfterPt: 12,
    spaceBeforePt: 24,
    role: "h1",
    textAlign: "left",
  },
  h2: {
    bold: true,
    characterSpacingPt: DEFAULT_NVD_CHARACTER_SPACING_PT,
    fontFamily: "Roboto Slab",
    fontSizePt: 24,
    italic: false,
    label: "Heading 2",
    lineHeight: 1.2,
    spaceAfterPt: 8,
    spaceBeforePt: 18,
    role: "h2",
    textAlign: "left",
  },
  h3: {
    bold: true,
    characterSpacingPt: DEFAULT_NVD_CHARACTER_SPACING_PT,
    fontFamily: "Source Serif 4",
    fontSizePt: 16,
    italic: false,
    label: "Heading 3",
    lineHeight: 1.3,
    spaceAfterPt: 6,
    spaceBeforePt: 12,
    role: "h3",
    textAlign: "left",
  },
};

export function getNvdDocumentStyleDefinitions(
  styles: Record<string, NvdDocumentStyleDefinition> | null | undefined,
): Record<NvdStyleRole, NvdStyleDefinition> {
  return Object.fromEntries(
    NVD_STYLE_ROLES.map((role) => {
      const fallback = DEFAULT_NVD_STYLE_DEFINITIONS[role];
      const style = styles?.[role];

      return [
        role,
        {
          bold: style?.bold ?? fallback.bold,
          characterSpacingPt: getNvdCharacterSpacingPt(
            style?.characterSpacingPt ?? fallback.characterSpacingPt,
          ),
          fontFamily: getNvdFontFamily(style?.fontFamily ?? fallback.fontFamily),
          fontSizePt: getNvdFontSizePt(style?.fontSizePt ?? fallback.fontSizePt),
          italic: style?.italic ?? fallback.italic,
          label: style?.label?.trim() || fallback.label,
          lineHeight: getNvdLineHeight(style?.lineHeight ?? fallback.lineHeight),
          spaceAfterPt: getNvdParagraphSpacingPt(style?.spaceAfterPt ?? fallback.spaceAfterPt),
          spaceBeforePt: getNvdParagraphSpacingPt(style?.spaceBeforePt ?? fallback.spaceBeforePt),
          role,
          textAlign: getPersistedNvdTextAlignment(style?.textAlign, fallback.textAlign),
        },
      ];
    }),
  ) as Record<NvdStyleRole, NvdStyleDefinition>;
}

function getPersistedNvdTextAlignment(
  value: string | null | undefined,
  fallback: NvdTextAlignment,
): NvdTextAlignment {
  return value === "left" || value === "center" || value === "right" || value === "justify"
    ? value
    : fallback;
}
