# Decisions

## Native Editors Use Direct Creative Names

The user-facing native editor destinations are `Write` for NVD documents and `Draw` for NVV vectors. NVD and NVV remain the technical format names. Selecting Inventory, Write, or Draw opens a dedicated hub; only selecting a native file opens its editor.

This file records durable project decisions that future us should not repeatedly re-litigate.

Transitional setup notes, implementation diaries, and unrealized ideas do not belong here.

## 2026-05-30 - Inventory Is Local-First

Decision:
Inventory is a local-first desktop app.

Reason:
Its central value depends on safe access to local files, fast previews, and useful project memory without requiring accounts or cloud infrastructure.

Consequences:
Native file access, disk safety, offline behavior, and recoverable local formats take priority.

## 2026-05-30 - Original Assets Remain External

Decision:
Inventory stores metadata and references for source assets. It does not import original assets into a hidden vault.

Reason:
The user must be able to trust that their creative files remain theirs even if Inventory breaks.

Consequences:
Missing-file handling, explicit file operations, and a clear distinction between source assets and Inventory-owned files are required.

## 2026-05-30 - Use Tauri, React, TypeScript, Rust, And SQLite

Decision:
Inventory uses Tauri v2, React, TypeScript, Tailwind CSS, Rust native commands, and SQLite where app-level metadata still needs it.

Reason:
This stack provides a real desktop app, native file access, a capable UI, and a smaller footprint than Electron.

Consequences:
The code should keep UI, native file operations, persistence, preview engines, and feature-owned behavior separated.

## 2026-05-31 - Native File Access Lives Behind Rust Commands

Decision:
Folder scanning and project-owned file operations are implemented as Rust commands called through Tauri IPC.

Reason:
Filesystem behavior is easier to reason about and test when it remains behind a narrow native boundary.

Consequences:
React should request file work rather than perform ad hoc physical operations.

## 2026-05-31 - Use Stable Path-Derived IDs For Source Assets

Decision:
Source asset IDs are derived from file paths rather than scan order.

Reason:
Asset identity and Master Library placement should survive rescans of the same source folder.

Consequences:
Moving a source file changes its identity until a future relink system exists.

## 2026-05-31 - Preview Engines Are Modular

Decision:
File readers and preview engines live in isolated modules.

Reason:
Raster images, vectors, audio, documents, PDFs, and 3D models have different dependencies and behavior.

Consequences:
PDF.js, Three.js, Markdown rendering, image readers, and future preview engines should not turn the main app into one large conditional.

## 2026-06-03 - Invent.nvi Is The Active Project Source Of Truth

Decision:
Source folders, indexed assets, Master Library nodes, native document references, and project workspace state belong to an active `Invent.nvi` Inventory.

Reason:
Restoring app-wide library state after closing an Inventory made a closed project appear partially open and blurred ownership.

Consequences:
A session with no active Inventory is intentionally blank. Closing an Inventory closes its source folders and clears project-specific live state. SQLite is not the active project source of truth.

## 2026-06-03 - Master Library Is Virtual

Decision:
The Master Library organises source assets through virtual nodes, tags, and rules without moving the real files.

Reason:
The library should help the user tame a large collection without forcing a risky physical reorganisation.

Consequences:
A file appears once at its most specific matching location. File-type boundaries prevent unrelated media from sharing a folder merely because they share a tag.

## 2026-06-03 - Inventory-Owned Files Use A Separate Branch

Decision:
Files created and owned by Inventory, such as `.nvd`, appear under the built-in Inventory branch rather than Master Library.

Reason:
Native files have a different ownership and safety model from external source assets.

Consequences:
Native files may be explicitly renamed or deleted by Inventory and must not leak into source-folder membership or Master Library placement.

## 2026-06-03 - Brand Colors Are Fixed

Decision:
Inventory uses `#98F300` and `#2400F9` as fixed brand colors.

Reason:
The lime backpack and saturated blue give Inventory a recognizable identity across user themes.

Consequences:
Brand colors are used selectively and are not part of the editable theme palette.

## 2026-06-03 - NVD Is An App-Owned Rich Document Format

Decision:
`.nvd` stores app-owned structured document content rather than copying Word's internal format or storing Tiptap JSON directly.

Reason:
Inventory needs a durable native format that can evolve while keeping the editing engine replaceable.

Consequences:
NVD blocks retain plain text for compatibility and optional styled runs for inline formatting. Tiptap remains an implementation detail.

## 2026-06-04 - NVV Is The Native Editable Vector Format

Decision:
`.nvv` is Inventory Draw's native file. Its initial drawing contract is a minimal path model: canvas dimensions plus open paths made from anchors, optional Bezier handles, stroke color, and stroke width. User-owned SVG files remain source assets and are not silently converted or overwritten.

Reason:
A shared native vector model can power the standalone vector editor and future editable vector embeds inside NVD without making SVG compatibility the editor's internal contract.

Consequences:
The vector editor edits `.nvv`. Future SVG editing should begin with an explicit import or `Edit as NVV` action, and SVG export must be explicit.

## 2026-06-03 - NVD Content Is Independent From Page Layout

Decision:
NVD documents use A4 layout as the single supported presentation mode.

Reason:
Screen-first drafting and page-aware review are both useful, but switching between them should not rewrite the document.

Consequences:
Layout mode is stored separately from text, and shared pagination drives A4 pages, Inspector page counts, and Workspace previews.

## 2026-06-03 - NVD Typography Travels With The Document

Decision:
NVD documents store their default font family and font size, while inline font family, font size, Bold, and Italic are stored as styled runs.

Reason:
Typography affects appearance, wrapping, pagination, previews, and future exports.

Consequences:
The same effective styles must be used by A4 editing, Workspace previews, saving, reopening, and pagination measurement.

## 2026-06-03 - Bundle A Curated Offline Font Set

Decision:
Inventory bundles a curated set of open fonts locally instead of loading Google Fonts at runtime.

Reason:
NVD documents should render consistently without an internet connection.

Consequences:
Additional weights, styles, or scripts should be added only when editor behavior requires them, with licenses included in the package.

## 2026-06-03 - Paragraph Features Belong To NVD Blocks

Decision:
NVD paragraphs are stored as separate blocks, and Left, Center, Right, and Justify alignment are block attributes.

## 2026-06-04 - NVD Paragraph Spacing Is Additive

Space After on one paragraph and Space Before on the following paragraph are both preserved and added together. A4 pagination, Workspace previews, and future exports should use the same additive rule.

Line spacing and paragraph gaps are block presentation attributes. Character spacing is an inline text-run attribute so it can preserve mixed formatting and participate truthfully in text-width measurement.

Reason:
Alignment and future paragraph structure cannot be represented cleanly as arbitrary inline styles.

Consequences:
Block IDs are preserved where possible, Left alignment is implicit, and selections touching multiple paragraphs apply alignment to each paragraph.
