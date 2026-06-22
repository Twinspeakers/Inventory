import { Save, Search, X } from "lucide-react";
import { normalizeLibraryMatchText, normalizeLibraryNodeTagValues } from "../../../../libraryCatalog";
import type { InspectorAsset } from "../inspectorTypes";

export function AssetTagEditor({
  asset,
  onAddTag,
  onKeptTagsChange,
  onOpenTagBrowser,
  onRemoveRecentTag,
  onTagsChange,
  suggestions,
}: {
  asset: InspectorAsset;
  onAddTag: (tag: string) => void;
  onKeptTagsChange: (tags: string[]) => void;
  onOpenTagBrowser: () => void;
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
