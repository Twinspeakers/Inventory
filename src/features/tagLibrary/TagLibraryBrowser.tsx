import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, FileText, Folder, Maximize2, Minimize2, Plus, Search, X } from "lucide-react";
import type { ProjectTagGroup } from "../../app/appTypes";
import { clamp, isPrimaryPointer } from "../../app/workspace/appLayout";
import {
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  type LibraryTagDefinition,
  type LibraryTagSourceFile,
  type LibraryTagSourceFolder,
  type LibraryTagSourceSection,
} from "../../libraryCatalog";
import {
  isTauriRuntime,
  type TagLibraryWindowAssetSnapshot,
} from "./tagLibraryWindowBridge";

type TagLibraryResizeHandle = "top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-right" | "bottom-left";

type TagLibraryWindowRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TagLibraryFileEntry = {
  id: string;
  kind: "library" | "project";
  label: string;
  leadingIcon?: "file" | "plus";
  pathLabels: string[];
  searchText: string;
  tagCount: number;
  tags: LibraryTagDefinition[];
};

type TagLibrarySectionEntry = {
  description: string;
  fileCount: number;
  files: TagLibraryFileEntry[];
  id: string;
  label: string;
  searchText: string;
  tagCount: number;
};

const tagLibraryWindowPadding = 16;
const tagLibraryMinHeight = 420;
const tagLibraryMinWidth = 760;
const tagLibraryDefaultHeight = 600;
const tagLibraryDefaultWidth = 870;

function formatTagLibraryFileDisplayLabel(file: Pick<TagLibraryFileEntry, "kind" | "label">) {
  if (file.kind !== "library") {
    return file.label;
  }

  const labelWithoutExtension = file.label.replace(/\.[^.]+$/, "");
  return labelWithoutExtension
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTagLibraryPathLabels(file: Pick<TagLibraryFileEntry, "kind" | "label" | "pathLabels">) {
  if (file.kind !== "library" || file.pathLabels.length === 0) {
    return file.pathLabels;
  }

  return [...file.pathLabels.slice(0, -1), formatTagLibraryFileDisplayLabel(file)];
}

export function TagLibraryBrowser({
  mode = "modal",
  projectTagGroups,
  selectedAsset,
  sections,
  tags,
  onCreateProjectTag,
  onCreateProjectTagGroup,
  onDeleteProjectTagGroup,
  onAddTag,
  onClose,
}: {
  mode?: "modal" | "window";
  projectTagGroups: ProjectTagGroup[];
  selectedAsset: TagLibraryWindowAssetSnapshot | null;
  sections: LibraryTagSourceSection[];
  tags: LibraryTagDefinition[];
  onCreateProjectTag: (groupId: string, label: string) => void;
  onCreateProjectTagGroup: (label: string) => void;
  onDeleteProjectTagGroup: (groupId: string) => void;
  onAddTag: (tag: string) => void;
  onClose: () => void;
}) {
  const isNativeWindowMode = mode === "window";
  const [query, setQuery] = useState("");
  const [draftProjectTag, setDraftProjectTag] = useState("");
  const [draftProjectTagGroup, setDraftProjectTagGroup] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowRect, setWindowRect] = useState<TagLibraryWindowRect>(() => getDefaultTagLibraryWindowRect());
  const windowRef = useRef<HTMLElement | null>(null);
  const windowInteractionCleanupRef = useRef<(() => void) | null>(null);
  const normalizedQuery = normalizeLibraryMatchText(query);
  const sectionEntries = useMemo(() => buildTagLibrarySectionEntries(sections, projectTagGroups), [projectTagGroups, sections]);
  const visibleSections = useMemo(
    () => filterTagLibrarySectionEntries(sectionEntries, normalizedQuery),
    [normalizedQuery, sectionEntries],
  );
  const fileEntriesById = useMemo(
    () => new Map(visibleSections.flatMap((section) => section.files.map((file) => [file.id, file] as const))),
    [visibleSections],
  );
  const visibleCount = useMemo(
    () => visibleSections.reduce((total, section) => total + section.tagCount, 0),
    [visibleSections],
  );
  const selectedSection = selectedSectionId ? visibleSections.find((section) => section.id === selectedSectionId) ?? null : visibleSections[0] ?? null;
  const selectedAssetTagIds = useMemo(
    () => new Set(normalizeLibraryNodeTagValues(selectedAsset?.tags ?? [])),
    [selectedAsset?.tags],
  );
  const selectedFile = selectedFileId ? fileEntriesById.get(selectedFileId) ?? null : null;
  const selectedTagDefinition = selectedFile?.tags.find((tagDefinition) => tagDefinition.id === selectedTagId) ?? null;
  const isCreateProjectGroupCardSelected = selectedFile?.id === "project-file:new-group";
  const isProjectSectionSelected = selectedSection?.id === "project-tags";
  const modalClassName = isNativeWindowMode
    ? "relative flex h-full w-full flex-col overflow-hidden border border-line bg-surface text-ink"
    : isMaximized
      ? "relative flex h-full w-full flex-col overflow-hidden border border-line bg-surface text-ink"
      : "absolute flex flex-col overflow-hidden rounded-sm border border-line bg-surface text-ink";
  const overlayClassName = isMaximized ? "fixed inset-0 z-[60] bg-black/45 p-0" : "fixed inset-0 z-[60] bg-black/45";
  const modalStyle = isMaximized
    ? undefined
    : ({
        height: windowRect.height,
        left: windowRect.x,
        top: windowRect.y,
        width: windowRect.width,
      } satisfies CSSProperties);

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
    function handleWindowResize() {
      setWindowRect((rect) => constrainTagLibraryWindowRect(rect));
    }

    if (isNativeWindowMode) {
      return;
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [isNativeWindowMode]);

  useEffect(() => {
    if (!isNativeWindowMode || !isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let unlistenResize: (() => void) | null = null;
    const currentWindow = getCurrentWindow();

    void currentWindow.isMaximized().then((value) => {
      if (!disposed) {
        setIsMaximized(value);
      }
    });

    void currentWindow
      .onResized(async () => {
        const maximized = await currentWindow.isMaximized();

        if (!disposed) {
          setIsMaximized(maximized);
        }
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenResize = unlisten;
      });

    return () => {
      disposed = true;
      unlistenResize?.();
    };
  }, [isNativeWindowMode]);

  useEffect(() => {
    return () => {
      windowInteractionCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (selectedSectionId && visibleSections.some((section) => section.id === selectedSectionId)) {
      return;
    }

    setSelectedSectionId(visibleSections[0]?.id ?? null);
  }, [selectedSectionId, visibleSections]);

  useEffect(() => {
    if (!selectedFileId) {
      return;
    }

    if (fileEntriesById.has(selectedFileId)) {
      return;
    }

    const nextSelectedSection = selectedSectionId ? visibleSections.find((section) => section.id === selectedSectionId) ?? null : visibleSections[0] ?? null;
    setSelectedFileId(nextSelectedSection?.id === "project-tags" ? nextSelectedSection.files[0]?.id ?? null : null);
  }, [fileEntriesById, selectedFileId, selectedSectionId, visibleSections]);

  useEffect(() => {
    if (selectedFile?.tags.some((tagDefinition) => tagDefinition.id === selectedTagId)) {
      return;
    }

    setSelectedTagId(selectedFile?.tags[0]?.id ?? null);
  }, [selectedFile, selectedTagId]);

  function startWindowDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;

    if (targetElement?.closest("button, input, textarea, select, a")) {
      return;
    }

    const element = windowRef.current;

    if (!element) {
      return;
    }

    event.preventDefault();

    if (isNativeWindowMode && isTauriRuntime()) {
      void getCurrentWindow().startDragging();
      return;
    }

    if (isMaximized) {
      return;
    }

    windowInteractionCleanupRef.current?.();

    const bounds = element.getBoundingClientRect();
    const dragRect = constrainTagLibraryWindowRect({
      height: bounds.height,
      width: bounds.width,
      x: bounds.left,
      y: bounds.top,
    });
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;
    const pointerId = event.pointerId;
    setWindowRect(dragRect);
    document.body.classList.add("is-dragging-tag-library");

    function handlePointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      setWindowRect(
        constrainTagLibraryWindowRect({
          height: dragRect.height,
          width: dragRect.width,
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        }),
      );
    }

    function cleanupDrag() {
      document.body.classList.remove("is-dragging-tag-library");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    }

    function stopDrag(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      cleanupDrag();

      if (windowInteractionCleanupRef.current === cleanupDrag) {
        windowInteractionCleanupRef.current = null;
      }
    }

    windowInteractionCleanupRef.current = cleanupDrag;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  function startWindowResize(event: ReactPointerEvent<HTMLDivElement>, handle: TagLibraryResizeHandle) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isNativeWindowMode && isTauriRuntime()) {
      void getCurrentWindow().startResizeDragging(getTagLibraryResizeDirection(handle));
      return;
    }

    if (isMaximized) {
      return;
    }

    windowInteractionCleanupRef.current?.();

    const cursorClassName = getTagLibraryResizeCursorClassName(handle);
    const startRect = constrainTagLibraryWindowRect(windowRect);
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    setWindowRect(startRect);
    document.body.classList.add("is-resizing-tag-library", cursorClassName);

    function handlePointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      setWindowRect(resizeTagLibraryWindowRect(startRect, handle, moveEvent.clientX - startX, moveEvent.clientY - startY));
    }

    function cleanupResize() {
      document.body.classList.remove("is-resizing-tag-library", cursorClassName);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    }

    function stopResize(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      cleanupResize();

      if (windowInteractionCleanupRef.current === cleanupResize) {
        windowInteractionCleanupRef.current = null;
      }
    }

    windowInteractionCleanupRef.current = cleanupResize;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function toggleMaximized() {
    if (isNativeWindowMode && isTauriRuntime()) {
      const currentWindow = getCurrentWindow();

      if (isMaximized) {
        void currentWindow.unmaximize();
      } else {
        void currentWindow.maximize();
      }

      return;
    }

    if (isMaximized) {
      setWindowRect((rect) => constrainTagLibraryWindowRect(rect));
    }

    setIsMaximized((value) => !value);
  }

  function addSelectedTag() {
    if (!selectedAsset || !selectedTagDefinition || selectedAssetTagIds.has(normalizeLibraryMatchText(selectedTagDefinition.id))) {
      return;
    }

    onAddTag(selectedTagDefinition.id);
  }

  function addTag(tagId: string) {
    if (!selectedAsset || selectedAssetTagIds.has(normalizeLibraryMatchText(tagId))) {
      return;
    }

    onAddTag(tagId);
  }

  function handleCreateProjectTagGroup() {
    const label = draftProjectTagGroup.trim();

    if (!label) {
      return;
    }

    onCreateProjectTagGroup(label);
    setDraftProjectTagGroup("");
  }

  function handleCreateProjectTag() {
    if (!selectedFile || selectedFile.kind !== "project") {
      return;
    }

    const label = draftProjectTag.trim();

    if (!label) {
      return;
    }

    onCreateProjectTag(selectedFile.id.replace("project-file:", ""), label);
    setDraftProjectTag("");
  }

  function handleDeleteProjectTagGroup(groupId: string) {
    onDeleteProjectTagGroup(groupId);
  }

  const content = (
    <div className={isNativeWindowMode ? "h-screen w-screen bg-app p-px" : overlayClassName}>
      <section
        aria-label="Tag library browser"
        aria-modal="true"
        className={modalClassName}
        ref={windowRef}
        role="dialog"
        style={isNativeWindowMode ? undefined : modalStyle}
      >
        {!isMaximized ? (
          <>
            <div
              aria-label="Resize tag library from top edge"
              aria-orientation="horizontal"
              className="tag-library-resize-handle tag-library-resize-handle-top"
              onPointerDown={(event) => startWindowResize(event, "top")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from right edge"
              aria-orientation="vertical"
              className="tag-library-resize-handle tag-library-resize-handle-right"
              onPointerDown={(event) => startWindowResize(event, "right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom edge"
              aria-orientation="horizontal"
              className="tag-library-resize-handle tag-library-resize-handle-bottom"
              onPointerDown={(event) => startWindowResize(event, "bottom")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from left edge"
              aria-orientation="vertical"
              className="tag-library-resize-handle tag-library-resize-handle-left"
              onPointerDown={(event) => startWindowResize(event, "left")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from top-left corner"
              className="tag-library-resize-handle tag-library-resize-handle-top-left"
              onPointerDown={(event) => startWindowResize(event, "top-left")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from top-right corner"
              className="tag-library-resize-handle tag-library-resize-handle-top-right"
              onPointerDown={(event) => startWindowResize(event, "top-right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom-right corner"
              className="tag-library-resize-handle tag-library-resize-handle-bottom-right"
              onPointerDown={(event) => startWindowResize(event, "bottom-right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom-left corner"
              className="tag-library-resize-handle tag-library-resize-handle-bottom-left"
              onPointerDown={(event) => startWindowResize(event, "bottom-left")}
              role="separator"
              title="Resize tag library"
            />
          </>
        ) : null}

        <header
          className={`${isMaximized ? "" : "tag-library-drag-header"} flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4`}
          onPointerDown={startWindowDrag}
        >
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">Tag Library</h2>
            <span className="tag-small">{visibleCount}</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <button
              className="tag-add-button"
              disabled={!selectedAsset || !selectedTagDefinition || selectedAssetTagIds.has(normalizeLibraryMatchText(selectedTagDefinition.id))}
              title={selectedTagDefinition ? `Add ${selectedTagDefinition.label}` : "Select a tag to add"}
              type="button"
              onClick={addSelectedTag}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add</span>
            </button>
            <label className="relative w-[min(360px,45vw)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} aria-hidden="true" />
              <input
                autoFocus
                className="h-8 w-full rounded-sm border border-line bg-canvas pl-8 pr-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                placeholder="..."
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label={isMaximized ? "Restore tag library" : "Maximize tag library"}
              title={isMaximized ? "Restore" : "Maximize"}
              type="button"
              onClick={toggleMaximized}
            >
              {isMaximized ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            </button>
            <button className="icon-button" aria-label="Close tag library" title="Close" type="button" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="tag-library-browser-layout min-h-0 flex-1 overflow-hidden">
          <section className="min-h-0 border-r border-line bg-canvas">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {selectedAsset ? (
                  <div className="mb-3 border-b border-line pb-3 pl-2">
                    <div className="text-base font-semibold text-ink">
                      {selectedAsset.name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedAsset.tags.length > 0 ? (
                        selectedAsset.tags.map((tag) => (
                          <span className="tag tag-system" key={tag}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted">No tags assigned yet.</span>
                      )}
                    </div>
                  </div>
                ) : null}
                {visibleSections.length > 0 ? (
                  <div className="tag-library-umbrella-columns">
                    {visibleSections.flatMap((section) => {
                      const isProjectSection = section.id === "project-tags";

                      if (isProjectSection) {
                        return section.files.map((file) => {
                          const isSelected = selectedFile?.id === file.id;
                          const isCreateCard = file.leadingIcon === "plus";

                          return (
                            <section
                              className={`tag-library-umbrella-card ${
                                isSelected ? "border-steel bg-canvas" : "hover:border-steel hover:bg-canvas"
                              }`}
                              key={file.id}
                            >
                              <button
                                className={`w-full px-3 py-3 text-left ${isCreateCard ? "flex min-h-[52px] items-center justify-center" : "flex items-center justify-between gap-3"}`}
                                type="button"
                                onClick={() => {
                                  setSelectedSectionId(section.id);
                                  setSelectedFileId(file.id);
                                }}
                              >
                                {isCreateCard ? (
                                  <Plus size={18} aria-hidden="true" />
                                ) : (
                                  <>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <FileText size={14} aria-hidden="true" />
                                        <span className="truncate text-sm font-semibold text-ink">{formatTagLibraryFileDisplayLabel(file)}</span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="tag-small">{file.tagCount}</span>
                                      <button
                                        aria-label={`Delete ${file.label}`}
                                        className="icon-button h-7 w-7 text-xs"
                                        title={`Delete ${file.label}`}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDeleteProjectTagGroup(file.id.replace("project-file:", ""));
                                        }}
                                      >
                                        x
                                      </button>
                                    </div>
                                  </>
                                )}
                              </button>
                            </section>
                          );
                        });
                      }

                      const isSelected = selectedSectionId === section.id;

                      return (
                        <section
                          className={`tag-library-umbrella-card ${
                            isSelected ? "border-steel bg-canvas" : "hover:border-steel hover:bg-canvas"
                          }`}
                          key={section.id}
                        >
                          <button
                            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                            type="button"
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setSelectedFileId(null);
                            }}
                          >
                            <div className="min-w-0 flex flex-1 items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Folder size={14} aria-hidden="true" />
                                <span className="truncate text-sm font-semibold text-ink">{section.label}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="tag-small">{section.tagCount}</span>
                              <span className="icon-button h-7 w-7" aria-hidden="true">
                                <ChevronRight size={14} />
                              </span>
                            </div>
                          </button>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-sm border border-line bg-surface p-4 text-sm text-muted">No tags match that search.</div>
                )}
              </div>
            </div>
          </section>

          <aside className="min-h-0 bg-surface">
            {selectedSection ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-line px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-ink">
                        {selectedFile?.kind === "project" ? selectedFile.label : selectedSection.label}
                      </h3>
                          {selectedFile?.kind !== "project" ? (
                        <p className="mt-1 text-xs text-muted">
                          {selectedFile ? formatTagLibraryPathLabels(selectedFile).join(" / ") : selectedSection.description}
                        </p>
                      ) : null}
                    </div>
                    {selectedFile?.kind !== "project" ? <span className="tag-small">{selectedSection.tagCount} tags</span> : null}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  {!isProjectSectionSelected ? (
                    <div className="mb-4">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-normal text-muted">Files</div>
                      <div className="space-y-2">
                        {selectedSection.files.map((file) => {
                          const isSelected = selectedFile?.id === file.id;

                          return (
                            <section
                              className={`overflow-hidden rounded-sm border transition ${
                                isSelected ? "border-steel bg-canvas" : "border-line bg-surface hover:border-steel hover:bg-canvas"
                              }`}
                              key={file.id}
                            >
                              <button
                                className="flex w-full items-center gap-3 px-3 py-2 text-left"
                                type="button"
                                onClick={() => setSelectedFileId((currentId) => (currentId === file.id ? null : file.id))}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <FileText size={13} aria-hidden="true" />
                                  <div className="truncate text-sm font-medium text-ink">{formatTagLibraryFileDisplayLabel(file)}</div>
                                </div>
                                <span className="tag-small shrink-0">{file.tagCount}</span>
                                {isSelected ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                              </button>
                              {isSelected ? (
                                <div className="border-t border-line px-3 py-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {file.tags.map((tagDefinition) => {
                                      const isAdded = selectedAssetTagIds.has(normalizeLibraryMatchText(tagDefinition.id));

                                      return (
                                        <button
                                          className={`tag inline-flex items-center gap-1.5 ${isAdded ? "tag-kept" : "tag-editable"}`}
                                          disabled={!selectedAsset || isAdded}
                                          key={tagDefinition.id}
                                          type="button"
                                          onClick={() => addTag(tagDefinition.id)}
                                        >
                                          <span>{tagDefinition.label}</span>
                                          {isAdded ? <Check size={11} aria-hidden="true" /> : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {selectedFile?.kind === "project" && !isCreateProjectGroupCardSelected ? (
                    <div className="mb-4 flex gap-2">
                      <input
                        className="h-8 min-w-0 flex-1 rounded-sm border border-line bg-surface px-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                        placeholder="Tag name"
                        value={draftProjectTag}
                        onChange={(event) => setDraftProjectTag(event.currentTarget.value)}
                      />
                      <button className="tag-add-button h-8 px-3" disabled={!draftProjectTag.trim()} type="button" onClick={handleCreateProjectTag}>
                        <span>Create Tag</span>
                      </button>
                    </div>
                  ) : null}
                  {isCreateProjectGroupCardSelected ? (
                    <div className="mb-4 flex gap-2">
                      <input
                        className="h-8 min-w-0 flex-1 rounded-sm border border-line bg-surface px-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                        placeholder="Group name"
                        value={draftProjectTagGroup}
                        onChange={(event) => setDraftProjectTagGroup(event.currentTarget.value)}
                      />
                      <button className="tag-add-button h-8 px-3" disabled={!draftProjectTagGroup.trim()} type="button" onClick={handleCreateProjectTagGroup}>
                        <span>+</span>
                      </button>
                    </div>
                  ) : null}
                  {isProjectSectionSelected && !isCreateProjectGroupCardSelected && selectedFile ? (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Tags</div>
                        <button
                          className="tag-add-button"
                          disabled={!selectedAsset || !selectedTagDefinition || selectedAssetTagIds.has(normalizeLibraryMatchText(selectedTagDefinition.id))}
                          type="button"
                          onClick={addSelectedTag}
                        >
                          <Plus size={14} aria-hidden="true" />
                          <span>Add</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedFile.tags.map((tagDefinition) => {
                          const isSelected = selectedTagId === tagDefinition.id;
                          const isAdded = selectedAssetTagIds.has(normalizeLibraryMatchText(tagDefinition.id));

                          return (
                            <button
                              className={`flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition ${
                                isSelected ? "border-steel bg-canvas" : "border-line bg-surface hover:border-steel hover:bg-canvas"
                              }`}
                              key={tagDefinition.id}
                              type="button"
                              onClick={() => setSelectedTagId(tagDefinition.id)}
                            >
                              <span className={`h-2 w-2 shrink-0 rounded-full ${getLibraryTagKindDotClass(tagDefinition.kind)}`} aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-ink">{tagDefinition.label}</div>
                                {selectedFile.kind !== "project" ? <div className="truncate text-[11px] text-muted">{tagDefinition.id}</div> : null}
                              </div>
                              {isAdded ? <Check className="shrink-0 text-steel" size={14} aria-hidden="true" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-5 text-center text-sm text-muted">
                Select a file button from one of the umbrella cards.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );

  if (typeof document === "undefined" || isNativeWindowMode) {
    return content;
  }

  return createPortal(content, document.body);
}

function buildTagLibrarySectionEntries(sections: LibraryTagSourceSection[], projectTagGroups: ProjectTagGroup[]): TagLibrarySectionEntry[] {
  const librarySections = sections.map((section) => {
      const files = flattenTagLibraryFiles(section, [section.label]);
      const tagCount = files.reduce((total, file) => total + file.tagCount, 0);

      return {
        description: `${files.length} files`,
        fileCount: files.length,
        files,
        id: section.id,
        label: section.label,
        searchText: normalizeLibraryMatchText([
          section.label,
          ...files.map((file) => file.searchText),
        ].join(" ")),
        tagCount,
      } satisfies TagLibrarySectionEntry;
    });
  const projectSection = buildProjectTagSectionEntry(projectTagGroups);

  return [...librarySections, projectSection];
}

function flattenTagLibraryFiles(folder: LibraryTagSourceFolder, pathLabels: string[]): TagLibraryFileEntry[] {
  const currentFiles = folder.files.map((file) => {
    const filePathLabels = [...pathLabels, file.label];

    return {
      id: `${folder.id}:${file.id}`,
      kind: "library",
      leadingIcon: "file",
      label: file.label,
      pathLabels: filePathLabels,
      searchText: normalizeLibraryMatchText([
        ...filePathLabels,
        ...file.tags.map((tag) => `${tag.id} ${tag.label} ${(tag.aliases ?? []).join(" ")}`),
      ].join(" ")),
      tagCount: file.tags.length,
      tags: file.tags,
    } satisfies TagLibraryFileEntry;
  });

  const descendantFiles = (folder.folders ?? []).flatMap((childFolder) => flattenTagLibraryFiles(childFolder, [...pathLabels, childFolder.label]));

  return [...currentFiles, ...descendantFiles].sort((first, second) => first.label.localeCompare(second.label));
}

function buildProjectTagSectionEntry(projectTagGroups: ProjectTagGroup[]): TagLibrarySectionEntry {
  const files: TagLibraryFileEntry[] = projectTagGroups
    .map((group) => ({
      id: `project-file:${group.id}`,
      kind: "project",
      leadingIcon: "file",
      label: group.label,
      pathLabels: ["Project Tags", group.label],
      searchText: normalizeLibraryMatchText([
        "Project Tags",
        group.label,
        ...group.tags.map((tag) => `${tag.id} ${tag.label}`),
      ].join(" ")),
      tagCount: group.tags.length,
      tags: group.tags.map((tag) => ({
        id: tag.id,
        kind: "content",
        label: tag.label,
      })),
    } satisfies TagLibraryFileEntry))
    .sort((first, second) => first.label.localeCompare(second.label));
  files.push({
    id: "project-file:new-group",
    kind: "project",
    leadingIcon: "plus",
    label: "Create Group",
    pathLabels: ["Project Tags", "Create Group"],
    searchText: normalizeLibraryMatchText("Project Tags New Group Create Group"),
    tagCount: 0,
    tags: [],
  });
  const tagCount = files.reduce((total, file) => total + file.tagCount, 0);

  return {
    description: `${projectTagGroups.length} groups`,
    fileCount: files.length,
    files,
    id: "project-tags",
    label: "Project Tags",
    searchText: normalizeLibraryMatchText([
      "Project Tags",
      ...files.map((file) => file.searchText),
    ].join(" ")),
    tagCount,
  };
}

function filterTagLibrarySectionEntries(sections: TagLibrarySectionEntry[], normalizedQuery: string) {
  if (!normalizedQuery) {
    return sections;
  }

  return sections.flatMap((section) => {
    const sectionMatches = normalizedTextIncludesTerm(normalizeLibraryMatchText(section.label), normalizedQuery);
    const files = sectionMatches ? section.files : section.files.filter((file) => file.searchText.includes(normalizedQuery));

    return files.length > 0 ? [{ ...section, files, fileCount: files.length, tagCount: files.reduce((total, file) => total + file.tagCount, 0) }] : [];
  });
}

function getDefaultTagLibraryWindowRect(): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  const width = Math.min(tagLibraryDefaultWidth, constraints.maxWidth);
  const height = Math.min(tagLibraryDefaultHeight, constraints.maxHeight);

  return constrainTagLibraryWindowRect({
    height,
    width,
    x: Math.round((constraints.viewportWidth - width) / 2),
    y: Math.round((constraints.viewportHeight - height) / 2),
  });
}

function constrainTagLibraryWindowRect(rect: TagLibraryWindowRect): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  const width = clamp(rect.width, constraints.minWidth, constraints.maxWidth);
  const height = clamp(rect.height, constraints.minHeight, constraints.maxHeight);

  return {
    height,
    width,
    x: rect.x,
    y: rect.y,
  };
}

function resizeTagLibraryWindowRect(
  startRect: TagLibraryWindowRect,
  handle: TagLibraryResizeHandle,
  deltaX: number,
  deltaY: number,
): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  let left = startRect.x;
  let top = startRect.y;
  let right = startRect.x + startRect.width;
  let bottom = startRect.y + startRect.height;

  if (handle.includes("left")) {
    left = clamp(startRect.x + deltaX, tagLibraryWindowPadding, right - constraints.minWidth);
  }

  if (handle.includes("right")) {
    right = clamp(startRect.x + startRect.width + deltaX, left + constraints.minWidth, constraints.viewportWidth - tagLibraryWindowPadding);
  }

  if (handle.includes("top")) {
    top = clamp(startRect.y + deltaY, tagLibraryWindowPadding, bottom - constraints.minHeight);
  }

  if (handle.includes("bottom")) {
    bottom = clamp(startRect.y + startRect.height + deltaY, top + constraints.minHeight, constraints.viewportHeight - tagLibraryWindowPadding);
  }

  return constrainTagLibraryWindowRect({
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  });
}

function getTagLibraryWindowConstraints() {
  const viewportWidth = typeof window === "undefined" ? tagLibraryDefaultWidth + tagLibraryWindowPadding * 2 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? tagLibraryDefaultHeight + tagLibraryWindowPadding * 2 : window.innerHeight;
  const maxWidth = Math.max(240, viewportWidth - tagLibraryWindowPadding * 2);
  const maxHeight = Math.max(260, viewportHeight - tagLibraryWindowPadding * 2);

  return {
    maxHeight,
    maxWidth,
    minHeight: Math.min(tagLibraryMinHeight, maxHeight),
    minWidth: Math.min(tagLibraryMinWidth, maxWidth),
    viewportHeight,
    viewportWidth,
  };
}

function getTagLibraryResizeCursorClassName(handle: TagLibraryResizeHandle) {
  if (handle === "top-left" || handle === "bottom-right") {
    return "is-resizing-tag-library-nwse";
  }

  if (handle === "top-right" || handle === "bottom-left") {
    return "is-resizing-tag-library-nesw";
  }

  if (handle === "left" || handle === "right") {
    return "is-resizing-tag-library-ew";
  }

  return "is-resizing-tag-library-ns";
}

function getTagLibraryResizeDirection(handle: TagLibraryResizeHandle) {
  switch (handle) {
    case "top":
      return "North";
    case "right":
      return "East";
    case "bottom":
      return "South";
    case "left":
      return "West";
    case "top-left":
      return "NorthWest";
    case "top-right":
      return "NorthEast";
    case "bottom-right":
      return "SouthEast";
    case "bottom-left":
    default:
      return "SouthWest";
  }
}

function getLibraryTagKindDotClass(kind: LibraryTagDefinition["kind"]) {
  switch (kind) {
    case "system":
      return "bg-steel";
    case "style":
      return "bg-copper";
    case "workflow":
      return "bg-muted";
    case "content":
    default:
      return "bg-[rgb(var(--color-brand-blue))]";
  }
}
