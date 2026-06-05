# Invent.nvi Format

`Invent.nvi` is the source of truth for one Inventory project.

Manifest saves are atomic. Inventory writes and flushes a complete sibling temporary file before replacing `Invent.nvi`, so a failed preparation write leaves the previous project state intact.

It is JSON internally so Inventory can migrate and inspect it safely, but users should normally open it through the app.

Creating a new Inventory always starts with an empty project state. It does not inherit source folders, assets, library nodes, selections, or editor state from the Inventory that was previously open.

An Inventory's identity is owned by its existing `Invent.nvi` manifest. Normal autosave preserves the project name, creation timestamp, readme, document registry, and export settings. Renaming an Inventory will require a separate explicit operation rather than occurring as a side effect of saving or creating another project.

Closing an Inventory performs a final manifest save, then clears its source folders, assets, library tree, selections, and editor state from the live app. It does not delete or modify any source files or Inventory-owned documents. Active Inventory state is not mirrored into the app-wide SQLite fallback.

An app session with no active Inventory is intentionally blank. Source folders and Master Library nodes belong to an Inventory, so they cannot be added or restored until an `Invent.nvi` project is created or opened. The old app-wide SQLite library state is retained only as legacy metadata and is no longer loaded by the frontend.

## Current Schema

The current schema version is `2`.

Top-level sections:

- `schemaVersion`: version used for migration.
- `kind`: identifies the file as an Inventory project.
- `readme`: human-readable description of the file.
- `inventory`: Inventory name and timestamps.
- `rootPath`: compatibility summary of the primary source path.
- `sourceFolders`: source folders loaded into this Inventory.
- `assets`: indexed source-file and Inventory-owned document metadata, plus user-authored asset data.
- `libraryTree`: the user-editable Master Library structure and placement rules.
- `workspaceState`: project-specific UI and editor state.
- `documents`: registry of Inventory-owned documents such as `.nvd`, including their stable asset IDs, titles, paths, and timestamps.
- `exportSettings`: export preferences and future export-planning defaults.

## Project Memory

`Invent.nvi` should remember anything that makes one Inventory meaningfully different from another:

- Source folder paths and enabled state.
- Asset display names, notes, tags, kept tags, size, modified time, and file type.
- Master Library folders, nesting, rules, tags, and manual placements. A first source import into an otherwise empty Master Library may seed only the broad asset-type parents required by the imported files.
- Selected asset and selected library folder.
- Open tree nodes, shelf sorting, shelf view mode, Details column widths, and search query.
- Active scene mode, left-pane view, and active `.nvd` document path.
- Model transform overrides made inside Inventory.
- Inventory-owned native-file registry entries, so documents inside `documents/` and vectors inside `vectors/` reappear without being loaded as source folders.

## Not Stored Here

These belong elsewhere:

- Themes, pane sizes, pane collapse preferences, and other app-wide comfort settings: local app settings.
- Generated thumbnails, PDF page previews, waveform data, model parse summaries, and scan fingerprints: `cache/` or `thumbnails/`.
- User-created native content: `.nvd` files inside `documents/` and `.nvv` files inside `vectors/`.
- Copied folder structures and duplicated source files: `exports/`.
- Temporary dialogs, context menus, loading states, error messages, and generated inspector results: memory only.

## Migration Rule

Inventory must continue opening older supported `.nvi` files.

Schema v1 files used `inventoryName`, timestamps, `libraryState`, and `workspaceState`. The Rust manifest reader migrates those fields into the schema v2 sections in memory. The next normal save writes the current schema.

New fields should use safe defaults whenever possible so a minor addition does not require a schema bump.

## Document Registry

The `documents.nvdDocuments` and `documents.nvvDocuments` registries describe native files owned by the Inventory. Their content remains in the native files themselves; `Invent.nvi` stores only the project-level identity needed to index and restore them.

Creating or saving an Inventory-owned `.nvd` or `.nvv` updates both its registry entry and its asset metadata. Opening an Inventory reconciles `.nvd` files inside `documents/` and `.nvv` files inside `vectors/`, discovers valid unregistered native files, and removes stale entries. Early `.nvv` files created inside `documents/` are moved into `vectors/` when the Inventory opens.

An `.nvd` document stores its own `layoutMode`, default `fontFamily`, and default `fontSize`. New and older documents default to `pageless`, `Inter`, and `12pt`; `a4` is an optional presentation mode. The text content remains independent from layout mode, so switching between Pageless and A4 does not insert page-break characters or alter the writing.

Font choice and base font size belong to the document because they affect the document's appearance, wrapping, pagination, and future exports. Recently used fonts are a user-level convenience preference and are not stored inside `.nvd` or `Invent.nvi`.

The optional document-level `styles` object stores reusable `p`, `h1`, `h2`, and `h3` definitions, including font family, point size, Bold, Italic, alignment, line height, paragraph space before/after, character spacing, and display label. Accepting a style edit updates matching blocks and marks the document dirty. Saving writes the style library into `.nvd`; reopening hydrates the Inspector from it. Older files without `styles`, missing roles, or missing optional values inside a partial style use the current built-in defaults for the relevant role.

NVD saves are atomic. Inventory writes and flushes a complete sibling temporary file before replacing the existing `.nvd`, so a failed preparation write leaves the previous saved document intact.

Resetting a reusable style replaces its saved definition with the current built-in default and updates blocks still matching the previous definition. Locally overridden blocks remain unchanged.

Every semantic block automatically inherits its corresponding reusable `p`, `h1`, `h2`, or `h3` style. A run-level formatting value overrides the corresponding inherited value, and a block whose effective formatting no longer matches its reusable style is left unchanged by later style edits. This keeps writing and headings connected to their reusable styles without requiring the user to apply each role manually.

Each editor paragraph is stored as its own NVD block. Its semantic `kind` is `p`, `h1`, `h2`, or `h3`; older `paragraph` and `heading` values remain readable and normalize to `p` and `h1`. Block IDs are retained through ordinary paragraph edits where possible, giving block-level presentation a durable home. The document's plain-text representation places one newline between blocks, matching the paragraph separator used by the rich-text editor, selection offsets, word counts, and pagination.

Paragraph alignment is stored as an optional block-level `textAlign` value: `center`, `right`, or `justify`. Left alignment is the default and is omitted from the file. Alignment applies to the paragraph rather than an inline text range, including when an A4 page visually splits one paragraph across multiple pages.

Paragraph presentation is stored through optional block-level `lineHeight`, `spaceBeforePt`, and `spaceAfterPt` values. Missing values inherit the block role's reusable style. The built-in Paragraph style defaults to `1.4` line spacing, `0 pt` before, and `8 pt` after. Heading 1-3 use progressively tighter heading rhythms: `1.15 / 24 / 12`, `1.2 / 18 / 8`, and `1.3 / 12 / 6`. Adjacent Space After and Space Before values are additive. The Inspector applies these values to the current paragraph or every paragraph touched by a selection; mixed selections display a mixed state.

Each block keeps its plain `text` and may also store optional `runs`. A run contains text plus inline style attributes such as `fontFamily`, `fontSize`, `bold`, `italic`, and `characterSpacingPt`. Bold and Italic runs store only `bold: true` or `italic: true`; normal character spacing is `0` and is omitted. Files without runs remain valid and render their block text using the document's default font and size.

The NVD renderer uses the same block layouts and styled runs for Pageless, A4, Workspace previews, and Inspector page counts. A4 pagination waits until every referenced font face is ready, then measures each run using its effective font family, font size, weight, style, and character spacing. Page breaks and page counts account for horizontal wrapping, formatted glyph widths, line height, paragraph spacing, and the tallest text on each visual line instead of being calculated from temporary fallback fonts or fixed spacing.

Pageless and A4 editing share one persistent document-wide Tiptap editor, so switching presentation modes preserves selection and Undo/Redo history. A4 page boundaries are calculated separately from the editor and projected as decoration-only page spacers between measured paper sheets. Each spacer fills the unused content area on the previous page plus the bottom margin, inter-page gap, and next top margin. These decorations do not enter saved content, selection offsets, or undo history.

Identical pagination requests share a bounded in-memory result cache across the editor, Inspector, and Workspace previews. This is derived presentation state only and is never persisted into `.nvd` or `Invent.nvi`.

The text-formatting toolbar follows rich-text editing rules:

- With a text range selected, a formatting change applies only to that range.
- With a collapsed cursor, a formatting change becomes the typing style for text inserted from that position.
- Unstyled text inherits the document's default `fontFamily` and `fontSize`.
- Font family, font size, Bold, Italic, and future inline text tools use the same selection and typing-style behavior.
- Left, Center, Right, and Justify are paragraph tools. A selection that touches multiple paragraphs applies the chosen alignment to each paragraph.
- Line spacing, Space before, Space after, and Character spacing live in the Inspector. Enter applies a typed value to the touched paragraphs, or accepts and cascades the active reusable style draft.

Inventory-owned files do not belong to the Master Library. The Library Structure panel provides a separate built-in `Inventory` branch beside `Master Library`, with registered `.nvd` files listed under `Inventory > Write` and `.nvv` files under `Inventory > Draw`. These branches are derived from the native document registries rather than stored as user-created `libraryTree` folders.

Selecting a registered `.nvd` opens it in the NVD editor and shows its document view in the workspace shelf.

Explicit document rename and delete actions are allowed only for registered Inventory-owned documents:

- Rename updates the real `.nvd` file name, document title, registry entry, indexed asset metadata, and saved selection or active-document references.
- Delete permanently removes the `.nvd` file after user confirmation, then removes its registry entry, indexed asset record, and saved workspace references.
- Scanned `.nvd` source files outside the Inventory's `documents/` folder cannot use these physical document-management actions.

Registry reconciliation and normal project saves remove Inventory-owned document IDs from source-folder membership and Master Library manual placements. Native files have one structural home inside `Inventory`.

## NVV Vector Format

An `.nvv` file is Inventory Draw's native file. Its current contract stores identity, timestamps, canvas dimensions, and an optional `paths` array. Each path contains anchor points, optional incoming and outgoing handles, optional smooth/corner handle mode, stroke color, stroke width, a closed/open flag, and an optional closed-to anchor index. Paths render as cubic Bezier segments, falling back to straight segments when handles are absent.

Older canvas-only `.nvv` files remain valid because missing `paths` data defaults to an empty vector canvas. NVV saves use the same atomic replacement mechanism as NVD saves.

User-owned SVG files remain read-only source assets. A future `Edit as NVV` flow may explicitly import supported SVG content into a new Inventory-owned `.nvv` while leaving the original SVG untouched.
