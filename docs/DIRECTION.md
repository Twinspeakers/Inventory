# Direction

This file preserves ideas that are not currently present in Inventory.

It is an idea bank, not a to-do list or promise. Ideas should move out of this file when they are implemented, explicitly rejected, or no longer fit the product.

## Product Direction

Inventory is growing from an asset manager into a lightweight creative workspace: one place to find, understand, organise, preview, and make small useful changes to the files a person owns.

It should not try to replace specialist tools such as Blender, Godot, Photoshop, Reaper, Word, or Scrivener. Its advantage is convenience, context, and the ability to work across many file families without leaving the library.

## Master Library Intelligence

The Master Library should become increasingly capable of taming a large unorganised collection with less manual effort.

Ideas:

- Expand the library catalog into a broad, domain-based vocabulary covering objects, life, food, places, materials, styles, activities, tools, vehicles, buildings, documents, and other useful concepts.
- Avoid splitting the vocabulary by media type. A `tree` can describe a model, image, sound, document, or future native file.
- Continue improving parent-aware folder suggestions so a child suggested beneath `Nature` differs meaningfully from one suggested beneath `Audio`.
- Make automatic tags more accurate and less noisy by combining file name, extension, metadata, model statistics, and other safe signals.
- Add confidence or explanation to automatic tags and placement suggestions when that helps the user judge them.
- Suggest useful child folders for files that remain directly inside broad parent folders.
- Explore optional automatic library-structure creation around a user's assets, with a preview and easy rejection before any structure is committed.
- Add library presets for common domains without making any one preset the universal truth.
- Add bulk tagging, bulk keep-tag controls, and bulk placement tools.
- Add duplicate and near-duplicate detection without modifying source files.

## Inventory Export

The virtual Master Library may eventually become an exportable physical folder structure.

Ideas:

- Export a chosen library branch or the whole Master Library as copied files in real folders.
- Preview every planned copy, destination, conflict, rename, and skipped file before writing anything.
- Keep source files untouched and make copy the default operation.
- Store export preferences in `Invent.nvi` and generated results inside the Inventory's `exports/` folder.
- Add conflict rules, naming rules, progress reporting, cancellation, and a file-operation log.
- Offer undo where practical.
- Explore portable Inventories and relative-path support.

## Source, License, And Provenance

Inventory should eventually help answer whether an asset is safe and appropriate to use.

Ideas:

- Structured source site, author, license, attribution, commercial-use, original URL, receipt, and proof fields.
- License and attribution views in the Inspector.
- Import helpers for sources such as Sketchfab when reliable metadata is available.
- Sidecar or bundled-license discovery where it can be done safely.
- Clear distinction between known license information, user-entered information, and guesses.

## Native Document Direction

`.nvd` is Inventory's native rich document format and should remain the master file for writing created inside Inventory.

Ideas:

- Paragraph styles, headings, lists, indentation, line spacing, paragraph spacing, and text color.
- A document navigation pane built from headings or future chapter structure.
- Novel-oriented structure such as title pages, front matter, chapters, scenes, notes, headers, footers, page numbers, margins, and export profiles.
- Explore a boundary-aware A4 spread renderer that places multiple pages per row when the scene is wide enough. It must preserve the single document-wide editor, truthful caret and selection geometry, page order, and large-document performance; moving only the paper backgrounds is not acceptable.
- Export to `.docx`, `.pdf`, `.epub`, `.md`, and `.txt`.
- Import from `.docx` as a compatibility bridge without making Word's internal format Inventory's native model.
- Dedicated `.txt` and `.md` editors that keep their formats simple.
- `.pdf` annotation, proofing, or review tools rather than Word-style PDF editing.
- An `.epub` reader and eventual publishing path separate from PDF.
- Read-only or explicit import support for Scrivener projects only when it can be done safely.

### Semantic Blocks And Navigation

NVD should use a small semantic block vocabulary inspired by HTML while retaining document-editor language in the interface:

- `p`: Paragraph
- `h1`: Heading 1
- `h2`: Heading 2
- `h3`: Heading 3

Begin with these four rather than adding every possible heading level immediately. Block roles should be semantic and durable, while their visual definitions remain editable separately.

Semantic roles, reusable style definitions, style application, persistence, and heading-based Navigation are present. Future work may add an explicit way to return a locally overridden block to its role's current style.

The semantic role and its visual style must remain separate. Changing the Heading 1 definition should update every `h1`; changing one heading's local font should not silently redefine all Heading 1 blocks.

## Other Lightweight Editors

Inventory may eventually provide small, frequently useful editing tools for other file families.

Ideas:

- A raster image editor for crop, resize, simple color adjustment, transparency work, and export.
- Grow the intentionally atomic Draw canvas into shape creation, paths, node editing, Bézier handles, layers, strokes, richer fills, and explicit SVG import/export.
- Revisit the useful parts of the old ImageLab idea inside Inventory rather than building a disconnected second app.
- A lightweight audio editor for simple inspection and file-level edits, without reviving the removed Scene Audio or Audio Layers concept.
- A future app-owned 3D format, tentatively imagined as `.nv3`, for lightweight scene or object edits that should not overwrite source models.
- Dynamic scene toolbars that expose only the controls belonging to the active editor.

## Readers And Preview Depth

Inventory accepts more formats than it can deeply preview. Preview support can keep expanding in isolated reader modules.

Ideas:

- Deeper previews for accepted 3D formats beyond GLB, glTF, OBJ, and STL.
- Readers for `.docx`, `.epub`, `.txt`, and other useful document formats.
- Better archive inspection without silently unpacking archives.
- Richer metadata extraction for images, audio, documents, and models.
- Background thumbnail generation, scan fingerprints, and preview caches.
- Faster large-model loading through caching, workers, progressive work, and careful code splitting.

## Creative Organisation

These concepts remain interesting, but the Master Library should be excellent before they return.

Ideas:

- Collections as virtual groups that do not move or duplicate files.
- Boards as saved visual layouts for moodboards, sets, and planning.
- A redesigned comparison mode for related images, models, textures, or references.
- Project destinations that copy selected assets into real project folders with explicit previews and conflict handling.

## App Maturity

Ideas:

- Installer and release pipeline suitable for other people to download.
- Backup, recovery, and manifest validation tools.
- More Settings sections beyond Themes.
- Keyboard shortcut discovery and accessibility refinement.
- File associations for Inventory-owned formats.
- Performance profiling and further extraction from `App.tsx` as features grow.

## Long-Term North Star

Inventory could eventually become a personal digital object library for mixed reality.

Possible future metadata:

- Real-world dimensions and scale
- Placement type: floor, wall, ceiling, table
- Collision bounds
- Lighting behavior
- AR-ready formats such as USDZ
- Spatial placement records

This remains a north star, not a near-term requirement.

## Explicitly Parked Or Rejected

Do not quietly reintroduce these ideas without a fresh conversation:

- Space Between text formatting was removed completely after its interaction model proved unclear.
- Underline is intentionally absent from the NVD toolbar.
- Scene Audio and Audio Layers were removed because they competed with normal file selection without a strong use case.
- Collections were removed from the active Library Structure while the Master Library is still being perfected.
- The old Compare button and comparison concept were removed; any future comparison mode should be reconsidered from first principles.
- Original source files must never be silently moved, renamed, modified, or deleted.
