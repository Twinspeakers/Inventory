import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FolderPlus, Search, X } from "lucide-react";
import {
  customLibraryNodeTemplate,
  getDefaultLibraryNodeTagsForName,
  type LibraryNodeFileType,
  type LibraryNodeTemplate,
} from "../../libraryCatalog";
import type {
  AddFolderSuggestion,
  AddLibraryNodeDraft,
  AddLibraryNodePanelState,
  Asset,
  VirtualFolder,
} from "../appTypes";
import { clamp, isPrimaryPointer } from "../workspace/appLayout";
import {
  createLibraryNodeDraft,
  createVirtualFolderFromDraft,
  findFolder,
  getAddFolderSuggestions,
  getAddLibraryNodeParentOptions,
  getAssetsForLibraryNode,
  getInheritedSuggestionFileTypes,
  getLibraryNodeTemplateForSuggestionParent,
  normalizeLibraryNodeFileTypes,
} from "../../features/libraryTree/libraryTreeModel";
export function AddLibraryNodePanel({
  assets,
  folders,
  panel,
  templates,
  onClose,
  onCreate,
}: {
  assets: Asset[];
  folders: VirtualFolder[];
  panel: AddLibraryNodePanelState;
  templates: LibraryNodeTemplate[];
  onClose: () => void;
  onCreate: (draft: AddLibraryNodeDraft, parentFolderId: string | null) => void;
}) {
  const parentOptions = useMemo(() => getAddLibraryNodeParentOptions(folders), [folders]);
  const [selectedParentFolderId, setSelectedParentFolderId] = useState<string | null>(panel.parentFolderId);
  const selectedParentFolder = selectedParentFolderId ? findFolder(folders, selectedParentFolderId) : null;
  const selectedParentLabel = selectedParentFolder?.name ?? "Master Library";
  const parentTemplate = useMemo(() => getLibraryNodeTemplateForSuggestionParent(selectedParentFolder, templates), [selectedParentFolder, templates]);
  const inheritedFileTypes = useMemo(() => getInheritedSuggestionFileTypes(parentTemplate), [parentTemplate]);
  const [folderName, setFolderName] = useState(panel.initialQuery);
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryNodeTemplate | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedFileTypes, setSelectedFileTypes] = useState<LibraryNodeFileType[]>(() => inheritedFileTypes);
  const panelRef = useRef<HTMLElement | null>(null);
  const panelDragRef = useRef<{
    height: number;
    offsetX: number;
    offsetY: number;
    pointerId: number;
    width: number;
  } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const suggestions = useMemo(
    () => getAddFolderSuggestions(templates, selectedParentFolder, folderName, folders),
    [folderName, folders, selectedParentFolder, templates],
  );
  const selectedSuggestion = selectedSuggestionId ? suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? null : null;
  const draftName = folderName.trim() || selectedTemplate?.name || "New Folder";
  const draftTags = useMemo(
    () => selectedSuggestion?.tags ?? getDefaultLibraryNodeTagsForName(draftName),
    [draftName, selectedSuggestion],
  );
  const draft = useMemo(
    () => createLibraryNodeDraft(selectedTemplate ?? customLibraryNodeTemplate, draftName, draftTags, selectedFileTypes),
    [draftName, draftTags, selectedFileTypes, selectedTemplate],
  );
  const previewAssets = useMemo(() => getAssetsForLibraryNode(createVirtualFolderFromDraft(draft), assets), [assets, draft]);
  const previewExamples = previewAssets.slice(0, 5);
  const panelStyle = panelPosition
    ? ({ left: panelPosition.x, top: panelPosition.y } satisfies CSSProperties)
    : ({ left: "50%", top: "50%", transform: "translate(-50%, -50%)" } satisfies CSSProperties);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (selectedParentFolderId && !findFolder(folders, selectedParentFolderId)) {
      setSelectedParentFolderId(null);
      setSelectedSuggestionId(null);
      setSelectedTemplate(null);
      setSelectedFileTypes(getInheritedSuggestionFileTypes(getLibraryNodeTemplateForSuggestionParent(null, templates)));
    }
  }, [folders, selectedParentFolderId, templates]);

  function updateFolderName(value: string) {
    const hadSuggestion = Boolean(selectedSuggestionId);

    setFolderName(value);
    setSelectedSuggestionId(null);

    if (hadSuggestion || (selectedTemplate && value !== selectedTemplate.name)) {
      setSelectedTemplate(null);
      setSelectedFileTypes(inheritedFileTypes);
    }
  }

  function updateParentFolder(value: string) {
    const parentFolderId = value || null;
    const nextParentFolder = parentFolderId ? findFolder(folders, parentFolderId) : null;
    const nextParentTemplate = getLibraryNodeTemplateForSuggestionParent(nextParentFolder, templates);

    setSelectedParentFolderId(parentFolderId);
    setSelectedSuggestionId(null);
    setSelectedTemplate(null);
    setSelectedFileTypes(getInheritedSuggestionFileTypes(nextParentTemplate));
  }

  function applySuggestion(suggestion: AddFolderSuggestion) {
    setSelectedSuggestionId(suggestion.id);
    setSelectedTemplate(suggestion.template);
    setFolderName(suggestion.name);
    setSelectedFileTypes(normalizeLibraryNodeFileTypes(suggestion.fileTypes));
  }

  function returnToSuggestions() {
    setSelectedSuggestionId(null);
    setSelectedTemplate(null);
    setFolderName(panel.initialQuery);
    setSelectedFileTypes(inheritedFileTypes);
  }

  function startPanelDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const element = panelRef.current;

    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    panelDragRef.current = {
      height: bounds.height,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      pointerId: event.pointerId,
      width: bounds.width,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanelPosition({ x: bounds.left, y: bounds.top });
    document.body.classList.add("is-dragging-panel");
  }

  function dragPanel(event: ReactPointerEvent<HTMLElement>) {
    const dragState = panelDragRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const edgePadding = 8;
    const maxX = Math.max(edgePadding, window.innerWidth - dragState.width - edgePadding);
    const maxY = Math.max(edgePadding, window.innerHeight - dragState.height - edgePadding);

    setPanelPosition({
      x: clamp(event.clientX - dragState.offsetX, edgePadding, maxX),
      y: clamp(event.clientY - dragState.offsetY, edgePadding, maxY),
    });
  }

  function stopPanelDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = panelDragRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    panelDragRef.current = null;
    document.body.classList.remove("is-dragging-panel");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-6">
      <section
        className="absolute flex h-[min(760px,calc(100vh-64px))] w-[min(980px,calc(100vw-48px))] flex-col overflow-hidden rounded-sm border border-line bg-surface text-ink shadow-soft"
        ref={panelRef}
        style={panelStyle}
      >
        <header
          className="add-folder-drag-header flex h-12 shrink-0 items-center justify-between border-b border-line px-4"
          onPointerCancel={stopPanelDrag}
          onPointerDown={startPanelDrag}
          onPointerMove={dragPanel}
          onPointerUp={stopPanelDrag}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Add Folder</h2>
            <p className="truncate text-xs text-muted">Parent: {selectedParentLabel}</p>
          </div>
          <button className="icon-button" aria-label="Close add folder panel" title="Close" type="button" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-h-0 overflow-auto p-4">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs font-semibold uppercase text-muted">Name</span>
                <input
                  autoFocus
                  className="h-10 rounded-sm border border-line bg-canvas px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                  placeholder="Tables"
                  value={folderName}
                  onChange={(event) => updateFolderName(event.currentTarget.value)}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs font-semibold uppercase text-muted">Make Subdirectory Of</span>
                <select
                  className="h-10 rounded-sm border border-line bg-canvas px-3 text-sm text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
                  value={selectedParentFolderId ?? ""}
                  onChange={(event) => updateParentFolder(event.currentTarget.value)}
                >
                  {parentOptions.map((option) => (
                    <option key={option.id ?? "master-library"} value={option.id ?? ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-sm border border-line bg-canvas p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase text-muted">Matching Preview</span>
                  <span className="text-sm font-semibold">
                    {previewAssets.length} asset{previewAssets.length === 1 ? "" : "s"}
                  </span>
                </div>
                {previewExamples.length > 0 ? (
                  <div className="mt-3 grid gap-1">
                    {previewExamples.map((asset) => (
                      <div className="flex min-w-0 items-center justify-between gap-3 rounded-sm bg-surface px-2 py-1 text-xs" key={asset.id}>
                        <span className="truncate font-medium">{asset.name}</span>
                        <span className="shrink-0 text-muted">.{asset.extension}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-muted">No loaded assets match this folder yet.</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {selectedSuggestion ? `Suggestion: ${selectedSuggestion.category} / ${selectedSuggestion.name}` : "Custom folder"}
                </p>
                <button className="primary-button" type="button" onClick={() => onCreate(draft, selectedParentFolderId)}>
                  <FolderPlus size={16} aria-hidden="true" />
                  <span>Create Folder</span>
                </button>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-line bg-canvas p-3">
            <div className="flex shrink-0 items-center justify-between gap-2 text-xs font-semibold uppercase text-muted">
              <div className="flex min-w-0 items-center gap-2">
                <Search size={14} aria-hidden="true" />
                <span className="truncate">Suggestions for {selectedParentLabel}</span>
              </div>
              {selectedSuggestionId ? (
                <button className="dark-icon-button h-7 w-7 border-transparent bg-transparent" type="button" title="Back to suggestions" aria-label="Back to suggestions" onClick={returnToSuggestions}>
                  <ArrowLeft size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid min-h-0 gap-1 overflow-auto">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <AddFolderSuggestionButton
                    key={suggestion.id}
                    selected={selectedSuggestionId === suggestion.id}
                    suggestion={suggestion}
                    onSelect={() => applySuggestion(suggestion)}
                  />
                ))
              ) : (
                <div className="rounded-sm border border-line bg-surface p-3 text-xs leading-relaxed text-muted">No suggestion matched. The folder can still be created from your name, tags, and file types.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function AddFolderSuggestionButton({
  selected,
  suggestion,
  onSelect,
}: {
  selected: boolean;
  suggestion: AddFolderSuggestion;
  onSelect: () => void;
}) {
  const Icon = suggestion.icon;

  return (
    <button className={`add-folder-suggestion-row ${selected ? "add-folder-suggestion-row-selected" : ""}`} type="button" onClick={onSelect}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-raised text-steel">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{suggestion.name}</span>
        <span className="block truncate text-[11px] text-muted">{suggestion.category} / {suggestion.fileTypes.join(", ")}</span>
      </span>
    </button>
  );
}

