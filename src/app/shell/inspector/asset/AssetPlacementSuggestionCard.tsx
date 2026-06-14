import { Plus, RefreshCw } from "lucide-react";
import type { InspectorAssetPlacementSuggestion } from "../inspectorTypes";

export function AssetPlacementSuggestionCard({
  onAccept,
  onRefresh,
  suggestion,
  suggestionCount,
}: {
  onAccept: () => void;
  onRefresh: () => void;
  suggestion: InspectorAssetPlacementSuggestion;
  suggestionCount: number;
}) {
  return (
    <section className="mt-4">
      <div className="section-label">Suggested Folder</div>
      <p className="mt-2 break-words text-sm font-semibold text-ink">{suggestion.path.join(" > ")}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button className="primary-button" type="button" onClick={onAccept}>
          <Plus size={14} aria-hidden="true" />
          <span>Accept</span>
        </button>
        <button className="secondary-button" disabled={suggestionCount <= 1} title="Try another suggestion" type="button" onClick={onRefresh}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
