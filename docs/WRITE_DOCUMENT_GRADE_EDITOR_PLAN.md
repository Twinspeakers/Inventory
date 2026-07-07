# Write Document-Grade Editor Plan

## Goal

Turn Write A4 mode into a true document-grade editor where page content bounds are authoritative for wrapping, caret placement, selection painting, paragraph fragmentation, and future export behavior.

This is not a visual patch over a continuous editor. It is an architectural shift from "one long editable flow with page decorations" to "one document model rendered through page-native layout fragments."

## Current Limitation

Today A4 mode is still a continuous ProseMirror/Tiptap document with:

- page sheets rendered underneath
- page breaks inserted as spacer widgets
- pagination derived from content bounds, but not enforced by the editor DOM

That allows drift between measured layout and actual rendered flow, which is why text can visually escape the page content box after a page break.

## Required Invariants

- A4 mode is page-native, not a continuous-flow illusion.
- The page content box is authoritative for glyph painting, selection highlights, caret placement, and line wrapping.
- Pageless and A4 share one document model but not necessarily the same rendering strategy.
- Pagination is derived presentation state and must come from one shared layout engine.
- Paragraph fragmentation across pages is explicit layout state.
- No visible content may render outside the content bounds in A4 mode.

## Phase 1: Architecture Lock

Create and preserve durable rules for:

- page box vs content box ownership
- paragraph splitting policy
- spacing before/after behavior across page breaks
- widow and orphan policy
- heading keep-with-next policy
- offset-to-layout and layout-to-offset mapping guarantees

Deliverable:

- this plan
- a follow-up architecture decision entry once the rendering contract is finalized

## Phase 2: Authoritative Layout Engine

Build a richer layout engine that outputs:

- pages
- page content rects
- line fragments
- block fragments
- paragraph indexes per fragment
- document offset mappings

This engine must be the shared source of truth for:

- A4 editor rendering
- page rulers
- page counts
- thumbnails
- future export

Implementation direction:

- refactor the current pagination logic into a dedicated layout module
- preserve existing behavior while expanding the model from simple pages into explicit fragments
- keep caching and deterministic layout reuse

## Phase 3: Page-Native A4 Renderer

Replace spacer-widget A4 rendering with explicit per-page content containers.

Requirements:

- each page owns a real content box
- content is rendered into page fragments, not allowed to flow past the page
- paragraph fragments are explicit and may continue onto the next page only through the layout engine
- rulers and overlays project from the same fragment geometry

Important:

- pages remain view fragments, not persisted document nodes
- NVD stays paragraph/block based, not page-break-character based

## Phase 4: Editing Integration

Integrate the page-native renderer with the editor model.

Required capabilities:

- document offset to page fragment mapping
- page fragment hit-testing back to document offsets
- caret rendering inside page content bounds
- cross-page selection painting
- IME and composition correctness
- undo and redo continuity
- decoration projection through layout fragments

This is the hardest phase and should not be approximated.

## Phase 5: Document Semantics

Expand the block/layout model with explicit document rules such as:

- keepWithNext
- keepLinesTogether
- widowControl
- orphanControl

These belong in block or layout attributes, not inferred from styling alone.

## Phase 6: Verification

Add tests for:

- page-bound overflow prevention
- deterministic layout under changed margins
- paragraph fragmentation continuity
- selection behavior across page boundaries
- widow and orphan cases
- heading keep-with-next cases
- IME stability in A4 mode
- large-document performance and cache reuse

Also add visual regression fixtures for:

- long paragraphs
- repeated headings
- mixed inline formatting
- extreme line spacing
- narrow and wide margins
- custom page sizes

## Delivery Strategy

1. Introduce an explicit page-fragment layout engine without changing persisted document format.
2. Keep existing A4 behavior working while the richer layout model is built underneath it.
3. Add a new page-native renderer behind a feature flag or isolated component boundary.
4. Reach read-only parity first.
5. Add interactive editing only after fragment rendering and offset mapping are authoritative.
6. Remove spacer-based A4 pagination once the page-native renderer is proven.

## Immediate Implementation Work

The first implementation milestone starts here:

- add a dedicated layout engine module
- make line and page fragments explicit
- route existing page pagination through that engine
- preserve current output shape for existing consumers while preparing for page-native rendering
