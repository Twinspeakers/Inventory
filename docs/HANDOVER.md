# Handover

Hello, future Codex.

Inventory is a real Tauri desktop app now, not a scaffold. Read this file first, then check `AGENTS.md`, `docs/DECISIONS.md`, `docs/DIRECTION.md`, `docs/INVENTORY_FORMAT.md`, and the code before acting on old assumptions.

The repo is initialized and pushed to GitHub:

- Remote: `https://github.com/Twinspeakers/Inventory.git`
- Branch: `main`
- No public license is granted. Keep the user's commercial options open.

## How To Work With The User

The user has a strong visual sense and often discovers the right design by using the app, noticing one small discomfort, and refining it until the UI feels obvious.

Work well with them:

- Be proactive once intent is clear.
- Use chunks for large features so the user can test each layer.
- Treat visual feedback as product information, not fussiness.
- Restate unusual interactions in plain language before building.
- Keep the app calm, dense, and DAW-like. Avoid marketing-page padding inside the app.
- Preserve delight. This project is being built with a lot of warmth.
- Keep token use disciplined during iterative UI work:
  - Prefer narrow, single-problem passes over broad rewrites.
  - Keep commentary terse once shared context is established.
  - Avoid repeating long recaps unless the situation materially changed.
  - Batch closely related edits into one pass when practical.
  - Only restart/rebuild when needed for real verification, not by habit.

## Hard Design Rule

Do not use Tailwind `shadow-soft` for new persistent UI surfaces, app chrome, editor toolbars, floating editor tools, panels, notices, or always-visible controls. It has repeatedly created broad dark visual artifacts. Prefer flat bordered surfaces. Use shadows only for truly transient menus/popovers after checking visually.

## What Inventory Is

Inventory is a local-first creative workspace for organising, previewing, and making with the files the user owns.

Its core trust model:

- Source files stay external and user-owned.
- Inventory indexes source files and stores metadata about them.
- Inventory-owned native files are different: they live inside the Inventory project and can be explicitly created, saved, renamed, and deleted by the app.
- Original source files must never be silently moved, renamed, modified, or deleted.

An Inventory project is a real folder containing `Invent.nvi`, native files, cache locations, thumbnails, and future exports. `Invent.nvi` is the active project source of truth and is saved atomically.

## Current App Shape

The visible app has:

- Desktop menu bar and Inventory branding.
- Left pane with Master Library, Inventory native branch, and Source Folders.
- Central Preview Stage.
- Workspace asset shelf.
- Right Inspector.
- Resizable and collapsible side panes and Workspace.
- Light, Dark, and custom themes.
- Settings sections for General, Themes, and Notifications.

User-facing native destinations:

- `Write`: `.nvd` documents.
- `Draw`: `.nvv` vectors.

Selecting Inventory, Write, or Draw opens a hub. Selecting a native file opens its editor.

## Current Capabilities

### Inventory Projects

- Create, open, save, and close Inventories.
- Closing an Inventory also closes source folders and clears project-specific live state.
- `Invent.nvi` owns source folders, indexed assets, Master Library nodes, workspace state, and native document registries.
- Inventory-owned `.nvd` files live under `documents/`.
- Inventory-owned `.nvv` files live under `vectors/`.
- Early `.nvv` files created in `documents/` are migrated to `vectors/` on open.
- Manifest, `.nvd`, and `.nvv` saves use atomic sibling-temp replacement.

### Master Library And Source Assets

- Multiple source folders.
- Virtual Master Library hierarchy without moving real files.
- Parent-aware node suggestions from a bundled catalog.
- Automatic tags, user tags, kept tags, notes, and Inventory display names.
- File-type boundaries prevent unrelated media from sharing folders just because they share a tag.
- A file appears once at its most specific matching visible tree location.
- Suggested folder placement appears in the Inspector.
- Inspector tag adding now has two layers:
  - Quick Add uses suggestion-only tags from the bundled library.
  - Browse Tags opens the full tag library browser.

### Preview Readers

Reader modules are isolated in `src/sceneReaders/`.

Supported preview families include:

- Raster images with transparency-grid presentation and zoom/pan behavior.
- SVG source assets.
- WAV waveform thumbnails and one-shot playback.
- PDFs through PDF.js.
- Markdown with syntax-aware code rendering.
- GLB, glTF, OBJ, and STL through Three.js.

### NVD / Write

`.nvd` is Inventory's native rich document format. It is not Tiptap JSON and not Word's internal format.

Current features:

- Creation, open, save, rename, delete, and explicit document close.
- Dirty-document prompts for switching, refresh/window close, and explicit close.
- Optional Ctrl+S save reminder.
- A4 document editing over one document-wide editor model.
- A4 uses measured paper-sheet presentation and decoration-only page spacers. Do not go back to one Tiptap instance per page.
- Shared pagination cache across editor, Inspector, and Workspace previews.
- Bundled offline fonts, recent fonts, font family, font size, Bold, Italic.
- Paragraph alignment: Left, Center, Right, Justify.
- Toolbar zoom presets with Ctrl+Scroll stepping.
- Paragraph Inspector: line spacing, Space before, Space after, letter/character spacing.
- Semantic roles: `p`, `h1`, `h2`, `h3`.
- Reusable style definitions persist in `.nvd` and cascade through matching blocks when accepted or reset.
- Styles section is in the Inspector beneath Paragraph and defaults open.
- Heading Navigation is derived from non-empty `h1`, `h2`, `h3`; paragraphs do not appear in Navigation.
- Universal Edit menu routes Undo/Redo to the active context.

Important NVD contracts:

- Formatting changes must agree across the TypeScript model, Tiptap conversion, Rust serialization, A4 pagination, Workspace previews, Inspector statistics, save, reopen, and tests.
- Font changes affect wrapping and page counts.
- Toolbar controls must preserve text selection when clicked.
- Line spacing and paragraph spacing are role/block presentation attributes.
- Character spacing is an inline text-run attribute.

### NVV / Draw

`.nvv` is Inventory Draw's native vector format. It currently stores identity, timestamps, canvas dimensions, and optional paths.

Current features:

- Creation, open, save, and atomic persistence.
- Canvas starts at `512 x 512`.
- Canvas dimensions are editable in the Inspector.
- Inspector Canvas section is collapsible; Width and Height share one row and use custom chevron number controls with `px` suffixes.
- Per-file Notes are removed for `.nvv`; the Inspector shows a manual-refresh SVG markup preview instead.
- Draw toolbar includes zoom presets and Ctrl+Scroll stepping. Default zoom is 100%.
- Floating vertical tool rail, flat and artifact-free.
- Select tool by default.
- Long-press the shared Select slot to switch to Direct Select.
- Pen tool creates anchors and Bezier handles.
- Clicking an existing anchor in the current open path can close the path to that anchor.
- Select targets whole paths and shows a neutral curve-aware free-transform box with 8 resize handles.
- Direct Select edits anchors and handles.
- Invisible hit targets make paths, anchors, and handles easier to select without making visible controls noisy.
- Smooth handles mirror the opposite handle around the anchor.
- Ctrl-click an anchor toggles smooth/corner handle mode.
- Corner anchors have a subtle split line that rotates toward the local handle tangent while the anchor circle stays fixed.
- Draw path edits participate in universal Undo/Redo via session history and should not knock the user out of Pen mode.

Important NVV files:

- `src/features/nvvEditor/NvvEditor.tsx`: Draw UI and tool behavior.
- `src/features/nvvEditor/nvvSvg.ts`: shared SVG/path-data generation.
- `src/features/nvvEditor/nvvZoom.ts`: zoom presets and stepping.
- `src/features/inventoryProject/inventoryProjectTypes.ts`: TypeScript NVV schema.
- `src-tauri/src/lib.rs`: Rust NVV schema, create/open/save/reconcile commands.
- `docs/INVENTORY_FORMAT.md`: persistence contract.

Current SVG preview behavior:

- Generated manually with Refresh.
- Does not word-wrap by default.
- Uses `.nvv` native paths as source of truth.
- The preview is educational/export-adjacent, not the internal editing format.

## Architecture Map

Important paths:

- `src/App.tsx`: main orchestration and still the biggest file. Keep pushing new behavior into feature modules.
- `src/features/assetShelf/`: Workspace asset browsing.
- `src/features/editors/`: shared editor behavior, including universal commands/session history.
- `src/features/inspector/`: Inspector UI, NVD Paragraph/Styles, NVV Canvas/SVG preview.
- `src/features/inventoryProject/`: shared Inventory, NVD, and NVV TypeScript types.
- `src/features/nativeHubs/`: Inventory, Write, and Draw hub surfaces.
- `src/features/nvdEditor/`: NVD editor, fonts, rich text conversion, pagination, thumbnails.
- `src/features/nvvEditor/`: Draw editor, zoom, SVG preview utilities.
- `src/features/sceneViewer/`: Preview Stage and scene toolbar.
- `src/features/settings/`: General, Themes, Notifications.
- `src/features/tagLibrary/`: tag browser window, bridge, and browser UI.
- `src/libraryCatalog/`: bundled node/tag vocabulary and normalization.
- `src/sceneReaders/`: file preview engines.
- `src-tauri/src/lib.rs`: Rust commands for scanning, Inventory lifecycle, native documents, and tests.

## Tag Library Notes

- The full tag browser is no longer just a DOM modal. It now opens as a separate Tauri child window because a normal React modal cannot escape the native app window bounds.
- Main wiring:
  - `src/App.tsx` opens and syncs the tag-library window.
  - `src/main.tsx` routes the child window into its own React entry surface.
  - `src/features/tagLibrary/TagLibraryWindowApp.tsx` is the child-window app shell.
  - `src/features/tagLibrary/tagLibraryWindowBridge.ts` holds the shared labels, event names, and route param.
  - `src/features/tagLibrary/TagLibraryBrowser.tsx` renders both modes: in-app modal fallback and native child window mode.
- Tauri capability gotcha:
  - `src-tauri/capabilities/default.json` must include both `main` and `tag-library` in `windows`.
  - The child window needs explicit permissions beyond `core:default`, including create/show/focus/close/maximize/unmaximize/start-dragging/start-resize-dragging and `core:webview:allow-create-webview-window`.
  - If Browse Tags stops opening after window work, check capabilities first.
- Layout gotcha:
  - The browser has a deliberate two-column umbrella-card layout.
  - A too-broad responsive breakpoint caused the child window to collapse back into stacked rows.
  - If the UI suddenly looks like long rows again, check `src/styles.css` media queries before assuming the component logic regressed.

## Current Docs Contract

- `README.md`: public-facing repo overview; currently says no public license is granted.
- `AGENTS.md`: durable agent rule about avoiding `shadow-soft`.
- `docs/PROJECT_BRIEF.md`: what Inventory is.
- `docs/DESIGN_DRAFT.md`: current interface/interaction model.
- `docs/DECISIONS.md`: durable decisions only.
- `docs/DIRECTION.md`: unrealized ideas and north-star thinking.
- `docs/INVENTORY_FORMAT.md`: persistence contracts.
- `docs/FILE_SAFETY_RULES.md`: non-negotiable file trust rules.
- `docs/WORK_LOG.md`: major milestones only.
- `docs/HANDOVER.md`: this reboot guide.

## Direction To Preserve

Inventory should become a set of native editors that can eventually talk to each other.

The first native citizens are:

- Write: `.nvd`
- Draw: `.nvv`

Long-term idea:

- A Draw vector can live inside a Write document without becoming a dead export.
- Embedded native objects should be editable in context.
- Future Publish could turn Write/Draw objects into static website output.
- Exports such as SVG, PDF, DOCX, PNG, EPUB, or website files should be generated views, not the source of truth.

There may eventually be a separate website repo for downloads and documentation. For now, this app repo is private/protected source and should not be treated like a GitHub Pages site.

## Explicitly Parked Or Rejected

Do not revive these from memory without a fresh conversation:

- Space Between text formatting was removed completely.
- Underline is intentionally absent from the NVD toolbar.
- Scene Audio and Audio Layers were removed.
- Collections are parked while Master Library quality is still being perfected.
- The old Compare button/concept was removed.
- A responsive multi-page A4 spread is parked; it cannot be done by simply placing paper backgrounds in a grid.

## Fragile Contracts

Be careful around:

- Native file safety. Never silently touch original source files.
- Inventory close behavior. Closing an Inventory must close source folders and clear project state.
- Native files must not leak into Master Library placement.
- Master Library placement must keep one visible tree location per source file.
- Theme changes affect every surface. Built-in Light and Dark are immutable.
- Resizing panes while viewing 3D should not recreate or blank the preview.
- NVD pagination and typography. Run frontend tests when touching them.
- NVV path state and undo history. Pen/Direct Select/Transform edits should remain undoable and not unexpectedly switch tools.
- SVG source assets are not `.nvv`; editing user-owned SVG should require an explicit import or `Edit as NVV` flow later.
- The tag-library browser now spans app state plus a native Tauri child window. If it breaks, inspect both the React wiring and Tauri capability permissions.

## Verification

Expected checks:

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

Current helper pattern for restarting the app:

```powershell
Get-Process inventory -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','tauri','dev') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden
Start-Sleep -Seconds 10
Get-Process inventory -ErrorAction SilentlyContinue | Select-Object Id, ProcessName
```

On Windows, prefer `npm.cmd` rather than `npm` when relaunching through `Start-Process`.

Before finishing a visual feature, restart or inspect the running app if possible. Before finishing native persistence work, add or update Rust tests.

## Git Practice

Git is available, but do not automatically commit after every completed task. The user wants the GitHub commit history to stay meaningful rather than inflated.

Use `git status` and `git diff` freely while working. Create commits and push only when the user asks for a checkpoint, when the user explicitly asks to commit/push, or when you have a fresh agreement that a checkpoint is wanted.

Useful commands:

```powershell
git status --short --branch
git diff
git add <files>
git commit -m "Clear message"
git push
```

Avoid destructive git commands unless explicitly requested.

## Good Next Threads

If starting fresh after context loss, good ways to continue are:

- Keep developing Draw: selection polish, transform behavior, shape tools, stroke/fill inspector, layers, SVG export/import.
- Harden `.nvv` persistence with more Rust/frontend tests.
- Start a separate `inventory-site` repo for a lightweight website and documentation, while keeping this app repo focused on the desktop product.
- Continue extracting behavior from `App.tsx` into feature modules.

## My Judgment

The project is healthy and has a strong identity. The safest pattern is to keep building small, useful native-editor capabilities that can later connect to each other.

The most valuable quality in Inventory is not feature count. It is the feeling that many different creative files can live together in one calm, coherent place while still belonging to the user.
