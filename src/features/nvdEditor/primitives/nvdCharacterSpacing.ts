export const DEFAULT_NVD_CHARACTER_SPACING_PT = 0;
export const MIN_NVD_CHARACTER_SPACING_PT = -5;
export const MAX_NVD_CHARACTER_SPACING_PT = 20;

export function getNvdCharacterSpacingPt(value: number | string | null | undefined) {
  const parsedValue = typeof value === "number" ? value : Number.parseFloat(value ?? "");

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_NVD_CHARACTER_SPACING_PT;
  }

  return Math.min(
    Math.max(parsedValue, MIN_NVD_CHARACTER_SPACING_PT),
    MAX_NVD_CHARACTER_SPACING_PT,
  );
}
