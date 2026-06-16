import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, FileText, Folder, Maximize2, Minimize2, Plus, Search, X } from "lucide-react";
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
  label: string;
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

export function TagLibraryBrowser({
  mode = "modal",
  selectedAsset,
  sections,
  tags,
  onAddTag,
  onClose,
}: {
  mode?: "modal" | "window";
  selectedAsset: TagLibraryWindowAssetSnapshot | null;
  sections: LibraryTagSourceSection[];
  tags: LibraryTagDefinition[];
  onAddTag: (tag: string) => void;
  onClose: () => void;
}) {
  const isNativeWindowMode = mode === "window";
  const [query, setQuery] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowRect, setWindowRect] = useState<TagLibraryWindowRect>(() => getDefaultTagLibraryWindowRect());
  const windowRef = useRef<HTMLElement | null>(null);
  const windowInteractionCleanupRef = useRef<(() => void) | null>(null);
  const normalizedQuery = normalizeLibraryMatchText(query);
  const sectionEntries = useMemo(() => buildTagLibrarySectionEntries(sections), [sections]);
  const visibleSections = useMemo(
    () => filterTagLibrarySectionEntries(sectionEntries, normalizedQuery),
    [normalizedQuery, sectionEntries],
  );
  const sectionColumns = useMemo(() => splitSectionsIntoColumns(visibleSections, 2), [visibleSections]);
  const fileEntriesById = useMemo(
    () => new Map(visibleSections.flatMap((section) => section.files.map((file) => [file.id, file] as const))),
    [visibleSections],
  );
  const visibleCount = useMemo(
    () => visibleSections.reduce((total, section) => total + section.tagCount, 0),
    [visibleSections],
  );
  const selectedAssetTagIds = useMemo(
    () => new Set(normalizeLibraryNodeTagValues(selectedAsset?.tags ?? [])),
    [selectedAsset?.tags],
  );
  const selectedFile = selectedFileId ? fileEntriesById.get(selectedFileId) ?? null : null;
  const selectedTagDefinition = selectedFile?.tags.find((tagDefinition) => tagDefinition.id === selectedTagId) ?? null;
  const autoExpandResults = Boolean(normalizedQuery);
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
    if (selectedFileId && fileEntriesById.has(selectedFileId)) {
      return;
    }

    setSelectedFileId(visibleSections[0]?.files[0]?.id ?? null);
  }, [fileEntriesById, selectedFileId, visibleSections]);

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

  function toggleSection(sectionId: string) {
    setExpandedSectionIds((ids) => (ids.includes(sectionId) ? ids.filter((id) => id !== sectionId) : [...ids, sectionId]));
  }

  function addSelectedTag() {
    if (!selectedAsset || !selectedTagDefinition || selectedAssetTagIds.has(normalizeLibraryMatchText(selectedTagDefinition.id))) {
      return;
    }

    onAddTag(selectedTagDefinition.id);
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
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Tag Library</h2>
            <p className="truncate text-[11px] text-muted">
              {selectedAsset ? `Adding tags to ${selectedAsset.name} - ` : ""}
              {visibleCount}/{tags.length} tags visible
            </p>
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
                placeholder="Search umbrellas, files, tags..."
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
                {visibleSections.length > 0 ? (
                  <div className="tag-library-umbrella-columns">
                    {sectionColumns.map((columnSections, columnIndex) => (
                      <div className="tag-library-umbrella-column" key={`column-${columnIndex}`}>
                        {columnSections.map((section) => {
                          const isExpanded = autoExpandResults || expandedSectionIds.includes(section.id);

                          return (
                            <section className="tag-library-umbrella-card" key={section.id}>
                              <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-3">
                                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => toggleSection(section.id)}>
                                  <div className="flex items-center gap-2">
                                    <Folder size={14} aria-hidden="true" />
                                    <span className="truncate text-sm font-semibold text-ink">{section.label}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted">{section.description}</p>
                                </button>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="tag-small">{section.tagCount}</span>
                                  <button
                                    aria-expanded={isExpanded}
                                    className="icon-button h-7 w-7"
                                    title={isExpanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                  >
                                    {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                                  </button>
                                </div>
                              </div>

                              {isExpanded ? (
                                <div className="tag-library-file-grid px-3 py-3">
                                  {section.files.map((file) => {
                                    const isSelected = selectedFile?.id === file.id;

                                    return (
                                      <button
                                        className={`tag-library-file-button ${
                                          isSelected ? "border-steel bg-canvas" : "border-line bg-surface hover:border-steel hover:bg-canvas"
                                        }`}
                                        key={file.id}
                                        type="button"
                                        onClick={() => setSelectedFileId(file.id)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText size={13} aria-hidden="true" />
                                          <span className="truncate text-sm font-medium text-ink">{file.label}</span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-muted">{file.tagCount} tags</p>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </section>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-sm border border-line bg-surface p-4 text-sm text-muted">No tags match that search.</div>
                )}
              </div>
            </div>
          </section>

          <aside className="min-h-0 bg-surface">
            {selectedFile ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-line px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-ink">{selectedFile.label}</h3>
                      <p className="mt-1 text-xs text-muted">{selectedFile.pathLabels.join(" / ")}</p>
                    </div>
                    <span className="tag-small">{selectedFile.tagCount} tags</span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Tags</div>
                      <p className="mt-1 text-xs text-muted">
                        {selectedAsset ? "Select a tag, then add it to the current file." : "Select a file in the inspector to add tags."}
                      </p>
                    </div>
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
                            <div className="truncate text-[11px] text-muted">{tagDefinition.id}</div>
                          </div>
                          {isAdded ? <Check className="shrink-0 text-steel" size={14} aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTagDefinition ? (
                    <div className="mt-4 rounded-sm border border-line bg-canvas p-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getLibraryTagKindDotClass(selectedTagDefinition.kind)}`} aria-hidden="true" />
                        <h4 className="text-sm font-semibold text-ink">{selectedTagDefinition.label}</h4>
                        <span className="tag-small">{selectedTagDefinition.kind}</span>
                      </div>
                      {selectedTagDefinition.description ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted">{selectedTagDefinition.description}</p>
                      ) : null}
                    </div>
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

function buildTagLibrarySectionEntries(sections: LibraryTagSourceSection[]): TagLibrarySectionEntry[] {
  return sections
    .map((section) => {
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
    })
    .sort((first, second) => first.label.localeCompare(second.label));
}

function flattenTagLibraryFiles(folder: LibraryTagSourceFolder, pathLabels: string[]): TagLibraryFileEntry[] {
  const currentFiles = folder.files.map((file) => {
    const filePathLabels = [...pathLabels, file.label];

    return {
      id: `${folder.id}:${file.id}`,
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

function splitSectionsIntoColumns(sections: TagLibrarySectionEntry[], columnCount: number) {
  const columns = Array.from({ length: columnCount }, () => [] as TagLibrarySectionEntry[]);

  sections.forEach((section, index) => {
    columns[index % columnCount].push(section);
  });

  return columns;
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
