export const DEFAULT_NVD_ZOOM_PERCENT = 100;

export const NVD_ZOOM_PRESETS_PERCENT = [
  50,
  67,
  75,
  80,
  90,
  100,
  110,
  125,
  150,
  175,
  200,
] as const;

export function normalizeNvdZoomPercent(value: number) {
  return NVD_ZOOM_PRESETS_PERCENT.reduce((closest, preset) =>
    Math.abs(preset - value) < Math.abs(closest - value) ? preset : closest,
  );
}

export function stepNvdZoomPercent(value: number, direction: "in" | "out") {
  const normalizedValue = normalizeNvdZoomPercent(value);
  const currentIndex = NVD_ZOOM_PRESETS_PERCENT.indexOf(normalizedValue);
  const nextIndex = direction === "in"
    ? Math.min(NVD_ZOOM_PRESETS_PERCENT.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  return NVD_ZOOM_PRESETS_PERCENT[nextIndex];
}
