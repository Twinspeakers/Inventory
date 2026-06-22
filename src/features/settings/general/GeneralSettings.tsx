export function GeneralSettings({
  autoSeedLibraryStructureEnabled,
  onAutoSeedLibraryStructureEnabledChange,
}: {
  autoSeedLibraryStructureEnabled: boolean;
  onAutoSeedLibraryStructureEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4" aria-label="General settings">
      <div className="max-w-2xl">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-sm border border-line bg-surface p-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Auto-seed library structure</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              When the first source folders are added to an empty Inventory, create starter library branches from the
              imported files.
            </span>
          </span>
          <input
            checked={autoSeedLibraryStructureEnabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-steel"
            type="checkbox"
            onChange={(event) => onAutoSeedLibraryStructureEnabledChange(event.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}
