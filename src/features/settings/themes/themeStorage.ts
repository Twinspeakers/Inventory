import { darkThemeColors, type ThemeDefinition, type ThemeEditorLayout, type ThemeColors } from "./themeTypes";
import { findTheme, normalizeThemeColors } from "./themeUtils";

const themeStorageKeys = {
  selectedThemeId: "inventory.theme.selectedThemeId",
  customThemes: "inventory.theme.customThemes",
  editorLayout: "inventory.theme.editorLayout",
};

export function readStoredThemeId() {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.localStorage.getItem(themeStorageKeys.selectedThemeId) || "dark";
}

export function storeSelectedThemeId(themeId: string) {
  storeString(themeStorageKeys.selectedThemeId, themeId);
}

export function readStoredThemeColors() {
  const customThemes = readCustomThemes();
  const themeId = readStoredThemeId();
  return findTheme(themeId, customThemes)?.colors ?? darkThemeColors;
}

export function readStoredThemeName() {
  const customThemes = readCustomThemes();
  const themeId = readStoredThemeId();
  const theme = findTheme(themeId, customThemes);
  return theme && !theme.builtin ? theme.name : "";
}

export function readStoredThemeEditorLayout(): ThemeEditorLayout {
  if (typeof window === "undefined") {
    return "cards";
  }

  return window.localStorage.getItem(themeStorageKeys.editorLayout) === "list" ? "list" : "cards";
}

export function storeThemeEditorLayout(layout: ThemeEditorLayout) {
  storeString(themeStorageKeys.editorLayout, layout);
}

export function readCustomThemes() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawThemes = JSON.parse(window.localStorage.getItem(themeStorageKeys.customThemes) ?? "[]");

    if (!Array.isArray(rawThemes)) {
      return [];
    }

    return rawThemes
      .filter((theme): theme is { id: string; name: string; colors: Partial<ThemeColors> } => {
        return typeof theme?.id === "string" && typeof theme?.name === "string" && typeof theme?.colors === "object";
      })
      .map((theme) => ({
        id: theme.id,
        name: theme.name,
        colors: normalizeThemeColors(theme.colors),
      }));
  } catch {
    return [];
  }
}

export function storeCustomThemes(themes: ThemeDefinition[]) {
  try {
    window.localStorage.setItem(themeStorageKeys.customThemes, JSON.stringify(themes));
  } catch {
    // Theme persistence is a convenience; the live app can continue without it.
  }
}

function storeString(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Theme persistence is a convenience; the live app can continue without it.
  }
}
