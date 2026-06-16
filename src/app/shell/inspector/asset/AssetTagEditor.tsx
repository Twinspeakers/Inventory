import type { FormEvent as ReactFormEvent } from "react";
import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { normalizeLibraryMatchText, normalizeLibraryNodeTagValues } from "../../../../libraryCatalog";
import type { InspectorAsset } from "../inspectorTypes";

export function AssetTagEditor({
  asset,
  onKeptTagsChange,
  onOpenTagBrowser,
  onTagsChange,
  suggestions,
}: {
  asset: InspectorAsset;
  onKeptTagsChange: (tags: string[]) => void;
  onOpenTagBrowser: () => void;
  onTagsChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [draftTag, setDraftTag] = useState("");
  const suggestionId = `tag-suggestions-${asset.id}`;
  const normalizedDefaultKeptTags = new Set(asset.defaultKeptTags.map(normalizeLibraryMatchText));
  const normalizedKeptTags = new Set(asset.keptTags.map(normalizeLibraryMatchText));
  const normalizedSystemTags = new Set(asset.systemTags.map(normalizeLibraryMatchText));
  const normalizedUserTags = new Set(asset.userTags.map(normalizeLibraryMatchText));
  const availableSuggestions = suggestions
    .filter((tag) => {
      const normalizedTag = normalizeLibraryMatchText(tag);
      return !normalizedKeptTags.has(normalizedTag) && !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
    })
    .slice(0, 16);
  const availableSuggestionsByKey = new Map(availableSuggestions.map((tag) => [normalizeLibraryMatchText(tag), tag]));
  const selectedSuggestionTag = availableSuggestionsByKey.get(normalizeLibraryMatchText(draftTag)) ?? null;
  const keptOnlyTags = asset.keptTags.filter((tag) => {
    const normalizedTag = normalizeLibraryMatchText(tag);
    return !normalizedSystemTags.has(normalizedTag) && !normalizedUserTags.has(normalizedTag);
  });

  function addTag(value: string) {
    const suggestedTag = availableSuggestionsByKey.get(normalizeLibraryMatchText(value));
    const [tag] = normalizeLibraryNodeTagValues(suggestedTag ? [suggestedTag] : []);

    if (!tag || normalizedKeptTags.has(tag) || normalizedSystemTags.has(tag) || normalizedUserTags.has(tag)) {
      setDraftTag("");
      return;
    }

    onTagsChange([...asset.userTags, tag]);
    setDraftTag("");
  }

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

  function handleSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTag(draftTag);
  }

  return (
    <section className="mt-4">
      <div className="section-label">File Tags</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
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
        {asset.userTags.map((tag) => (
          <button className="tag tag-editable" key={tag} title={`Remove ${tag}`} type="button" onClick={() => removeTag(tag)}>
            <span>{tag}</span>
            <X size={11} aria-hidden="true" />
          </button>
        ))}
      </div>
      <form className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5" onSubmit={handleSubmit}>
        <input
          className="tag-input"
          list={suggestionId}
          placeholder="Add suggested tag..."
          value={draftTag}
          onChange={(event) => setDraftTag(event.currentTarget.value)}
        />
        <datalist id={suggestionId}>
          {availableSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <button className="tag-add-button" disabled={!selectedSuggestionTag} type="submit">
          <Plus size={14} aria-hidden="true" />
          <span>Add</span>
        </button>
        <button className="tag-add-button" type="button" onClick={onOpenTagBrowser}>
          <span>Browse Tags</span>
        </button>
      </form>
      {availableSuggestions.length === 0 ? (
        <p className="mt-1.5 text-[11px] text-muted">No smart suggestions yet. Use Browse Tags to explore the full library.</p>
      ) : null}
    </section>
  );
}
