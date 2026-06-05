import { findNvdFontDefinition } from "./nvdFonts";

const MAX_RECENT_NVD_FONTS = 6;
const recentNvdFontsStorageKey = "inventory.nvd.recentFontFamilies";

export function readRecentNvdFontFamilies() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedFamilies = JSON.parse(window.localStorage.getItem(recentNvdFontsStorageKey) ?? "[]");

    if (!Array.isArray(storedFamilies)) {
      return [];
    }

    return normalizeRecentFontFamilies(storedFamilies);
  } catch {
    return [];
  }
}

export function rememberRecentNvdFontFamily(fontFamily: string) {
  const font = findNvdFontDefinition(fontFamily);

  if (!font || typeof window === "undefined") {
    return readRecentNvdFontFamilies();
  }

  const nextFamilies = normalizeRecentFontFamilies([
    font.family,
    ...readRecentNvdFontFamilies(),
  ]);

  try {
    window.localStorage.setItem(recentNvdFontsStorageKey, JSON.stringify(nextFamilies));
  } catch {
    // Recent fonts are a convenience; document editing can continue without them.
  }

  return nextFamilies;
}

function normalizeRecentFontFamilies(fontFamilies: unknown[]) {
  const normalizedFamilies: string[] = [];

  for (const fontFamily of fontFamilies) {
    if (typeof fontFamily !== "string") {
      continue;
    }

    const font = findNvdFontDefinition(fontFamily);

    if (!font || normalizedFamilies.includes(font.family)) {
      continue;
    }

    normalizedFamilies.push(font.family);

    if (normalizedFamilies.length >= MAX_RECENT_NVD_FONTS) {
      break;
    }
  }

  return normalizedFamilies;
}
