import { Grid3X3, ListFilter, Save, Trash2 } from "lucide-react";
import { themeColorFields, type ThemeColors, type ThemeDefinition, type ThemeEditorLayout } from "./themeTypes";

export function ThemeSettings({
  availableThemes,
  canDeleteSelectedTheme,
  onDeleteTheme,
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
  availableThemes: ThemeDefinition[];
  canDeleteSelectedTheme: boolean;
  onDeleteTheme: () => void;
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
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_auto_auto]">
        <label className="grid gap-1.5 text-sm font-medium">
          <span className="text-xs font-semibold uppercase text-muted">Theme</span>
          <select
            className="h-9 rounded-sm border border-line bg-surface px-2.5 text-sm text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
            value={selectedThemeId}
            onChange={(event) => onSelectTheme(event.target.value)}
          >
            {availableThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          <span className="text-xs font-semibold uppercase text-muted">Theme Name</span>
          <input
            className="h-9 rounded-sm border border-line bg-surface px-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
            placeholder="Custom Theme"
            value={themeName}
            onChange={(event) => onThemeNameChange(event.target.value)}
          />
        </label>

        <div className="flex items-end">
          <button className="primary-button h-9" onClick={onSaveTheme}>
            <Save size={16} aria-hidden="true" />
            <span>{selectedThemeIsBuiltin ? "Save Copy" : "Save Theme"}</span>
          </button>
        </div>
        <div className="flex items-end">
          <button className="secondary-button h-9" disabled={!canDeleteSelectedTheme} onClick={onDeleteTheme} title="Delete custom theme">
            <Trash2 size={16} aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="text-xs font-semibold uppercase text-muted">Color Editor</div>
        <div className="flex rounded-sm border border-line bg-surface p-1">
          <button
            className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition ${
              themeEditorLayout === "cards" ? "bg-steel text-white" : "text-ink hover:bg-surface-raised"
            }`}
            onClick={() => onThemeEditorLayoutChange("cards")}
            type="button"
          >
            <Grid3X3 size={14} aria-hidden="true" />
            <span>Cards</span>
          </button>
          <button
            className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition ${
              themeEditorLayout === "list" ? "bg-steel text-white" : "text-ink hover:bg-surface-raised"
            }`}
            onClick={() => onThemeEditorLayoutChange("list")}
            type="button"
          >
            <ListFilter size={14} aria-hidden="true" />
            <span>List</span>
          </button>
        </div>
      </div>

      {themeEditorLayout === "cards" ? (
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {themeColorFields.map((field) => (
            <ThemeColorControl
              field={field}
              key={field.key}
              layout="cards"
              disabled={selectedThemeIsBuiltin}
              onThemeColorChange={onThemeColorChange}
              themeColors={themeColors}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-sm border border-line bg-surface">
          {themeColorFields.map((field) => (
            <ThemeColorControl
              field={field}
              key={field.key}
              layout="list"
              disabled={selectedThemeIsBuiltin}
              onThemeColorChange={onThemeColorChange}
              themeColors={themeColors}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeColorControl({
  field,
  layout,
  disabled,
  onThemeColorChange,
  themeColors,
}: {
  field: { key: keyof ThemeColors; label: string };
  layout: ThemeEditorLayout;
  disabled: boolean;
  onThemeColorChange: (key: keyof ThemeColors, value: string) => void;
  themeColors: ThemeColors;
}) {
  if (layout === "list") {
    return (
      <label className={`grid grid-cols-[minmax(140px,1fr)_44px_116px] items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${disabled ? "opacity-60" : ""}`}>
        <span className="truncate text-xs font-semibold uppercase text-muted">{field.label}</span>
        <input
          aria-label={field.label}
          className="h-8 w-10 cursor-pointer rounded-sm border border-line bg-surface p-1"
          disabled={disabled}
          type="color"
          value={themeColors[field.key]}
          onChange={(event) => onThemeColorChange(field.key, event.target.value)}
        />
        <input
          className="h-8 min-w-0 rounded-sm border border-line bg-surface-raised px-2 font-mono text-xs uppercase text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
          disabled={disabled}
          maxLength={7}
          value={themeColors[field.key]}
          onChange={(event) => onThemeColorChange(field.key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className={`rounded-sm border border-line bg-surface p-3 ${disabled ? "opacity-60" : ""}`}>
      <span className="text-xs font-semibold uppercase text-muted">{field.label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          aria-label={field.label}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-sm border border-line bg-surface p-1"
          disabled={disabled}
          type="color"
          value={themeColors[field.key]}
          onChange={(event) => onThemeColorChange(field.key, event.target.value)}
        />
        <input
          className="h-9 min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-2 font-mono text-xs uppercase text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
          disabled={disabled}
          maxLength={7}
          value={themeColors[field.key]}
          onChange={(event) => onThemeColorChange(field.key, event.target.value)}
        />
      </div>
    </label>
  );
}
