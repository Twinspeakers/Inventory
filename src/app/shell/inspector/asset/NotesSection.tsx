import type { InspectorAsset } from "../inspectorTypes";

export function NotesSection({
  asset,
  onNotesChange,
}: {
  asset: InspectorAsset;
  onNotesChange: (assetId: number, notes: string) => void;
}) {
  return (
    <section className="mt-4">
      <div className="section-label">Notes</div>
      <textarea
        aria-label={`Notes for ${asset.name}`}
        className="asset-notepad mt-2"
        placeholder="Add notes..."
        spellCheck="true"
        value={asset.notes}
        onChange={(event) => onNotesChange(asset.id, event.currentTarget.value)}
      />
    </section>
  );
}
