# Invent.nvi Format

`Invent.nvi` is the source of truth for one Inventory project. It is JSON and is normally edited only through the app.

Manifest saves are atomic: Inventory writes a complete sibling temporary file, flushes it, then replaces `Invent.nvi`. A failed preparation write should leave the previous manifest intact.

## Lifecycle

Creating a new Inventory starts from an empty project state. It must not inherit source folders, assets, library nodes, selections, or editor state from the previously open Inventory.

An Inventory's identity belongs to its existing manifest. Autosave preserves the project name, creation timestamp, readme, document registry, and export settings. Renaming should be a separate explicit operation.

Closing an Inventory performs a final manifest save, then clears live source folders, assets, library tree, selections, and editor state. It does not delete source files or Inventory-owned native documents.

A session with no active Inventory is intentionally blank. Source folders and Master Library nodes cannot be added until an `Invent.nvi` project is created or opened.

The old app-wide SQLite library state is legacy metadata only and is no longer loaded by the frontend.

## Schema

Current schema version: `2`.

Top-level sections:

- `schemaVersion`: manifest schema version.
- `kind`: identifies an Inventory project file.
- `readme`: human-readable file description.
- `inventory`: project name and timestamps.
- `rootPath`: compatibility summary of the primary source path.
- `sourceFolders`: source folders loaded into this Inventory.
- `assets`: indexed source-file and native-document metadata, plus user-authored asset data.
- `libraryTree`: user-editable Master Library folders, rules, tags, and manual placements.
- `workspaceState`: project-specific UI/editor state.
- `documents`: registry of Inventory-owned native files.
- `exportSettings`: export preferences and future export defaults.

## Stored In Invent.nvi

Store project-specific state that should reopen with this Inventory:

- Source folder paths and enabled state.
- Asset names, notes, tags, kept tags, file type, size, and modified time.
- Master Library folders, nesting, rules, tags, and manual placements.
- Selection, open tree nodes, shelf sorting/view mode, Details widths, and search query.
- Active scene mode, left pane, and active native document path.
- Model transform overrides made inside Inventory.
- Native document registry entries for `.nvd` and `.nvv` files.

## Not Stored In Invent.nvi

- App-wide themes, pane sizes, and comfort settings.
- Generated previews, thumbnails, waveform data, scan fingerprints, and parser caches.
- Native document contents. `.nvd` lives in `documents/`; `.nvv` lives in `vectors/`.
- Exported/copied folder structures.
- Temporary UI state such as menus, dialogs, loading flags, and errors.

## Native Document Registry

`documents.nvdDocuments` and `documents.nvvDocuments` index Inventory-owned native files. They do not store native file contents.

Registry entries use stable IDs and include the asset ID, kind, title, path, creation time, and updated time.

Opening an Inventory reconciles the registry with files on disk:

- `.nvd` files belong in `documents/`.
- `.nvv` files belong in `vectors/`.
- Valid unregistered native files are discovered.
- Stale registry entries are removed.
- Early `.nvv` files in `documents/` are moved to `vectors/`.

Inventory-owned native files do not belong to the user-editable Master Library. They appear in the built-in Inventory branch:

- `Inventory > Write` for registered `.nvd` files.
- `Inventory > Draw` for registered `.nvv` files.

Rename/delete actions are allowed only for registered Inventory-owned native files. Rename updates the real file, title, registry entry, asset metadata, and saved references. Delete removes the file after confirmation, then removes registry, asset, and workspace references.

Native file content is documented separately:

- `docs/NVD_FORMAT.md`
- `docs/NVV_FORMAT.md`

## Migration

Inventory must keep opening older supported `.nvi` files.

Schema v1 used `inventoryName`, timestamps, `libraryState`, and `workspaceState`. The Rust manifest reader migrates these into schema v2 in memory; the next save writes the current schema.

New fields should use safe defaults whenever possible.
