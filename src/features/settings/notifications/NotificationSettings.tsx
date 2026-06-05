export function NotificationSettings({
  nvdSaveReminderEnabled,
  nvdStyleResetConfirmationEnabled,
  onNvdSaveReminderEnabledChange,
  onNvdStyleResetConfirmationEnabledChange,
}: {
  nvdSaveReminderEnabled: boolean;
  nvdStyleResetConfirmationEnabled: boolean;
  onNvdSaveReminderEnabledChange: (enabled: boolean) => void;
  onNvdStyleResetConfirmationEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="max-w-2xl">
        <div className="text-xs font-semibold uppercase text-muted">Documents</div>
        <label className="mt-3 flex cursor-pointer items-start justify-between gap-6 rounded-sm border border-line bg-surface p-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Save reminder</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              Show "Press Ctrl + S to Save changes."
            </span>
          </span>
          <input
            checked={nvdSaveReminderEnabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-steel"
            type="checkbox"
            onChange={(event) => onNvdSaveReminderEnabledChange(event.target.checked)}
          />
        </label>
        <label className="mt-2 flex cursor-pointer items-start justify-between gap-6 rounded-sm border border-line bg-surface p-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Confirm style reset</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              Ask before restoring an NVD style to its built-in default.
            </span>
          </span>
          <input
            checked={nvdStyleResetConfirmationEnabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-steel"
            type="checkbox"
            onChange={(event) => onNvdStyleResetConfirmationEnabledChange(event.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}
