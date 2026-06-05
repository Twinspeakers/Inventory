# Work Log

## Native Editor Hubs

- Renamed the user-facing native document and vector destinations to Write and Draw.
- Added dedicated Inventory, Write, and Draw scene hubs with creation actions and native-file launch cards.
- Category selection no longer silently opens the first native file, and native files are split into their correct tree branches.

This is a compact milestone log, not an implementation diary.

Detailed behavior belongs in the code, durable choices belong in `DECISIONS.md`, persistence belongs in `INVENTORY_FORMAT.md`, and unrealized ideas belong in `DIRECTION.md`.

## Current Status

Inventory is a functional Tauri desktop app.

The project currently supports:

- Inventory project lifecycle through `Invent.nvi`
- Multiple source folders
- Virtual Master Library organisation
- Parent-aware library node suggestions
- Automatic and user-controlled tags
- Workspace search, sorting, view modes, and thumbnails
- Inspector notes, metadata, document statistics, and 3D controls
- Raster, vector, audio, PDF, Markdown, and 3D preview readers
- Themes
- Inventory-owned NVD documents
- NVD Pageless and A4 modes
- NVD fonts, font sizes, Bold, Italic, and paragraph alignment
- Optional dirty-NVD save reminder, persistent General setting, and refresh/close protection
- NVD toolbar zoom with preset-based Ctrl + Scroll stepping
- Sandboxed NVD style previews for Paragraph and Heading 1-3
- Semantic NVD paragraph and heading styles that apply to selected blocks and build the Navigation outline
- Per-document NVD style definitions that survive save, refresh, and reopen
- Automatic Paragraph-style inheritance with local formatting overrides
- Universal Edit-menu Undo and Redo routing across NVD history and session-only Library rename history
- Streamlined NVD Navigation pane focused entirely on the active document heading hierarchy

## Major Milestones

### Foundation

- Chose a local-first Tauri, React, TypeScript, Rust, and SQLite stack.
- Established file safety rules and the metadata-not-vault model.
- Added native recursive folder scanning and stable path-derived source asset IDs.

### Creative Workspace

- Built the DAW-like three-pane interface with resizable and collapsible panes.
- Added the Preview Stage, Workspace asset shelf, and Inspector.
- Added Light, Dark, and custom themes.
- Added dedicated reader modules for raster images, SVG, WAV audio, PDF, Markdown, and 3D models.

### Master Library

- Replaced early placeholder collections with a user-built virtual Master Library.
- Added a bundled parent-aware node catalog and domain-based tag catalog.
- Added automatic tags, user tags, kept tags, notes, display-name renaming, and suggested folder placement.
- Enforced one visible tree location per source file and file-type boundaries between folders.

### Inventory Projects

- Made `Invent.nvi` the active project source of truth.
- Added New Inventory, Open Inventory, Close Inventory, and project-owned source-folder state.
- Added separate `documents/`, `exports/`, `thumbnails/`, and `cache/` folders.
- Added the built-in Inventory branch for native files.

### NVD Documents

- Added creation, saving, reopening, renaming, and deletion for Inventory-owned `.nvd` files.
- Added Pageless and A4 presentation modes over shared content.
- Replaced per-page A4 editor instances with one document-wide editor and measured paper-sheet presentation.
- Hardened A4 for large documents with shared pagination caching, deferred Inspector page counts, single-pass page-offset projection, and frontend regression tests.
- Added bundled offline fonts, recent fonts, font size, Bold, Italic, and paragraph alignment.
- Added styled runs, durable paragraph blocks, Tiptap editing, Workspace previews, and Inspector statistics.
- Added explicit NVD document closing from the scene toolbar, with an always-on Save, Don't Save, or Cancel prompt for dirty documents.
- Wired semantic paragraph and heading roles through Tiptap and NVD persistence. Accepted style edits cascade through matching blocks, and Navigation presents headings in a clickable semantic hierarchy.
- Generalised reusable-style inheritance across Paragraph and Heading 1-3 blocks, while preserving local run overrides.
- Brought the Paragraph Inspector to life with custom, undoable line spacing, paragraph space before/after, and character spacing. These settings participate in semantic styles, `.nvd` persistence, A4 pagination, and Workspace previews.
- Kept Pageless, A4, preview, persistence, and page-count rendering on shared rules.

### NVV Vectors

- Established `.nvv` as Inventory Draw's atomically saved native canvas file.
- Established the NVV lifecycle, then reduced Draw to an intentionally atomic themed canvas with editable width and height in the Inspector.
- Removed the premature shape schema and separated Draw files into the Inventory-owned `vectors/` folder, including migration from the early shared `documents/` location.
- Added the first Draw Pen tool: clicking creates anchors, dragging creates paired Bezier handles, rendered paths persist in `.nvv`, and the Select tool remains as the starting tool.
- Wired Draw path edits into the universal Edit-menu Undo and Redo system with session history, so pen actions can be undone without leaving Pen mode.
- Added a first Direct Select mode for Draw: long-pressing the shared Select slot switches to anchor/handle editing, while regular Select targets the whole path with a neutral curve-aware free-transform box and hidden nodes.
- Added invisible Draw hit targets for paths, anchors, and handles so selection and direct editing are easier without making the visible controls heavier.
- Made Direct Select handle edits preserve smooth points by mirroring the opposite handle around the anchor.
- Added Ctrl-click anchor toggling between smooth and corner handle modes, with corner anchors marked by a subtle split line.
- Rotated corner-anchor split marks toward the local handle tangent while keeping anchor circles fixed.
- Replaced Draw's per-file Notes Inspector section with a manual-refresh SVG markup preview generated from the native `.nvv` path model.

### Architecture

- Extracted scene readers into `src/sceneReaders/`.
- Extracted the Workspace, Inspector, Preview Stage, Settings, Inventory project types, shared editor behavior, and NVD editor into feature modules.
- Split the library catalog into domain-based nodes and tags.
- Reduced `App.tsx` substantially, while leaving it as the main remaining orchestration and library-behavior concentration.

## Verification Baseline

The expected verification commands are:

```powershell
npm run build
npm test
cd src-tauri
cargo fmt --check
cargo test
```

## Logging Rule

Add a milestone only when it will still help after the implementation details have faded.

Delete entries once they become redundant with the durable docs.
