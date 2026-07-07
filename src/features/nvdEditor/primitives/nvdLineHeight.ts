export const DEFAULT_NVD_LINE_HEIGHT = 1.75;
export const MIN_NVD_LINE_HEIGHT = 0.75;
export const MAX_NVD_LINE_HEIGHT = 4;

export function getNvdLineHeight(value: number | string | null | undefined) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_NVD_LINE_HEIGHT;
  }

  return Math.min(Math.max(parsedValue, MIN_NVD_LINE_HEIGHT), MAX_NVD_LINE_HEIGHT);
}
