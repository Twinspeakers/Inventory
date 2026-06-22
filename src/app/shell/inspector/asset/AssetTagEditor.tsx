import { LoaderCircle, RefreshCw, Save, Search, X } from "lucide-react";
import { normalizeLibraryMatchText, normalizeLibraryNodeTagValues } from "../../../../libraryCatalog";
import type { InspectorAsset } from "../inspectorTypes";

export function AssetTagEditor({
  asset,
  onAddTag,
  onKeptTagsChange,
  onOpenTagBrowser,
  onReanalyze,
  onRemoveRecentTag,
  onTagsChange,
  suggestions,
}: {
  asset: InspectorAsset;
  onAddTag: (tag: string) => void;
  onKeptTagsChange: (tags: string[]) => void;
  onOpenTagBrowser: () => void;
  onReanalyze: () => void;
  onRemoveRecentTag: (tag: string) => void;
  onTagsChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const normalizedDefaultKeptTags = new Set(asset.defaultKeptTags.map(normalizeLibraryMatchText));
  const normalizedKeptTags = new Set(asset.keptTags.map(normalizeLibraryMatchText));
  const normalizedSystemTags = new Set(asset.systemTags.map(normalizeLibraryMatchText));
  const normalizedUserTags = new Set(asset.userTags.map(normalizeLibraryMatchText));
  const availableSuggestions = suggestions
    .filter((tag) => {
      const normalizedTag = normalizeLibraryMatchText(tag);
      return !normalizedKeptTags.has(normalizedTag) && !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
    })
    .slice(0, 12);
  const keptOnlyTags = asset.keptTags.filter((tag) => {
    const normalizedTag = normalizeLibraryMatchText(tag);
    return !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
  });
  const canReanalyze = asset.type === "Image" && ["avif", "jpeg", "jpg", "png", "webp"].includes(asset.extension.toLowerCase());
  const isRunning = asset.analysisStatus === "running";
  const statusLabel = getAnalysisStatusLabel(asset);

  function removeTag(tagToRemove: string) {
    const normalizedTag = normalizeLibraryMatchText(tagToRemove);
    onTagsChange(asset.userTags.filter((tag) => normalizeLibraryMatchText(tag) !== normalizedTag));
  }

  function toggleKeptTag(tagToToggle: string) {
    const [normalizedTag] = normalizeLibraryNodeTagValues([tagToToggle]);

    if (!normalizedTag || normalizedDefaultKeptTags.has(normalizedTag)) {
      return;
    }

    if (normalizedKeptTags.has(normalizedTag)) {
      onKeptTagsChange(asset.keptTags.filter((tag) => normalizeLibraryMatchText(tag) !== normalizedTag));
      return;
    }

    onKeptTagsChange([...asset.keptTags, normalizedTag]);
  }

  return (
    <section className="mt-4">
      {canReanalyze ? (
        <div className="rounded-sm border border-line bg-surface px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Image Analysis</div>
              <div className="mt-1 text-sm font-medium text-ink">{statusLabel}</div>
            </div>
            <button className="dark-icon-button h-8 min-w-8 px-2" disabled={isRunning} title="Reanalyze image" type="button" onClick={onReanalyze}>
              {isRunning ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
            </button>
          </div>
          {asset.analysisCaption ? <p className="mt-2 text-xs leading-relaxed text-muted">{asset.analysisCaption}</p> : null}
          {asset.analysisError ? <p className="mt-2 text-xs leading-relaxed text-copper">{asset.analysisError}</p> : null}
          {asset.analysisSuggestedTags.length > 0 ? (
            <p className="mt-2 text-[11px] uppercase tracking-normal text-muted">
              Suggested by AI: {asset.analysisSuggestedTags.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Tags</div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            aria-label="Browse tags"
            className="tag tag-add-button w-7 shrink-0 px-0"
            title="Browse tags"
            type="button"
            onClick={onOpenTagBrowser}
          >
            <Search size={13} aria-hidden="true" />
          </button>
          {asset.systemTags.map((tag) => {
            const normalizedTag = normalizeLibraryMatchText(tag);
            const isKept = normalizedKeptTags.has(normalizedTag);
            const isDefaultKept = normalizedDefaultKeptTags.has(normalizedTag);

            return (
              <button
                className={`tag tag-system tag-keep-button ${isKept ? "tag-kept" : ""}`}
                key={tag}
                title={isDefaultKept ? `${tag} is kept by default` : isKept ? `Stop keeping ${tag}` : `Keep ${tag}`}
                type="button"
                onClick={() => toggleKeptTag(tag)}
              >
                <span>{tag}</span>
                {isKept ? <Save size={10} aria-hidden="true" /> : null}
              </button>
            );
          })}
          {keptOnlyTags.map((tag) => (
            <button className="tag tag-keep-button tag-kept" key={tag} title={`Stop keeping ${tag}`} type="button" onClick={() => toggleKeptTag(tag)}>
              <span>{tag}</span>
              <Save size={10} aria-hidden="true" />
            </button>
          ))}
          {asset.userTags.length > 0 ? (
            asset.userTags.map((tag) => (
              <button className="tag tag-editable tag-custom" key={tag} title={`Remove ${tag}`} type="button" onClick={() => removeTag(tag)}>
                <span>{tag}</span>
                <X size={11} aria-hidden="true" />
              </button>
            ))
          ) : null}
        </div>
      </div>
      {availableSuggestions.length > 0 ? (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Recent Tags</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {availableSuggestions.map((tag) => (
              <div className="tag tag-chip-shell" key={tag}>
                <button className="tag-chip-main tag-editable" type="button" onClick={() => onAddTag(tag)}>
                  <span>{tag}</span>
                </button>
                <button className="tag-chip-action" title={`Remove ${tag} from recent tags`} type="button" onClick={() => onRemoveRecentTag(tag)}>
                  <X size={11} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getAnalysisStatusLabel(asset: InspectorAsset) {
  switch (asset.analysisStatus) {
    case "running":
      return "Analyzing in background";
    case "error":
      return "Analysis failed";
    case "done":
      return asset.analysisSuggestedTags.length > 0 ? `${asset.analysisSuggestedTags.length} AI tag suggestions ready` : "Analysis finished with no tag suggestions";
    case "idle":
    default:
      return asset.analysisVersion > 0 ? "Waiting to reanalyze" : "Waiting to analyze";
  }
}
