import type { CSSProperties } from "react";
import { darkThemeColors, premadeThemes, themeColorKeys, type ThemeColors, type ThemeDefinition } from "./themeTypes";

export function findTheme(themeId: string, customThemes: ThemeDefinition[]) {
  return [...premadeThemes, ...customThemes].find((theme) => theme.id === themeId);
}

export function normalizeThemeColors(colors: Partial<ThemeColors>) {
  return themeColorKeys.reduce<ThemeColors>((theme, key) => {
    const legacyPanel = (colors as Partial<ThemeColors> & { panel?: string }).panel;
    const fallback =
      (key === "commandBar" || key === "inspector") && typeof legacyPanel === "string" && isHexColor(legacyPanel)
        ? legacyPanel
        : darkThemeColors[key];

    theme[key] = typeof colors[key] === "string" && isHexColor(colors[key]) ? colors[key] : fallback;
    return theme;
  }, {} as ThemeColors);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function areThemeColorsEqual(left: ThemeColors, right: ThemeColors) {
  return themeColorKeys.every((key) => left[key].toLowerCase() === right[key].toLowerCase());
}

export function themeColorsToCssVariables(colors: ThemeColors) {
  const style = themeColorKeys.reduce<CSSProperties>((style, key) => {
    style[`--color-${toKebabCase(key)}` as keyof CSSProperties] = hexToRgbTriplet(colors[key]) as never;
    return style;
  }, {} as CSSProperties);
  style.colorScheme = getColorScheme(colors.app);
  const checkerColors = getTransparentCheckerColors(colors.preview);
  style["--transparent-checker-a" as keyof CSSProperties] = checkerColors.a as never;
  style["--transparent-checker-b" as keyof CSSProperties] = checkerColors.b as never;
  return style;
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function hexToRgbTriplet(hex: string) {
  const normalized = isHexColor(hex) ? hex.slice(1) : darkThemeColors.preview.slice(1);
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `${red} ${green} ${blue}`;
}

function getColorScheme(hex: string) {
  return getHexLuminance(hex) > 0.55 ? "light" : "dark";
}

function getTransparentCheckerColors(hex: string) {
  if (getHexLuminance(hex) > 0.55) {
    return {
      a: "238 241 244",
      b: "190 197 205",
    };
  }

  return {
    a: "32 32 32",
    b: "56 56 56",
  };
}

function getHexLuminance(hex: string) {
  const normalized = isHexColor(hex) ? hex : darkThemeColors.preview;
  const value = Number.parseInt(normalized.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}
