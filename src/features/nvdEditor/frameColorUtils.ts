export type NvdFrameColorRgba = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

export type NvdFrameColorHsva = {
  alpha: number;
  hue: number;
  saturation: number;
  value: number;
};

export const DEFAULT_NVD_FRAME_BACKGROUND_COLOR = "#FFFFFFFF";

export const NVD_FRAME_BACKGROUND_SWATCHES = [
  "#FFFFFFFF",
  "#F0EBE1FF",
  "#D9C3A3FF",
  "#C98555FF",
  "#A8513CFF",
  "#A2ABB2FF",
  "#8E9C6CFF",
  "#627E69FF",
  "#527C92FF",
  "#314E6CFF",
  "#1E1E1EFF",
  "#000000FF",
] as const;

export function normalizeNvdFrameBackgroundColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const normalized = match[1].toUpperCase();
  return normalized.length === 6 ? `#${normalized}FF` : `#${normalized}`;
}

export function parseNvdFrameBackgroundColor(color: string): NvdFrameColorRgba {
  const normalized = normalizeNvdFrameBackgroundColor(color) ?? DEFAULT_NVD_FRAME_BACKGROUND_COLOR;
  const hex = normalized.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const alpha = Number.parseInt(hex.slice(6, 8), 16) / 255;

  return { alpha, blue, green, red };
}

export function toNvdFrameBackgroundColor(color: NvdFrameColorRgba) {
  const red = toHexByte(color.red);
  const green = toHexByte(color.green);
  const blue = toHexByte(color.blue);
  const alpha = toHexByte(color.alpha * 255);
  return `#${red}${green}${blue}${alpha}`;
}

export function getNvdFrameColorHex6(color: string) {
  return (normalizeNvdFrameBackgroundColor(color) ?? DEFAULT_NVD_FRAME_BACKGROUND_COLOR).slice(0, 7);
}

export function getNvdFrameColorOpacityPercent(color: string) {
  return Math.round(parseNvdFrameBackgroundColor(color).alpha * 100);
}

export function nvdFrameColorToCssRgba(color: string) {
  const { alpha, blue, green, red } = parseNvdFrameBackgroundColor(color);
  return `rgba(${red}, ${green}, ${blue}, ${roundFrameColorValue(alpha, 3)})`;
}

export function rgbaToHsva(color: NvdFrameColorRgba): NvdFrameColorHsva {
  const red = clampFrameColorValue(color.red / 255, 0, 1);
  const green = clampFrameColorValue(color.green / 255, 0, 1);
  const blue = clampFrameColorValue(color.blue / 255, 0, 1);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  return {
    alpha: clampFrameColorValue(color.alpha, 0, 1),
    hue: ((hue * 60) + 360) % 360,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

export function hsvaToRgba(color: NvdFrameColorHsva): NvdFrameColorRgba {
  const hue = ((color.hue % 360) + 360) % 360;
  const saturation = clampFrameColorValue(color.saturation, 0, 1);
  const value = clampFrameColorValue(color.value, 0, 1);
  const chroma = value * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = value - chroma;

  return {
    alpha: clampFrameColorValue(color.alpha, 0, 1),
    blue: Math.round((blue + match) * 255),
    green: Math.round((green + match) * 255),
    red: Math.round((red + match) * 255),
  };
}

export function clampFrameColorValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundFrameColorValue(value: number, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toHexByte(value: number) {
  return Math.round(clampFrameColorValue(value, 0, 255))
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}
