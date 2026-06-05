import { NVV_ZOOM_PRESETS_PERCENT, normalizeNvvZoomPercent } from "./nvvZoom";

export function NvvZoomSelector({
  onChange,
  zoomPercent,
}: {
  onChange: (zoomPercent: number) => void;
  zoomPercent: number;
}) {
  const normalizedZoomPercent = normalizeNvvZoomPercent(zoomPercent);

  return (
    <label className="nvd-zoom-selector" title="Draw zoom (Ctrl + Scroll)">
      <span className="sr-only">Draw zoom</span>
      <select
        aria-label="Draw zoom"
        className="nvd-zoom-select"
        value={normalizedZoomPercent}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      >
        {NVV_ZOOM_PRESETS_PERCENT.map((preset) => (
          <option key={preset} value={preset}>
            {preset}%
          </option>
        ))}
      </select>
    </label>
  );
}
