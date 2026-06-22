import { useEffect, useMemo, useState } from "react";
import {
  areThemeColorsEqual,
  isHexColor,
  premadeThemes,
  readAutoSeedLibraryStructureEnabled,
  readCustomThemes,
  readNvdSaveReminderEnabled,
  readNvdStyleResetConfirmationEnabled,
  readStoredThemeColors,
  readStoredThemeEditorLayout,
  readStoredThemeId,
  readStoredThemeName,
  storeAutoSeedLibraryStructureEnabled,
  storeCustomThemes,
  storeNvdSaveReminderEnabled,
  storeNvdStyleResetConfirmationEnabled,
  storeSelectedThemeId,
  storeThemeEditorLayout,
  themeColorsToCssVariables,
  type ThemeColors,
  type ThemeDefinition,
  type ThemeEditorLayout,
} from "../../features/settings";

export function useAppSettings({ setStatusMessage }: { setStatusMessage: (message: string) => void }) {
  const [autoSeedLibraryStructureEnabled, setAutoSeedLibraryStructureEnabled] = useState(() =>
    readAutoSeedLibraryStructureEnabled(),
  );
  const [nvdSaveReminderEnabled, setNvdSaveReminderEnabled] = useState(() => readNvdSaveReminderEnabled());
  const [nvdStyleResetConfirmationEnabled, setNvdStyleResetConfirmationEnabled] = useState(() =>
    readNvdStyleResetConfirmationEnabled(),
  );
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() => readCustomThemes());
  const [selectedThemeId, setSelectedThemeId] = useState(() => readStoredThemeId());
  const [themeColors, setThemeColors] = useState<ThemeColors>(() => readStoredThemeColors());
  const [themeName, setThemeName] = useState(() => readStoredThemeName());
  const [themeEditorLayout, setThemeEditorLayout] = useState<ThemeEditorLayout>(() => readStoredThemeEditorLayout());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const availableThemes = useMemo(() => [...premadeThemes, ...customThemes], [customThemes]);
  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === selectedThemeId) ?? premadeThemes[1],
    [availableThemes, selectedThemeId],
  );
  const selectedThemeIsBuiltin = Boolean(selectedTheme.builtin);
  const themeStyle = useMemo(() => themeColorsToCssVariables(themeColors), [themeColors]);

  useEffect(() => {
    storeSelectedThemeId(selectedThemeId);
  }, [selectedThemeId]);

  useEffect(() => {
    storeThemeEditorLayout(themeEditorLayout);
  }, [themeEditorLayout]);

  useEffect(() => {
    if (selectedTheme.builtin && !areThemeColorsEqual(themeColors, selectedTheme.colors)) {
      setThemeColors(selectedTheme.colors);
    }
  }, [selectedTheme, themeColors]);

  function selectTheme(themeId: string) {
    const theme = availableThemes.find((candidate) => candidate.id === themeId) ?? premadeThemes[1];
    setSelectedThemeId(theme.id);
    setThemeColors({ ...theme.colors });
    setThemeName(theme.builtin ? "" : theme.name);
  }

  function updateThemeColor(key: keyof ThemeColors, value: string) {
    if (selectedThemeIsBuiltin || !isHexColor(value)) {
      return;
    }

    setThemeColors((colors) => ({ ...colors, [key]: value }));
  }

  function saveTheme() {
    const name = themeName.trim() || (selectedTheme.builtin ? `${selectedTheme.name} Copy` : "Custom Theme");
    const existingCustomTheme = customThemes.find((theme) => theme.id === selectedThemeId);
    const themeId = existingCustomTheme?.id ?? `custom-${Date.now()}`;
    const savedTheme: ThemeDefinition = {
      id: themeId,
      name,
      colors: themeColors,
    };
    const nextThemes = customThemes.some((theme) => theme.id === themeId)
      ? customThemes.map((theme) => (theme.id === themeId ? savedTheme : theme))
      : [...customThemes, savedTheme];

    setCustomThemes(nextThemes);
    storeCustomThemes(nextThemes);
    setSelectedThemeId(themeId);
    setThemeName(name);
    setStatusMessage(`Saved theme "${name}".`);
  }

  function deleteSelectedTheme() {
    const themeToDelete = customThemes.find((theme) => theme.id === selectedThemeId);

    if (!themeToDelete) {
      return;
    }

    const nextThemes = customThemes.filter((candidate) => candidate.id !== themeToDelete.id);
    const fallbackTheme = availableThemes.find((theme) => theme.id === "dark") ?? premadeThemes[1];
    setCustomThemes(nextThemes);
    setSelectedThemeId(fallbackTheme.id);
    setThemeColors({ ...fallbackTheme.colors });
    setThemeName("");
    storeCustomThemes(nextThemes);
    setStatusMessage(`Deleted theme "${themeToDelete.name}".`);
  }

  function updateNvdSaveReminderEnabled(enabled: boolean) {
    setNvdSaveReminderEnabled(enabled);
    storeNvdSaveReminderEnabled(enabled);
  }

  function updateAutoSeedLibraryStructureEnabled(enabled: boolean) {
    setAutoSeedLibraryStructureEnabled(enabled);
    storeAutoSeedLibraryStructureEnabled(enabled);
  }

  function updateNvdStyleResetConfirmationEnabled(enabled: boolean) {
    setNvdStyleResetConfirmationEnabled(enabled);
    storeNvdStyleResetConfirmationEnabled(enabled);
  }

  function dismissNvdSaveReminder() {
    if (window.confirm("Do you want to turn off this reminder? You can enable it again in Settings.")) {
      updateNvdSaveReminderEnabled(false);
    }
  }

  return {
    availableThemes,
    autoSeedLibraryStructureEnabled,
    customThemes,
    isSettingsOpen,
    nvdSaveReminderEnabled,
    nvdStyleResetConfirmationEnabled,
    selectedTheme,
    selectedThemeId,
    selectedThemeIsBuiltin,
    themeColors,
    themeEditorLayout,
    themeName,
    themeStyle,
    deleteSelectedTheme,
    dismissNvdSaveReminder,
    saveTheme,
    selectTheme,
    setIsSettingsOpen,
    setThemeEditorLayout,
    setThemeName,
    updateAutoSeedLibraryStructureEnabled,
    updateNvdSaveReminderEnabled,
    updateNvdStyleResetConfirmationEnabled,
    updateThemeColor,
  };
}

export function hasThemeChanged(selectedTheme: ThemeDefinition, themeColors: ThemeColors) {
  return !areThemeColorsEqual(themeColors, selectedTheme.colors);
}

