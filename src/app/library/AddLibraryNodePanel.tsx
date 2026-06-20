import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Backpack, ChevronDown, ChevronRight, Folder, FolderOpen, FolderPlus, Search, X } from "lucide-react";
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
  getAssetsForLibraryNode,
  getInheritedSuggestionFileTypes,
  getLibraryNodeTemplateForSuggestionParent,
  normalizeLibraryNodeFileTypes,
} from "../../features/libraryTree/libraryTreeModel";

type PreviewTreeEntry =
  | { type: "folder"; folder: VirtualFolder }
  | { type: "preview"; name: string };

const previewRootTemplateId = "library";
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
  const [selectedParentFolderId, setSelectedParentFolderId] = useState<string | null>(panel.parentFolderId);
  const [isDraggingPreviewNode, setIsDraggingPreviewNode] = useState(false);
  const [previewDropTargetId, setPreviewDropTargetId] = useState<string | null>(null);
  const selectedParentFolder = selectedParentFolderId ? findFolder(folders, selectedParentFolderId) : null;
  const previewParentFolderId = isDraggingPreviewNode ? previewDropTargetId : selectedParentFolderId;
  const previewParentFolder = previewParentFolderId ? findFolder(folders, previewParentFolderId) : null;
  const selectedParentLabel = previewParentFolder?.name ?? "Master";
  const parentTemplate = useMemo(() => getLibraryNodeTemplateForSuggestionParent(selectedParentFolder, templates), [selectedParentFolder, templates]);
  const inheritedFileTypes = useMemo(() => getInheritedSuggestionFileTypes(parentTemplate), [parentTemplate]);
  const [folderName, setFolderName] = useState(panel.initialQuery);
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryNodeTemplate | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedFileTypes, setSelectedFileTypes] = useState<LibraryNodeFileType[]>(() => inheritedFileTypes);
  const previewNodeDragPointerIdRef = useRef<number | null>(null);
  const [previewDragCursor, setPreviewDragCursor] = useState<{ x: number; y: number } | null>(null);
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
  const draftName = folderName.trim() || selectedTemplate?.name || "New Node";
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

  useEffect(() => {
    if (!isDraggingPreviewNode) {
      return;
    }

    function stopPreviewNodeDrag() {
      const dropTargetId = previewDropTargetId;
      setIsDraggingPreviewNode(false);
      setPreviewDropTargetId(null);
      setPreviewDragCursor(null);
      previewNodeDragPointerIdRef.current = null;
      document.body.classList.remove("is-dragging-preview-node");
      updateParentFolder(dropTargetId ?? null);
    }

    function movePreviewNodeDrag(event: PointerEvent) {
      if (previewNodeDragPointerIdRef.current !== null && event.pointerId !== previewNodeDragPointerIdRef.current) {
        return;
      }

      setPreviewDragCursor({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener("pointermove", movePreviewNodeDrag);
    window.addEventListener("pointerup", stopPreviewNodeDrag);
    window.addEventListener("pointercancel", stopPreviewNodeDrag);
    return () => {
      window.removeEventListener("pointermove", movePreviewNodeDrag);
      window.removeEventListener("pointerup", stopPreviewNodeDrag);
      window.removeEventListener("pointercancel", stopPreviewNodeDrag);
    };
  }, [isDraggingPreviewNode, previewDropTargetId, templates]);

  function updateFolderName(value: string) {
    const hadSuggestion = Boolean(selectedSuggestionId);

    setFolderName(value);
    setSelectedSuggestionId(null);

    if (hadSuggestion || (selectedTemplate && value !== selectedTemplate.name)) {
      setSelectedTemplate(null);
      setSelectedFileTypes(inheritedFileTypes);
    }
  }

  function updateParentFolder(parentFolderId: string | null) {
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

  function startPreviewNodeDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    previewNodeDragPointerIdRef.current = event.pointerId;
    setIsDraggingPreviewNode(true);
    setPreviewDropTargetId(selectedParentFolderId);
    setPreviewDragCursor({ x: event.clientX, y: event.clientY });
    document.body.classList.add("is-dragging-preview-node");
  }

  function endPreviewNodeDrag() {
    setIsDraggingPreviewNode(false);
    setPreviewDropTargetId(null);
    setPreviewDragCursor(null);
    previewNodeDragPointerIdRef.current = null;
    document.body.classList.remove("is-dragging-preview-node");
  }

  function handlePreviewNodeTargetHover(parentFolderId: string | null) {
    if (!isDraggingPreviewNode) {
      return;
    }

    setPreviewDropTargetId(parentFolderId);
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
      {isDraggingPreviewNode && previewDragCursor ? (
        <div
          className="add-node-tree-drag-ghost"
          style={{ left: previewDragCursor.x + 14, top: previewDragCursor.y + 10 }}
        >
          <span className="add-node-tree-toggle" aria-hidden="true">
            <ChevronRight size={14} className="opacity-40" />
          </span>
          <span className="add-node-tree-label">
            <FolderPlus size={14} aria-hidden="true" />
            <span>{draftName}</span>
          </span>
          <span className="add-node-tree-badge">New</span>
        </div>
      ) : null}
      <section
        className="absolute flex h-[min(760px,calc(100vh-64px))] w-[min(980px,calc(100vw-48px))] flex-col overflow-hidden rounded-sm border border-line bg-surface text-ink"
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
            <h2 className="truncate text-sm font-semibold">New Node</h2>
            <p className="truncate text-xs text-muted">Parent: {selectedParentLabel}</p>
          </div>
          <button className="icon-button" aria-label="Close new node panel" title="Close" type="button" onClick={onClose}>
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
                <span className="text-xs font-semibold uppercase text-muted">Scene Tree</span>
                <div className="rounded-sm border border-line bg-canvas p-2">
                  <PreviewLibraryTree
                    draftName={draftName}
                    folders={folders}
                    isDraggingPreviewNode={isDraggingPreviewNode}
                    previewDropTargetId={previewDropTargetId}
                    previewParentFolderId={previewParentFolderId}
                    selectedParentFolderId={selectedParentFolderId}
                    onPreviewNodeDragStart={startPreviewNodeDrag}
                    onPreviewNodeTargetHover={handlePreviewNodeTargetHover}
                    onSelectParent={updateParentFolder}
                  />
                </div>
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
                  <p className="mt-2 text-xs leading-relaxed text-muted">No loaded assets match this node yet.</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {selectedSuggestion ? `Suggestion: ${selectedSuggestion.category} / ${selectedSuggestion.name}` : "Custom node"}
                </p>
                <button className="primary-button" type="button" onClick={() => onCreate(draft, selectedParentFolderId)}>
                  <FolderPlus size={16} aria-hidden="true" />
                  <span>Create Node</span>
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
                <div className="rounded-sm border border-line bg-surface p-3 text-xs leading-relaxed text-muted">No suggestion matched. The node can still be created from your name, tags, and file types.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function PreviewLibraryTree({
  draftName,
  folders,
  isDraggingPreviewNode,
  previewDropTargetId,
  previewParentFolderId,
  selectedParentFolderId,
  onPreviewNodeDragStart,
  onPreviewNodeTargetHover,
  onSelectParent,
}: {
  draftName: string;
  folders: VirtualFolder[];
  isDraggingPreviewNode: boolean;
  previewDropTargetId: string | null;
  previewParentFolderId: string | null;
  selectedParentFolderId: string | null;
  onPreviewNodeDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onPreviewNodeTargetHover: (parentFolderId: string | null) => void;
  onSelectParent: (parentFolderId: string | null) => void;
}) {
  const treeRef = useRef<HTMLDivElement | null>(null);
  const visibleFolders = getVisiblePreviewFolders(folders);

  return (
    <div
      ref={treeRef}
      className="grid gap-0"
      onPointerMove={(event) => {
        if (!isDraggingPreviewNode) {
          return;
        }

        const target = event.target;

        if (target instanceof HTMLElement) {
          const row = target.closest<HTMLElement>("[data-preview-target-id]");

          if (row) {
            const targetId = row.dataset.previewTargetId ?? "__master__";
            onPreviewNodeTargetHover(targetId === "__master__" ? null : targetId);
            return;
          }
        }

        const rows = treeRef.current?.querySelectorAll<HTMLElement>("[data-preview-target-id]");

        if (!rows || rows.length === 0) {
          return;
        }

        const firstRowBounds = rows[0].getBoundingClientRect();
        const lastRowBounds = rows[rows.length - 1].getBoundingClientRect();

        if (event.clientY < firstRowBounds.top || event.clientY > lastRowBounds.bottom) {
          onPreviewNodeTargetHover(null);
        }
      }}
    >
      <button
        className={`add-node-tree-row add-node-tree-row-root ${previewParentFolderId === null ? "add-node-tree-row-selected" : ""} ${
          isDraggingPreviewNode && previewDropTargetId === null ? "add-node-tree-row-drop-target" : ""
        }`}
        data-preview-target-id="__master__"
        style={{ "--tree-depth": 0 } as CSSProperties}
        type="button"
        onPointerEnter={() => onPreviewNodeTargetHover(null)}
        onClick={() => onSelectParent(null)}
      >
        <span className="add-node-tree-toggle" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
        <span className="add-node-tree-label">
          <Backpack size={15} aria-hidden="true" />
          <span>Master</span>
        </span>
      </button>
      {getAlphabetizedTreeEntries(visibleFolders, previewParentFolderId === null ? draftName : null).map((entry) =>
        entry.type === "preview" ? (
          <PreviewNodeRow
            key="preview-root"
            depth={1}
            draftName={draftName}
            isDragging={isDraggingPreviewNode}
            onDragStart={onPreviewNodeDragStart}
          />
        ) : (
          <PreviewFolderBranch
            key={entry.folder.id}
            draftName={draftName}
            folder={entry.folder}
            depth={1}
            isDraggingPreviewNode={isDraggingPreviewNode}
            previewDropTargetId={previewDropTargetId}
            previewParentFolderId={previewParentFolderId}
            selectedParentFolderId={selectedParentFolderId}
            onPreviewNodeDragStart={onPreviewNodeDragStart}
            onPreviewNodeTargetHover={onPreviewNodeTargetHover}
            onSelectParent={onSelectParent}
          />
        ),
      )}
    </div>
  );
}

function PreviewFolderBranch({
  draftName,
  folder,
  depth,
  isDraggingPreviewNode,
  previewDropTargetId,
  previewParentFolderId,
  selectedParentFolderId,
  onPreviewNodeDragStart,
  onPreviewNodeTargetHover,
  onSelectParent,
}: {
  draftName: string;
  folder: VirtualFolder;
  depth: number;
  isDraggingPreviewNode: boolean;
  previewDropTargetId: string | null;
  previewParentFolderId: string | null;
  selectedParentFolderId: string | null;
  onPreviewNodeDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onPreviewNodeTargetHover: (parentFolderId: string | null) => void;
  onSelectParent: (parentFolderId: string | null) => void;
}) {
  const childEntries = getAlphabetizedTreeEntries(folder.children, previewParentFolderId === folder.id ? draftName : null);

  return (
    <div className="grid gap-0">
      <button
        className={`add-node-tree-row ${previewParentFolderId === folder.id ? "add-node-tree-row-selected" : ""} ${
          isDraggingPreviewNode && previewDropTargetId === folder.id ? "add-node-tree-row-drop-target" : ""
        }`}
        data-preview-target-id={folder.id}
        style={{ "--tree-depth": depth } as CSSProperties}
        type="button"
        onPointerEnter={() => onPreviewNodeTargetHover(folder.id)}
        onClick={() => onSelectParent(folder.id)}
      >
        <span className="add-node-tree-toggle" aria-hidden="true">
          {childEntries.length > 0 ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-40" />}
        </span>
        <span className="add-node-tree-label">
          {(childEntries.length > 0 || folder.children.length > 0) ? <FolderOpen size={15} aria-hidden="true" /> : <Folder size={15} aria-hidden="true" />}
          <span>{folder.name}</span>
        </span>
      </button>
      {childEntries.map((entry) =>
        entry.type === "preview" ? (
          <PreviewNodeRow
            key={`${folder.id}-preview`}
            depth={depth + 1}
            draftName={draftName}
            isDragging={isDraggingPreviewNode}
            onDragStart={onPreviewNodeDragStart}
          />
        ) : (
          <PreviewFolderBranch
            key={entry.folder.id}
            draftName={draftName}
            folder={entry.folder}
            depth={depth + 1}
            isDraggingPreviewNode={isDraggingPreviewNode}
            previewDropTargetId={previewDropTargetId}
            previewParentFolderId={previewParentFolderId}
            selectedParentFolderId={selectedParentFolderId}
            onPreviewNodeDragStart={onPreviewNodeDragStart}
            onPreviewNodeTargetHover={onPreviewNodeTargetHover}
            onSelectParent={onSelectParent}
          />
        ),
      )}
    </div>
  );
}

function PreviewNodeRow({
  depth,
  draftName,
  isDragging,
  onDragStart,
}: {
  depth: number;
  draftName: string;
  isDragging: boolean;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <div
      className={`add-node-tree-row add-node-tree-row-preview add-node-tree-row-draggable ${isDragging ? "add-node-tree-row-dragging" : ""}`}
      style={{ "--tree-depth": depth } as CSSProperties}
      onPointerDown={onDragStart}
    >
      <span className="add-node-tree-toggle" aria-hidden="true">
        <ChevronRight size={14} className="opacity-40" />
      </span>
      <span className="add-node-tree-label">
        <FolderPlus size={14} aria-hidden="true" />
        <span>{draftName}</span>
      </span>
      <span className="add-node-tree-badge">New</span>
    </div>
  );
}

function getAlphabetizedTreeEntries(folders: VirtualFolder[], previewName: string | null) {
  const entries: PreviewTreeEntry[] = folders.map((folder) => ({ type: "folder", folder }));

  if (previewName) {
    entries.push({ type: "preview", name: previewName });
  }

  return entries.sort((first, second) =>
    getPreviewEntryName(first).localeCompare(getPreviewEntryName(second), undefined, { sensitivity: "base" }),
  );
}

function getPreviewEntryName(entry: PreviewTreeEntry) {
  return entry.type === "folder" ? entry.folder.name : entry.name;
}

function getVisiblePreviewFolders(folders: VirtualFolder[]) {
  const sortedFolders = [...folders];

  if (sortedFolders.length === 1 && sortedFolders[0].templateId === previewRootTemplateId) {
    return [...sortedFolders[0].children];
  }

  return sortedFolders;
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

