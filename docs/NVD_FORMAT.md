# NVD Format

`.nvd` is Inventory Write's native document format. Inventory-owned `.nvd` files live in the Inventory `documents/` folder and are indexed in `Invent.nvi` under `documents.nvdDocuments`.

`Invent.nvi` stores only registry and asset metadata. The writing content lives in the `.nvd` file.

NVD saves are atomic: write a complete sibling temporary file, flush it, then replace the existing `.nvd`.

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

- `layoutMode`: `pageless`
- `fontFamily`: `Inter`
- `fontSize`: `12pt`

Supported `layoutMode` values:

- `pageless`
- `a4`

Layout mode is presentation only. Switching between Pageless and A4 must not alter text content or insert page-break characters.

## Blocks

Each editor paragraph is one block.

Block fields:

- `id`: durable block ID where possible.
- `kind`: `p`, `h1`, `h2`, or `h3`.
- `text`: plain paragraph text.
- `runs`: optional inline rich-text runs.
- `textAlign`: optional paragraph alignment.
- `lineHeight`: optional paragraph line spacing.
- `spaceBeforePt`: optional paragraph spacing before.
- `spaceAfterPt`: optional paragraph spacing after.

Older `paragraph` and `heading` kinds remain readable and normalize to `p` and `h1`.

The plain-text representation uses one newline between blocks. This must match editor paragraph separation, selection offsets, word counts, and pagination.

## Styles

The optional `styles` object stores reusable definitions for:

- `p`
- `h1`
- `h2`
- `h3`

A style may include label, font family, size, bold, italic, alignment, line height, space before/after, and character spacing.

Missing styles or missing fields use built-in defaults. Every block inherits its role style unless locally overridden. Run-level formatting overrides inherited values.

Resetting a reusable style restores the built-in default and updates blocks still matching the old style. Locally overridden blocks remain unchanged.

Accepting a style edit marks the document dirty. Saving writes the style library into `.nvd`; reopening hydrates the Inspector from it.

## Paragraph And Inline Formatting

Left alignment is the default and is omitted. Stored `textAlign` values are:

- `center`
- `right`
- `justify`

Alignment, line height, and paragraph spacing apply to whole paragraphs, including selections touching multiple paragraphs.

Each block stores plain `text` and may store `runs`. A run contains text plus optional inline style fields:

- `fontFamily`
- `fontSize`
- `bold`
- `italic`
- `characterSpacingPt`

Bold/Italic runs store only `true` values. Normal character spacing is `0` and is omitted.

Files without runs remain valid and render with inherited defaults.

## Rendering

Pageless editing, A4 editing, Workspace previews, and Inspector page counts should use the same block/run layout rules.

A4 pagination is derived presentation state. It waits for referenced fonts, measures styled runs, accounts for wrapping, line height, paragraph spacing, and glyph width, then projects page spacers as editor decorations.

Page spacers, page counts, and pagination caches are not saved into `.nvd` or `Invent.nvi`.

Pageless and A4 share one persistent editor instance so switching modes preserves selection and Undo/Redo history.

## Inventory Integration

Registered `.nvd` files appear under `Inventory > Write`.

Selecting one opens it in the NVD editor and shows its document view in the workspace shelf.

Rename/delete behavior is controlled by the native document registry rules in `docs/INVENTORY_FORMAT.md`.
