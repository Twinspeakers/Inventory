import { NVD_ZOOM_PRESETS_PERCENT, normalizeNvdZoomPercent } from "../primitives/nvdZoom";

export function NvdZoomSelector({
  onChange,
  zoomPercent,
}: {
  onChange: (zoomPercent: number) => void;
  zoomPercent: number;
}) {
  const normalizedZoomPercent = normalizeNvdZoomPercent(zoomPercent);

  return (
    <label className="nvd-zoom-selector" title="Document zoom (Ctrl + Scroll)">
      <span className="sr-only">Document zoom</span>
      <select
        aria-label="Document zoom"
        className="nvd-zoom-select"
        value={normalizedZoomPercent}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      >
        {NVD_ZOOM_PRESETS_PERCENT.map((preset) => (
          <option key={preset} value={preset}>
            {preset}%
          </option>
        ))}
      </select>
    </label>
  );
}
