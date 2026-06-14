# NVV Format

`.nvv` is Inventory Draw's native vector format. Inventory-owned `.nvv` files live in the Inventory `vectors/` folder and are indexed in `Invent.nvi` under `documents.nvvDocuments`.

`Invent.nvi` stores only registry and asset metadata. Vector content lives in the `.nvv` file.

NVV saves use the same atomic replacement approach as NVD saves.

## Shape

An `.nvv` file stores:

- `schemaVersion`
- `kind`
- `title`
- `createdAtUnix`
- `updatedAtUnix`
- `canvasWidth`
- `canvasHeight`
- `paths`

Older canvas-only files remain valid because missing `paths` defaults to an empty canvas.

## Canvas

Canvas dimensions are document data:

- `canvasWidth`
- `canvasHeight`

Rendering and SVG export use these dimensions as the document view box.

## Paths

Each path contains:

- `id`
- `anchors`
- `stroke`
- `strokeWidth`
- `closed`
- `closedToAnchorIndex`

Default path style:

- `stroke`: `#e8e8e8`
- `strokeWidth`: `2`
- Fill is not currently persisted.

## Anchors

Each anchor contains:

- `x`
- `y`
- `handleMode`: `corner` or `smooth`
- `handleIn`
- `handleOut`

Handles are absolute canvas-space points, not offsets.

Paths render as cubic Bezier segments. If a handle is missing, the relevant anchor point is used, allowing straight-line fallback.

When `closed` is true, the path closes to `closedToAnchorIndex` if valid, otherwise to the first anchor. If it closes to the first anchor, exported SVG may include `Z`.

## SVG Preview And Export

SVG preview is derived from the NVV document and is not persisted.

Generated SVG uses the canvas dimensions, one SVG path per renderable NVV path, no fill, rounded line caps/joins, and stroke settings from the path.

Numeric SVG output is rounded to three decimal places. Non-finite numbers export as `0`.

## Editing State

Current tools include Select, Direct Select, and Pen.

Undo/Redo history, zoom, selected tool, selected path, and stale preview state are editor/session state. They are not saved into `.nvv`.

## Inventory Integration

Registered `.nvv` files appear under `Inventory > Draw`.

Opening an Inventory reconciles the registry with `vectors/` and moves early `.nvv` files from `documents/` into `vectors/`.

Scanned `.nvv` source files outside the Inventory-owned `vectors/` folder are source assets, not managed Draw documents.
