import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Folder, Maximize2, Minimize2, Search, X } from "lucide-react";
import { clamp, isPrimaryPointer } from "../../app/workspace/appLayout";
import {
  normalizeLibraryMatchText,
  normalizedTextIncludesTerm,
  type LibraryTagDefinition,
  type LibraryTagSourceFolder,
  type LibraryTagSourceSection,
} from "../../libraryCatalog";

type TagLibraryResizeHandle = "top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-right" | "bottom-left";

type TagLibraryWindowRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const tagLibraryWindowPadding = 16;
const tagLibraryMinHeight = 420;
const tagLibraryMinWidth = 620;
const tagLibraryDefaultHeight = 860;
const tagLibraryDefaultWidth = 1180;

export function TagLibraryBrowser({
  sections,
  tags,
  onClose,
}: {
  sections: LibraryTagSourceSection[];
  tags: LibraryTagDefinition[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSystemMinimized, setIsSystemMinimized] = useState(true);
  const [isStylesMinimized, setIsStylesMinimized] = useState(true);
  const [windowRect, setWindowRect] = useState<TagLibraryWindowRect>(() => getDefaultTagLibraryWindowRect());
  const windowRef = useRef<HTMLElement | null>(null);
  const windowInteractionCleanupRef = useRef<(() => void) | null>(null);
  const normalizedQuery = normalizeLibraryMatchText(query);
  const visibleSections = useMemo(
    () => filterTagSourceSections(sections, normalizedQuery),
    [normalizedQuery, sections],
  );
  const systemSection = visibleSections.find((section) => section.id === "system") ?? null;
  const stylesSection = visibleSections.find((section) => section.id === "styles") ?? null;
  const contentSections = visibleSections.filter((section) => section.id !== "system" && section.id !== "styles");
  const visibleCount = useMemo(() => countTagSourceSectionTags(visibleSections), [visibleSections]);
  const modalClassName = isMaximized
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

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    return () => {
      windowInteractionCleanupRef.current?.();
    };
  }, []);

  function startWindowDrag(event: ReactPointerEvent<HTMLElement>) {
    if (isMaximized || !isPrimaryPointer(event)) {
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
    if (isMaximized || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
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
    if (isMaximized) {
      setWindowRect((rect) => constrainTagLibraryWindowRect(rect));
    }

    setIsMaximized((value) => !value);
  }

  return (
    <div className={overlayClassName}>
      <section
        aria-label="Tag library browser"
        aria-modal="true"
        className={modalClassName}
        ref={windowRef}
        role="dialog"
        style={modalStyle}
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
              {visibleCount}/{tags.length} tags visible
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <label className="relative w-[min(360px,45vw)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} aria-hidden="true" />
              <input
                autoFocus
                className="h-8 w-full rounded-sm border border-line bg-canvas pl-8 pr-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                placeholder="Search folders, files, tags..."
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

        <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <TagSourceSidePanel
            folder={systemSection}
            isMinimized={isSystemMinimized}
            label="System"
            side="left"
            onToggle={() => setIsSystemMinimized((value) => !value)}
          />
          <div className="min-h-0 overflow-auto border-x border-line bg-canvas">
            <div className="min-w-[520px] py-2">
              {contentSections.length > 0 ? (
                <TagSourceTree folders={contentSections} />
              ) : (
                <div className="mx-3 rounded-sm border border-line bg-surface p-4 text-sm text-muted">No tags match that search.</div>
              )}
            </div>
          </div>
          <TagSourceSidePanel
            folder={stylesSection}
            isMinimized={isStylesMinimized}
            label="Styles"
            side="right"
            onToggle={() => setIsStylesMinimized((value) => !value)}
          />
        </div>
      </section>
    </div>
  );
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
  const maxX = Math.max(tagLibraryWindowPadding, constraints.viewportWidth - width - tagLibraryWindowPadding);
  const maxY = Math.max(tagLibraryWindowPadding, constraints.viewportHeight - height - tagLibraryWindowPadding);

  return {
    height,
    width,
    x: clamp(rect.x, tagLibraryWindowPadding, maxX),
    y: clamp(rect.y, tagLibraryWindowPadding, maxY),
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

function TagSourceSidePanel({
  folder,
  isMinimized,
  label,
  side,
  onToggle,
}: {
  folder: LibraryTagSourceFolder | null;
  isMinimized: boolean;
  label: string;
  side: "left" | "right";
  onToggle: () => void;
}) {
  const count = folder ? countTagSourceFolderTags(folder) : 0;
  const chevron = side === "left"
    ? isMinimized ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />
    : isMinimized ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />;

  if (isMinimized) {
    return (
      <aside className="flex w-10 min-w-10 flex-col items-center border-line bg-surface py-2">
        <button
          aria-label={`Show ${label} tags`}
          className="icon-button"
          title={`Show ${label}`}
          type="button"
          onClick={onToggle}
        >
          {chevron}
        </button>
        <div className="mt-3 flex flex-1 items-center justify-center">
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-normal text-muted">
            {label}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 min-w-64 flex-col overflow-hidden bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line px-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Folder size={13} aria-hidden="true" />
          <span className="truncate text-[11px] font-semibold uppercase text-muted">{label}</span>
          <span className="text-[10px] text-muted">{count}</span>
        </div>
        <button
          aria-label={`Minimize ${label} tags`}
          className="icon-button h-7 w-7"
          title={`Minimize ${label}`}
          type="button"
          onClick={onToggle}
        >
          {chevron}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-2">
        {folder ? <TagSourceTree folders={[folder]} compact /> : <div className="px-3 text-xs text-muted">No matching tags.</div>}
      </div>
    </aside>
  );
}

function TagSourceTree({ compact = false, folders }: { compact?: boolean; folders: LibraryTagSourceFolder[] }) {
  return (
    <div className={compact ? "text-[11px]" : "text-xs"}>
      {folders.map((folder) => (
        <TagSourceFolderNode compact={compact} depth={0} folder={folder} key={folder.id} />
      ))}
    </div>
  );
}

function TagSourceFolderNode({
  compact,
  depth,
  folder,
}: {
  compact: boolean;
  depth: number;
  folder: LibraryTagSourceFolder;
}) {
  const tagCount = countTagSourceFolderTags(folder);

  return (
    <details className="group/tag-source-folder" open>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <div
          className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1 hover:bg-surface-raised"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <ChevronRight className="text-muted transition group-open/tag-source-folder:rotate-90" size={12} aria-hidden="true" />
          <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
            <Folder size={13} aria-hidden="true" />
            <span className="truncate">{folder.label}</span>
          </span>
          <span className="text-[10px] text-muted">{tagCount}</span>
        </div>
      </summary>
      {folder.files.map((file) => (
        <TagSourceFileNode compact={compact} depth={depth + 1} file={file} key={`${folder.id}:${file.id}`} />
      ))}
      {(folder.folders ?? []).map((childFolder) => (
        <TagSourceFolderNode compact={compact} depth={depth + 1} folder={childFolder} key={`${folder.id}:${childFolder.id}`} />
      ))}
    </details>
  );
}

function TagSourceFileNode({
  compact,
  depth,
  file,
}: {
  compact: boolean;
  depth: number;
  file: LibraryTagSourceFolder["files"][number];
}) {
  return (
    <details className="group/tag-source-file" open>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <div
          className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1 hover:bg-surface-raised"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <ChevronRight className="text-muted transition group-open/tag-source-file:rotate-90" size={12} aria-hidden="true" />
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-muted">
            <FileText size={12} aria-hidden="true" />
            <span className="truncate">{file.label}</span>
          </span>
          <span className="text-[10px] text-muted">{file.tags.length}</span>
        </div>
      </summary>
      {file.tags.map((tagDefinition) => (
        <TagSourceTagRow
          compact={compact}
          depth={depth + 1}
          key={tagDefinition.id}
          tagDefinition={tagDefinition}
        />
      ))}
    </details>
  );
}

function TagSourceTagRow({
  compact,
  depth,
  tagDefinition,
}: {
  compact: boolean;
  depth: number;
  tagDefinition: LibraryTagDefinition;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 px-2 py-0.5 leading-snug hover:bg-surface-raised"
      style={{ paddingLeft: `${22 + depth * 14}px` }}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getLibraryTagKindDotClass(tagDefinition.kind)}`} aria-hidden="true" />
      <span className={`truncate font-semibold text-ink ${compact ? "text-[11px]" : "text-xs"}`}>{tagDefinition.label}</span>
    </div>
  );
}

function filterTagSourceSections(sections: LibraryTagSourceSection[], normalizedQuery: string): LibraryTagSourceSection[] {
  if (!normalizedQuery) {
    return sections;
  }

  return sections.flatMap((section) => {
    const filteredSection = filterTagSourceFolder(section, normalizedQuery);
    return filteredSection ? [filteredSection] : [];
  });
}

function filterTagSourceFolder(folder: LibraryTagSourceFolder, normalizedQuery: string): LibraryTagSourceFolder | null {
  const folderMatches = normalizedTextIncludesTerm(normalizeLibraryMatchText(folder.label), normalizedQuery);
  const files = folder.files.flatMap((file) => {
      const fileMatches = normalizedTextIncludesTerm(normalizeLibraryMatchText(file.label), normalizedQuery);
      const matchingTags = fileMatches || folderMatches
        ? file.tags
        : file.tags.filter((tagDefinition) => tagLibraryDefinitionIncludesText(tagDefinition, normalizedQuery));

      return matchingTags.length > 0 ? [{ ...file, tags: matchingTags }] : [];
  });
  const folders = (folder.folders ?? []).flatMap((childFolder) => {
    const filteredFolder = folderMatches ? childFolder : filterTagSourceFolder(childFolder, normalizedQuery);
    return filteredFolder ? [filteredFolder] : [];
  });

  return files.length > 0 || folders.length > 0 ? { ...folder, files, folders } : null;
}

function countTagSourceSectionTags(sections: LibraryTagSourceSection[]) {
  return sections.reduce((total, section) => total + countTagSourceFolderTags(section), 0);
}

function countTagSourceFolderTags(folder: LibraryTagSourceFolder): number {
  return (
    folder.files.reduce((total, file) => total + file.tags.length, 0) +
    (folder.folders ?? []).reduce((total, childFolder) => total + countTagSourceFolderTags(childFolder), 0)
  );
}

function tagLibraryDefinitionIncludesText(tagDefinition: LibraryTagDefinition, normalizedQuery: string) {
  return normalizeLibraryMatchText([
    tagDefinition.id,
    tagDefinition.label,
    tagDefinition.kind,
    ...(tagDefinition.aliases ?? []),
    ...(tagDefinition.parents ?? []),
    ...(tagDefinition.implies ?? []),
    ...(tagDefinition.related ?? []),
    ...(tagDefinition.locksToFileTypes ?? []),
  ].join(" ")).includes(normalizedQuery);
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

