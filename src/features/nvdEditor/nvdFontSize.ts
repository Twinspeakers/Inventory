export const DEFAULT_NVD_FONT_SIZE_PT = 12;
export const MIN_NVD_FONT_SIZE_PT = 6;
export const MAX_NVD_FONT_SIZE_PT = 144;

export const NVD_FONT_SIZE_PRESETS_PT = [
  6,
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  18,
  24,
  36,
  48,
  72,
  96,
  144,
] as const;

export function getNvdFontSizePt(fontSize: string | number | null | undefined) {
  const parsedSize = parseNvdFontSizePt(fontSize);
  return parsedSize ?? DEFAULT_NVD_FONT_SIZE_PT;
}

export function normalizeNvdFontSizePt(fontSize: string | number | null | undefined) {
  return clampNvdFontSizePt(getNvdFontSizePt(fontSize));
}

export function getNvdFontSizeCssValue(fontSize: string | number | null | undefined) {
  return `${normalizeNvdFontSizePt(fontSize)}pt`;
}

export function getNvdFontSizePx(fontSize: string | number | null | undefined) {
  return getNvdFontSizePt(fontSize) * (4 / 3);
}

export function clampNvdFontSizePt(fontSizePt: number) {
  return Math.min(Math.max(Math.round(fontSizePt), MIN_NVD_FONT_SIZE_PT), MAX_NVD_FONT_SIZE_PT);
}

function parseNvdFontSizePt(fontSize: string | number | null | undefined) {
  if (typeof fontSize === "number") {
    return Number.isFinite(fontSize) ? fontSize : null;
  }

  const normalizedSize = fontSize?.trim().toLowerCase();

  if (!normalizedSize) {
    return null;
  }

  const numericSize = Number.parseFloat(normalizedSize);

  if (!Number.isFinite(numericSize)) {
    return null;
  }

  if (normalizedSize.endsWith("px")) {
    return numericSize * 0.75;
  }

  return numericSize;
}
