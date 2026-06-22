import { useEffect, useState } from "react";
import { Bell, Palette, Settings, X, type LucideIcon } from "lucide-react";
import { GeneralSettings } from "./general/GeneralSettings";
import { NotificationSettings } from "./notifications/NotificationSettings";
import { ThemeSettings } from "./themes/ThemeSettings";
import type { ThemeColors, ThemeDefinition, ThemeEditorLayout } from "./themes/themeTypes";

export function SettingsPanel({
  autoSeedLibraryStructureEnabled,
  availableThemes,
  canDeleteSelectedTheme,
  nvdSaveReminderEnabled,
  nvdStyleResetConfirmationEnabled,
  onAutoSeedLibraryStructureEnabledChange,
  onClose,
  onDeleteTheme,
  onNvdSaveReminderEnabledChange,
  onNvdStyleResetConfirmationEnabledChange,
  onSaveTheme,
  onSelectTheme,
  onThemeColorChange,
  onThemeEditorLayoutChange,
  onThemeNameChange,
  selectedThemeId,
  selectedThemeIsBuiltin,
  themeColors,
  themeEditorLayout,
  themeName,
}: {
  autoSeedLibraryStructureEnabled: boolean;
  availableThemes: ThemeDefinition[];
  canDeleteSelectedTheme: boolean;
  nvdSaveReminderEnabled: boolean;
  nvdStyleResetConfirmationEnabled: boolean;
  onAutoSeedLibraryStructureEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
  onDeleteTheme: () => void;
  onNvdSaveReminderEnabledChange: (enabled: boolean) => void;
  onNvdStyleResetConfirmationEnabledChange: (enabled: boolean) => void;
  onSaveTheme: () => void;
  onSelectTheme: (themeId: string) => void;
  onThemeColorChange: (key: keyof ThemeColors, value: string) => void;
  onThemeEditorLayoutChange: (layout: ThemeEditorLayout) => void;
  onThemeNameChange: (name: string) => void;
  selectedThemeId: string;
  selectedThemeIsBuiltin: boolean;
  themeColors: ThemeColors;
  themeEditorLayout: ThemeEditorLayout;
  themeName: string;
}) {
  const [activeSection, setActiveSection] = useState<"general" | "themes" | "notifications">("general");
  const settingsSections: { id: typeof activeSection; icon: LucideIcon; label: string }[] = [
    { id: "general", icon: Settings, label: "General" },
    { id: "themes", icon: Palette, label: "Themes" },
    { id: "notifications", icon: Bell, label: "Notifications" },
  ];
  const activeSectionDefinition = settingsSections.find((section) => section.id === activeSection) ?? settingsSections[0];
  const ActiveSectionIcon = activeSectionDefinition.icon;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
      <section className="flex h-[min(540px,calc(100vh-64px))] w-[min(760px,calc(100vw-48px))] overflow-hidden rounded-sm border border-line bg-surface text-ink">
        <aside className="flex w-48 shrink-0 flex-col border-r border-line bg-sidebar text-ink">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 text-xs font-semibold uppercase text-muted">
            <Settings size={15} aria-hidden="true" />
            Settings
          </div>
          <div className="p-2">
            {settingsSections.map(({ id, icon: SectionIcon, label }) => (
              <button
                className={`settings-nav-row ${activeSection === id ? "settings-nav-row-active" : ""}`}
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
              >
                <SectionIcon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-canvas">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2">
              <ActiveSectionIcon size={16} aria-hidden="true" />
              <h2 className="truncate text-sm font-semibold">{activeSectionDefinition.label}</h2>
            </div>
            <button className="icon-button" aria-label="Close settings" title="Close settings" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          {activeSection === "general" ? (
            <GeneralSettings
              autoSeedLibraryStructureEnabled={autoSeedLibraryStructureEnabled}
              onAutoSeedLibraryStructureEnabledChange={onAutoSeedLibraryStructureEnabledChange}
            />
          ) : activeSection === "notifications" ? (
            <NotificationSettings
              nvdSaveReminderEnabled={nvdSaveReminderEnabled}
              nvdStyleResetConfirmationEnabled={nvdStyleResetConfirmationEnabled}
              onNvdSaveReminderEnabledChange={onNvdSaveReminderEnabledChange}
              onNvdStyleResetConfirmationEnabledChange={onNvdStyleResetConfirmationEnabledChange}
            />
          ) : (
            <ThemeSettings
              availableThemes={availableThemes}
              canDeleteSelectedTheme={canDeleteSelectedTheme}
              onDeleteTheme={onDeleteTheme}
              onSaveTheme={onSaveTheme}
              onSelectTheme={onSelectTheme}
              onThemeColorChange={onThemeColorChange}
              onThemeEditorLayoutChange={onThemeEditorLayoutChange}
              onThemeNameChange={onThemeNameChange}
              selectedThemeId={selectedThemeId}
              selectedThemeIsBuiltin={selectedThemeIsBuiltin}
              themeColors={themeColors}
              themeEditorLayout={themeEditorLayout}
              themeName={themeName}
            />
          )}
        </div>
      </section>
    </div>
  );
}
