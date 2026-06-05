# Handover

Hello, future Codex.

Inventory is no longer a scaffold or a speculative mockup. It is a real Tauri desktop app that has grown through close visual iteration with its user. Read the current code and the durable docs before assuming the early plan still describes the product.

## The User And The Work

The user has a strong visual sense and often discovers the right design by using the app, noticing a small discomfort, and refining it until the interface feels inevitable.

Work well with them:

- Be proactive and implement once the intent is clear.
- Use chunks for large features so the user can test the shape before the next layer lands.
- Treat their visual feedback as product information, not cosmetic fussiness.
- For unusual interactions, restate the behavior in plain language before building. A small misunderstanding can create a large amount of wrong code.
- Preserve the app's calm DAW-like density. Avoid marketing layouts, excessive cards, decorative padding, and noisy color.
- Keep the conversation warm. This project has been built with a lot of delight.

## What Inventory Is Now

Inventory is a local-first creative asset library and lightweight creative workspace.

An Inventory project is a real folder containing `Invent.nvi`, native documents, cache locations, thumbnails, and future exports. Source folders remain external and user-owned. Inventory indexes them, previews them, and stores project-specific metadata without silently modifying them.

The visible app has:

- A desktop menu bar and Inventory branding.
- A left pane containing the virtual Master Library, the built-in Inventory branch, and loaded Source Folders.
- A central Preview Stage above the Workspace asset shelf.
- A right Inspector.
- Resizable and collapsible side panes and Workspace, allowing an almost full-screen scene view.
- Light, Dark, and user-created themes, plus General and Notifications app settings.

## Current Capabilities

### Inventory Projects

- Create, open, save, and close Inventories.
- `Invent.nvi` is the active project's atomically saved source of truth.
- Closing an Inventory also closes its source folders and clears project-specific live state.
- Inventory-owned `.nvd` documents live under `Inventory > Write`, while `.nvv` vectors live under `Inventory > Draw`; neither belongs to the Master Library.
- Selecting Inventory, Write, or Draw opens a dedicated native-work hub rather than silently opening the first file. Write and Draw are the user-facing editor names; NVD and NVV remain the technical format names.
- Inventory-owned NVD documents can be created, atomically saved, renamed, and deleted explicitly.
- Inventory-owned NVV vectors can be created, opened, and atomically saved. Draw currently presents an intentionally atomic themed canvas, with editable canvas dimensions in the Inspector.
- Dirty NVD documents show an optional Ctrl+S reminder, warn before refresh/window close, and prompt before switching or explicitly closing documents. The explicit close prompt always offers Save, Don't Save, and Cancel and cannot be disabled.

### Source Assets And Workspace

- Load multiple source folders, refresh them, or remove them from the active Inventory.
- Browse supported assets together in the Workspace.
- Sort by name, type, modified date, or size.
- Switch among large, medium, small, and Details views.
- Resize Details columns and the Workspace height.
- Search assets.
- Use generated visual thumbnails where supported.

### Master Library

- Build a virtual, user-editable hierarchy without moving source files.
- Add parent-aware library nodes from a bundled catalog or create a custom node.
- Rename and delete user-created nodes.
- Use file-type boundaries, tags, and rules to attract files into the most specific matching folder.
- See files physically listed in the tree without duplicating one file across parent and child folders.
- Rename an asset's Inventory display name without renaming the real source file.
- Receive suggested child-folder placements in the Inspector.
- Seed broad top-level folders only when an imported source folder needs them.

### Tags And Inspector

- Generate conservative automatic tags from file names, extensions, file types, and selected metadata.
- Add user tags and keep important tags across display-name changes.
- Edit notes.
- View document statistics, including selection-only counts for NVD text.
- View 3D model statistics, dimensions, center, imported transforms, and editable transform overrides.
- See a rotating mini 3D preview for model assets.

### Preview Readers

- Raster images, including transparency-grid presentation and zoom/pan behavior.
- SVG vector images.
- WAV waveform thumbnails and one-shot playback.
- PDFs through PDF.js.
- Markdown through a dedicated reader with syntax-aware code rendering.
- GLB, glTF, OBJ, and STL through Three.js, including orbit controls, grid, compass, and movable light.

### NVD Editor

- Pageless and A4 presentation modes over the same persistent document editor, preserving Undo/Redo when switching modes.
- One document-wide Tiptap editor in both modes. A4 presents measured paper sheets and gaps around decoration-only page spacers while selection, history, keyboard navigation, and saved content remain continuous.
- Shared bounded pagination caching prevents the editor, Inspector, and thumbnails from independently measuring identical document content. Inspector page counts use a deferred document value so typing remains the urgent update.
- Bundled offline fonts plus selected system fonts.
- Recently used fonts.
- Font family and point-size formatting for selections and future typed text.
- Bold and Italic inline formatting.
- Left, Center, Right, and Justify paragraph alignment.
- A default-open Paragraph Inspector with custom line spacing, Space before, Space after, and character spacing. Values apply to touched paragraphs, support mixed selections and Undo/Redo, and use Enter to apply or accept an active style edit.
- A universal Edit menu routes Undo and Redo to the active context with live enabled states, concise action labels, and `Ctrl+Z` / `Ctrl+Y` shortcuts. NVD uses Tiptap history; the Library currently records session-only Library-node renames and Inventory display-name renames.
- Document-view zoom presets from 50% to 200%, selectable in the toolbar and stepped with Ctrl + Scroll.
- The right edge of the NVD toolbar explicitly closes the active document. Clean documents close immediately; dirty documents always prompt for Save, Don't Save, or Cancel.
- A default-open semantic style designer in the Inspector beneath Paragraph. Clicking a style preview applies it to the paragraphs touched by the cursor or selection; the pencil sandboxes toolbar formatting into a draft, and accepting updates that style throughout the document. Applied roles and reusable `p`, `h1`, `h2`, and `h3` definitions persist in the `.nvd` file. Older partial definitions retain missing values until the frontend applies the correct role-specific defaults.
- Each reusable NVD style has a reset action that restores the current built-in definition and cascades through blocks still matching the previous style. The first reset presents a one-time confirmation that can be restored under Settings > Notifications. Style-definition changes and matching document updates move together through Undo and Redo, including styles that are not currently used by a document block.
- Semantic `p`, `h1`, `h2`, and `h3` blocks inherit their corresponding document style automatically until their formatting is locally changed.
- Paragraph and character spacing agree across Pageless, A4 pagination, Workspace previews, save, and reopen.
- The compact NVD Navigation pane dedicates its content area to a clickable hierarchical heading outline derived from non-empty `h1`, `h2`, and `h3` blocks.
- Workspace document previews and Inspector page/word/character statistics.
- Shared rendering rules across Pageless, A4, Workspace previews, saving, and reopening.

## Architecture Map

Important paths:

- `src/App.tsx`: still the main orchestration layer and a large amount of library behavior. It is much healthier than it was, but at roughly 5,000 lines it should not absorb every new feature.
- `src/features/assetShelf/`: Workspace asset browsing.
- `src/features/inspector/`: Inspector UI.
- `src/features/inventoryProject/`: shared Inventory and NVD TypeScript types.
- `src/features/nvdEditor/`: NVD editor, fonts, rich-text conversion, pagination, and thumbnails.
- `src/features/nvvEditor/`: intentionally atomic Draw canvas.
- `src/features/sceneViewer/`: Preview Stage and scene toolbar.
- `src/features/settings/`: Compact Settings shell with General, Themes, and Notifications sections.
- `src/features/editors/`: behavior shared by current and future native editors.
- `src/sceneReaders/`: isolated preview engines for audio, Markdown, PDF, raster, vector, and 3D.
- `src/libraryCatalog/`: bundled library-node vocabulary, tag vocabulary, normalization, and catalog types.
- `src-tauri/src/lib.rs`: Rust commands for scanning, Inventory lifecycle, NVD lifecycle, SQLite legacy state, and native tests.
- `docs/INVENTORY_FORMAT.md`: current persistence contract.
- `docs/FILE_SAFETY_RULES.md`: non-negotiable file trust rules.
- `docs/DIRECTION.md`: ideas that are not currently implemented.

## State And Ownership

- `Invent.nvi` owns active project state.
- Source folders, source assets, Master Library nodes, selections, and active NVD document references belong to an Inventory.
- Original source files are not owned by Inventory.
- Inventory-owned native files are the exception and may be explicitly managed by the app.
- SQLite remains in the codebase as legacy app metadata, but it is not the active Inventory source of truth.
- Themes and pane comfort settings are app-level preferences rather than Inventory project state.

## Fragile Contracts

These areas deserve extra care:

- Any new NVD formatting feature must agree across the TypeScript file model, Tiptap conversion, Rust serialization, Pageless rendering, A4 pagination, Workspace thumbnail, Inspector statistics, save, reopen, and tests.
- Font changes affect wrapping and page counts. Do not treat typography as editor-only decoration.
- Toolbar controls must preserve text selection when clicked.
- A file should appear once in the Master Library tree, at its most specific matching location.
- File-type boundaries must prevent an image from entering a 3D folder merely because both share a tag.
- Inventory-owned documents must never leak into the Master Library.
- Closing an Inventory must close its source folders.
- Resizing panes while viewing 3D should not recreate or blank the preview.
- Theme changes can affect every surface. Built-in Light and Dark themes are immutable.
- Original source files must not be changed silently.

## Working Practices

Useful verification commands:

```powershell
npm run build
npm test
cd src-tauri
cargo fmt --check
cargo test
```

For a live desktop session:

```powershell
npm run tauri dev
```

The dev app normally uses `http://localhost:5173/`, with Tauri output in `tauri.out.log` and `tauri.err.log` when launched through the existing helper pattern.

Before finishing a visual feature, inspect the running app. Before finishing a native persistence feature, add or update a Rust regression test.

## Documentation Rules

- `PROJECT_BRIEF.md` describes what Inventory is.
- `DESIGN_DRAFT.md` describes the current interface and interaction model.
- `DECISIONS.md` records durable decisions only.
- `DIRECTION.md` stores ideas that are not present.
- `WORK_LOG.md` records major milestones only.
- Delete implementation diary detail once it no longer helps future work.

## Recent Important Context

The Space Between NVD formatting experiment was removed completely. It should not exist as an active feature in code, schema, styles, tests, or current-capability docs. Do not revive it from memory without a fresh, precise interaction design.

The single-editor A4 architecture is complete through its paper-presentation stage. Do not return to one Tiptap instance per page. Measured page starts are projected into the editor as decoration-only spacers that fill the unused previous-page area, both page margins, and the inter-page gap. They must never enter NVD content, selection offsets, or undo history.

A responsive multi-page A4 spread is parked in `DIRECTION.md`. It cannot be implemented by merely placing paper sheets in a grid: the current single editable DOM stream is vertically paginated, and page text, caret geometry, selection, and keyboard order must all move together.

Large-document hardening is in place. Pagination results use a bounded shared cache, page decorations reuse their `DecorationSet` across selection-only transactions, and sorted page offsets are projected into ProseMirror positions in one document pass. Keep `npm test` covering the generated 100-page regression when changing pagination or editor offsets.

## My Judgment

The project is healthy enough for feature expansion, but the safest pattern is to let each new editor or major surface own its behavior in a feature folder. `App.tsx` should increasingly coordinate rather than implement.

The most valuable quality in Inventory is not the number of features. It is the feeling that many different files can live together in one calm, coherent place. Protect that.
