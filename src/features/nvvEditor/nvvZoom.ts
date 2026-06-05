export const DEFAULT_NVV_ZOOM_PERCENT = 100;

export const NVV_ZOOM_PRESETS_PERCENT = [
  25,
  50,
  75,
  100,
  125,
  150,
  200,
  300,
  400,
] as const;

export function normalizeNvvZoomPercent(value: number) {
  return NVV_ZOOM_PRESETS_PERCENT.reduce((closest, preset) =>
    Math.abs(preset - value) < Math.abs(closest - value) ? preset : closest,
  );
}

export function stepNvvZoomPercent(value: number, direction: "in" | "out") {
  const normalizedValue = normalizeNvvZoomPercent(value);
  const currentIndex = NVV_ZOOM_PRESETS_PERCENT.indexOf(normalizedValue);
  const nextIndex = direction === "in"
    ? Math.min(NVV_ZOOM_PRESETS_PERCENT.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  return NVV_ZOOM_PRESETS_PERCENT[nextIndex];
}
