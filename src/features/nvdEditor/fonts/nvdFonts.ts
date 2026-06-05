export type NvdFontCategory = "sans-serif" | "serif" | "monospace" | "handwriting" | "display";
export type NvdFontSource = "bundled" | "system";

export type NvdFontDefinition = {
  category: NvdFontCategory;
  family: string;
  source: NvdFontSource;
};

export type NvdFontMenuGroups = {
  available: NvdFontDefinition[];
  recent: NvdFontDefinition[];
};

export const DEFAULT_NVD_FONT_FAMILY = "Inter";

export const BUNDLED_NVD_FONTS = sortFonts([
  { family: "Archivo", category: "sans-serif", source: "bundled" },
  { family: "Barlow Semi Condensed", category: "sans-serif", source: "bundled" },
  { family: "Caveat", category: "handwriting", source: "bundled" },
  { family: "DM Sans", category: "sans-serif", source: "bundled" },
  { family: "Google Sans", category: "sans-serif", source: "bundled" },
  { family: "Google Sans Flex", category: "sans-serif", source: "bundled" },
  { family: "Inter", category: "sans-serif", source: "bundled" },
  { family: "JetBrains Mono", category: "monospace", source: "bundled" },
  { family: "Libre Baskerville", category: "serif", source: "bundled" },
  { family: "Literata", category: "serif", source: "bundled" },
  { family: "Lora", category: "serif", source: "bundled" },
  { family: "Merriweather", category: "serif", source: "bundled" },
  { family: "Press Start 2P", category: "display", source: "bundled" },
  { family: "Roboto Condensed", category: "sans-serif", source: "bundled" },
  { family: "Roboto Slab", category: "serif", source: "bundled" },
  { family: "Source Sans 3", category: "sans-serif", source: "bundled" },
  { family: "Source Serif 4", category: "serif", source: "bundled" },
] satisfies NvdFontDefinition[]);

export const SYSTEM_NVD_FONTS = sortFonts([
  { family: "Arial", category: "sans-serif", source: "system" },
  { family: "Calibri", category: "sans-serif", source: "system" },
  { family: "Courier", category: "monospace", source: "system" },
  { family: "Tahoma", category: "sans-serif", source: "system" },
  { family: "Times New Roman", category: "serif", source: "system" },
  { family: "Verdana", category: "sans-serif", source: "system" },
] satisfies NvdFontDefinition[]);

export const NVD_FONTS = sortFonts([...BUNDLED_NVD_FONTS, ...SYSTEM_NVD_FONTS]);

const nvdFontsByFamily = new Map(NVD_FONTS.map((font) => [font.family.toLocaleLowerCase(), font]));

export function findNvdFontDefinition(fontFamily: string | null | undefined) {
  const normalizedFamily = fontFamily?.trim().toLocaleLowerCase();
  return normalizedFamily ? nvdFontsByFamily.get(normalizedFamily) ?? null : null;
}

export function getNvdFontFamily(fontFamily: string | null | undefined) {
  const family = unwrapCssFontFamilyName(fontFamily?.trim());
  return findNvdFontDefinition(family)?.family ?? (family || DEFAULT_NVD_FONT_FAMILY);
}

export function getNvdFontCssFamilyName(fontFamily: string | null | undefined) {
  return JSON.stringify(getNvdFontFamily(fontFamily));
}

export function getNvdFontCssStack(fontFamily: string | null | undefined) {
  const family = getNvdFontFamily(fontFamily);
  const font = findNvdFontDefinition(family);
  const genericFamily = getGenericFontFamily(font?.category ?? "sans-serif");

  return `${JSON.stringify(family)}, ${genericFamily}`;
}

export function getNvdFontMenuGroups(recentFontFamilies: string[]): NvdFontMenuGroups {
  const recent = recentFontFamilies
    .map((fontFamily) => findNvdFontDefinition(fontFamily))
    .filter((font): font is NvdFontDefinition => font !== null);
  const recentFamilies = new Set(recent.map((font) => font.family));

  return {
    recent,
    available: NVD_FONTS.filter((font) => !recentFamilies.has(font.family)),
  };
}

function getGenericFontFamily(category: NvdFontCategory) {
  switch (category) {
    case "serif":
      return "ui-serif, Georgia, serif";
    case "monospace":
      return "ui-monospace, SFMono-Regular, Consolas, monospace";
    case "handwriting":
      return "cursive";
    case "display":
      return "sans-serif";
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}

function sortFonts(fonts: NvdFontDefinition[]) {
  return [...fonts].sort((left, right) => left.family.localeCompare(right.family));
}

function unwrapCssFontFamilyName(fontFamily: string | undefined) {
  if (!fontFamily || fontFamily.length < 2) {
    return fontFamily ?? "";
  }

  const firstCharacter = fontFamily[0];
  const lastCharacter = fontFamily[fontFamily.length - 1];

  if (firstCharacter === `"` && lastCharacter === `"`) {
    try {
      const parsedFamily = JSON.parse(fontFamily);
      return typeof parsedFamily === "string" ? parsedFamily : fontFamily;
    } catch {
      return fontFamily.slice(1, -1);
    }
  }

  if (firstCharacter === "'" && lastCharacter === "'") {
    return fontFamily.slice(1, -1).replace(/\\'/g, "'");
  }

  return fontFamily;
}
