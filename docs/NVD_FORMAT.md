# NVD Format

`.nvd` is Inventory Write's native document format. Inventory-owned `.nvd` files live in the Inventory `documents/` folder and are indexed in `Invent.nvi` under `documents.nvdDocuments`.

`Invent.nvi` stores only registry and asset metadata. The document content lives in the `.nvd` file.

NVD saves are atomic: write a complete sibling temporary file, flush it, then replace the existing `.nvd`.

## Direction

NVD is an app-owned structured document format. It is not Tiptap JSON and not Word's internal format.

Today, most real documents are still text-only. That is an implementation stage, not the long-term shape of the format.

Write is moving toward a mixed-content block model so workspace assets and future native objects can live in the document as first-class content rather than as editor hacks or transient view state.

## Shape

An `.nvd` file stores:

- `schemaVersion`
- `kind`
- `title`
- `createdAtUnix`
- `updatedAtUnix`
- `layoutMode`
- `fontFamily`
- `fontSize`
- `styles`
- `blocks`

Defaults for old or new documents:

- `layoutMode`: `a4`
- `fontFamily`: `Inter`
- `fontSize`: `12pt`

Supported `layoutMode` values:

- `a4`

`layoutMode` is retained for compatibility, but Write now normalizes all documents to `a4` on load and save.

## Blocks

`blocks` is the ordered document content stream.

Each block is a durable document node. Text paragraphs are currently the dominant block type, but the format should be treated as a block model rather than as a plain list of paragraphs forever.

Current text block kinds:

- `p`
- `h1`
- `h2`
- `h3`

Legacy kinds remain readable and normalize on load:

- `paragraph` -> `p`
- `heading` -> `h1`

Current text block fields:

- `id`: durable block ID where possible.
- `kind`: `p`, `h1`, `h2`, or `h3`.
- `text`: plain block text.
- `runs`: optional inline rich-text runs.
- `textAlign`: optional block alignment.
- `lineHeight`: optional block line spacing.
- `spaceBeforePt`: optional block spacing before.
- `spaceAfterPt`: optional block spacing after.

The plain-text representation uses one newline between text blocks. This must match editor paragraph separation, selection offsets, word counts, and pagination for text content.

### Embed Blocks

Write is moving toward first-class embed blocks for linked workspace assets and Inventory-native objects.

That means `blocks` should be understood as an ordered sequence of document nodes, not a guarantee that every block is text.

Current embed block shape:

- `id`: durable block ID where possible.
- `kind`: `embed`
- `embed.assetId`: referenced Inventory asset ID.
- `embed.assetKind`: source kind such as `image`; this remains extensible for future native object cases.
- `embed.assetName`: display name captured at insertion time.
- `embed.assetPath`: referenced source path or Inventory-native file path.
- `embed.displayMode`: `fit`, `actual`, or `custom`.
- `embed.alignment`: `left`, `center`, or `right`.
- `embed.widthPx`: optional custom rendered width.
- `embed.heightPx`: optional custom rendered height.
- `embed.caption`: optional caption text.
- `embed.sourceDocumentKind`: optional future native-object source such as `nvv`.

Normalization rules:

- Missing `displayMode` normalizes to `fit`.
- Missing `alignment` normalizes to `center`.
- Empty `caption` is omitted.
- Empty `sourceDocumentKind` is omitted.
- Non-positive or invalid `widthPx` and `heightPx` are omitted.

Contract direction:

- embeds are first-class blocks
- embeds store references to source assets or Inventory-native files
- embeds participate in selection, layout, save/reopen, undo/redo, and rendering
- embeds are not temporary editor decorations

### Ownership Rules For Embedded Content

NVD must preserve Inventory's file-safety model:

- External source assets remain external and user-owned.
- Embedding a source asset in NVD creates a document reference, not silent import or ownership transfer.
- Inventory-owned native files are a separate case and may later support deeper integration.
- User-owned source files must never be silently modified, renamed, moved, or overwritten by Write.

## Styles

The optional `styles` object stores reusable definitions for:

- `p`
- `h1`
- `h2`
- `h3`

A style may include label, font family, size, bold, italic, alignment, line height, space before/after, and character spacing.

Missing styles or missing fields use built-in defaults. Every text block inherits its role style unless locally overridden. Run-level formatting overrides inherited values.

Resetting a reusable style restores the built-in default and updates blocks still matching the old style. Locally overridden blocks remain unchanged.

Accepting a style edit marks the document dirty. Saving writes the style library into `.nvd`; reopening hydrates the Inspector from it.

## Text Formatting

Left alignment is the default and is omitted. Stored `textAlign` values are:

- `center`
- `right`
- `justify`

Alignment, line height, and paragraph spacing currently apply to whole text blocks, including selections touching multiple text blocks.

Each text block stores plain `text` and may store `runs`. A run contains text plus optional inline style fields:

- `fontFamily`
- `fontSize`
- `bold`
- `italic`
- `characterSpacingPt`

Bold and Italic runs store only `true` values. Normal character spacing is `0` and is omitted.

Files without runs remain valid and render with inherited defaults.

## Rendering And Layout

A4 editing, Workspace previews, and Inspector page counts should use the same document-layout rules.

Today, pagination is mostly text-driven. That is not the intended long-term limitation of the format.

As NVD grows mixed-content blocks, layout must remain document-truthful:

- text blocks and future embed blocks must use the same saved block model
- page counts and previews must come from the same effective content
- pagination caches and derived page fragments remain presentation state, not saved content

A4 pagination is derived presentation state. It waits for referenced fonts, measures styled text, accounts for wrapping, line height, paragraph spacing, and glyph width, then projects page spacers as editor decorations.

Page spacers, page counts, and pagination caches are not saved into `.nvd` or `Invent.nvi`.

Legacy `pageless` documents remain readable, but they are migrated to A4 presentation when opened.

## Inventory Integration

Registered `.nvd` files appear under `Inventory > Write`.

Selecting one opens it in the NVD editor and shows its document view in the workspace shelf.

Rename and delete behavior is controlled by the native document registry rules in `docs/INVENTORY_FORMAT.md`.

## Intentionally Unsupported

These should not be implied by this format document unless they are explicitly added later:

- inline embeds inside text runs
- arbitrary freeform page positioning
- silent import of source assets into NVD ownership
- silent conversion of user-owned SVG or other source files into Inventory-native objects
- editor-only object state that cannot survive save and reopen
