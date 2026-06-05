# Design Draft

This file describes the current interface and interaction model. It is a living design contract, not a record of the original mockup.

## Product Feel

Inventory should feel like a compact creative workstation: part DAW, part asset browser, part scene viewer, and part organised library.

It should be:

- Dense but readable
- Calm and work-focused
- Fast to scan
- Safe around files
- Satisfying to organise
- Clear about virtual structure versus real disk structure
- Flexible enough for many file families

The interface should avoid:

- Marketing-page composition
- Large decorative cards
- Excessive rounded containers
- Unnecessary explanatory text
- One-note color palettes
- Color that competes with the assets themselves

## Visual Language

- Dark mode is primarily grayscale so asset colors stand out.
- Light mode should remain genuinely light across every major surface.
- `#98F300` lime and `#2400F9` blue are fixed Inventory brand colors used selectively.
- Theme colors control the work surfaces, not the brand identity.
- Borders, spacing, and hierarchy should do more work than decoration.
- Icons are preferred for familiar tools.
- The app should look credible beside a DAW, Blender, Godot, or VS Code.

## Core Mental Model

### Inventory Project

An Inventory project is a real folder created under the user's Documents folder by default.

It contains:

- `Invent.nvi`
- `documents/`
- `exports/`
- `thumbnails/`
- `cache/`

The project remembers source folders, assets, Master Library structure, native documents, and project-specific workspace state.

### Source Folders

Source Folders are real user-owned folders loaded into the active Inventory.

Inventory may scan, index, preview, refresh, and remove them from the project. It must not silently modify their contents.

### Master Library

The Master Library is a virtual hierarchy for source assets.

It should feel like a carefully built scene tree rather than a second copy of the user's disk folders. Files are attracted into the most specific matching node by file-type boundaries, tags, and rules.

One file should appear once in the tree. If it belongs in a child folder, it should not remain duplicated in the parent.

### Inventory Branch

The built-in Inventory branch sits beside Master Library and contains files owned by the Inventory project.

Currently:

- Inventory
  - Write
  - Draw
    - `.nvd` files

Native files do not belong in Master Library.

### Asset

An asset is Inventory's record of a file.

It may carry:

- Real path
- Inventory display name
- Type and extension
- Size and modified time
- Automatic tags
- User tags
- Kept tags
- Notes
- Preview data
- Type-specific metadata

Renaming a source asset inside Inventory changes its display name and tag interpretation, not the real file name.

## Main Layout

```text
+---------------------------------------------------------------+
| Native title bar                                              |
+---------------------------------------------------------------+
| File  Edit  View  Library  Asset  Board  Window  Help         |
+-------------------+-----------------------------+-------------+
| Library / NVD     | Preview Stage               | Inspector   |
| Navigation        |                             |             |
|                   |                             |             |
| Master Library    |                             |             |
| Inventory         +-----------------------------+             |
|                   | Workspace Asset Shelf       |             |
| Source Folders    |                             |             |
+-------------------+-----------------------------+-------------+
```

The left pane, right Inspector, and bottom Workspace can be collapsed. The side panes and Workspace can be resized. Collapsing all three should leave an almost full-screen Preview Stage.

## Menu Bar

The menu bar should contain commands that belong to the application rather than a particular editor.

Important current commands include:

- New Inventory
- Open Inventory
- Close Inventory
- New NVD Document
- Save File
- Add Source Folder
- Settings

Editor-specific tools belong in the scene toolbar, which changes with the active editor.

## Left Pane

The left pane has two views:

- Library Structure
- NVD Navigation

Library Structure contains:

- Master Library
- Inventory
- Source Folders

NVD Navigation is available while an NVD document is active and is intended to grow into document structure navigation.

The Library Structure header is intentionally quiet. Master Library and Inventory provide the main hierarchy labels.

## Master Library Interaction

- Root and folder rows can open and close.
- Selecting a folder changes the Workspace to that folder's direct files.
- Selecting a file makes it the active file for the Workspace, Preview Stage, and Inspector.
- File selection should clear an unrelated folder selection.
- Folder and file highlighting must never imply two conflicting active selections.
- Child folders are sorted alphabetically at every depth.
- Files can appear beneath folders and folders can be collapsed to keep the tree tidy.

The Add Library Node panel:

- Is opened from a parent node.
- Is parent-aware.
- Shows an ordered hierarchy rather than a card grid.
- Suggests broad children that can contain more specific descendants.
- Supports searching the bundled catalog.
- Supports a custom node when the catalog does not fit.
- Inherits file-type scope from the parent instead of asking the user to repeat obvious choices.

## Workspace

The Workspace is the file-browsing shelf beneath the Preview Stage.

It supports:

- Search
- Sort by name, type, modified date, and size
- Ascending or descending order
- Large, medium, small, and Details views
- Resizable Details columns
- Visual thumbnails where supported
- A horizontal scrollbar only when Details content exceeds the available width
- Collapse to create more room for the Preview Stage

Workspace cards should prioritize the file itself. Labels and metadata should not cover useful preview content.

## Preview Stage

The Preview Stage is the main reader or editor surface.

Current preview families:

- Raster images
- SVG vectors
- WAV audio
- PDF
- Markdown
- 3D models
- NVD documents

The stage should use the largest reasonable amount of space, expand with the window, and avoid decorative framing that makes the content feel smaller.

NVD Pageless and A4 modes each use one document-wide editor. A4 projects measured paper sheets and gaps around the continuous editor, so cross-page selection, history, and keyboard navigation remain natural.

Dirty NVD documents show a quiet top-right Ctrl+S reminder. Users may dismiss the reminder after confirmation and re-enable it in Settings. Refreshing or closing the window while an NVD is dirty uses the platform's unsaved-changes warning.

NVD zoom is a viewing preference rather than document content. The toolbar offers 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, and 200%; Ctrl + Scroll steps through the same presets.

The rightmost NVD toolbar control closes the active document. A clean document closes immediately. A dirty document always presents Save, Don't Save, and Cancel; this protection cannot be disabled.

## Inspector

The Inspector is a scrollable, type-aware detail surface.

Common information:

- File title
- Modified date
- File size
- Tags and kept tags
- Notes
- Suggested folder placement when a file still needs a useful child folder

Type-specific information:

- NVD word, character, selection, and page statistics
- NVD paragraph controls for line spacing, space before, space after, and character spacing
- NVD reusable Paragraph and Heading 1-3 style previews and editing
- 3D dimensions, center, model statistics, transform overrides, and mini preview

The Inspector should use visual hierarchy rather than stacking every piece of information into a card.

NVD paragraph controls apply to the paragraph under the cursor or every paragraph touched by a selection. They show a mixed state when touched paragraphs differ. Pressing Enter applies the typed value; while a reusable style is being edited, Enter accepts and cascades that style update.

Each reusable NVD style has a reset action that restores the current built-in definition. The first reset prompts with a default-checked option to retire future prompts; confirmation can be restored under Notifications. Resetting cascades through blocks still matching the previous style while preserving locally overridden blocks. Style-definition changes and their matching document updates move together through Undo and Redo.

## Themes And Settings

Settings contains General, Themes, and Notifications, in that order.

General is reserved for broad app preferences and is currently empty.

Notifications contains the NVD save-reminder preference and the preference controlling style-reset confirmation prompts.

Large persistent panels and notices should remain flat and bordered. Do not use `shadow-soft` for new persistent UI surfaces, app chrome, editor toolbars, floating editor tools, panels, notices, or always-visible controls. Reserve shadows only for truly transient menus/popovers where they do not create a broad dark artifact behind the surface.

Themes allow:

- Light and Dark built-in themes
- User-created custom themes
- Per-surface color control
- Card or list editing layout
- Deleting custom themes

Built-in Light and Dark themes cannot be edited or removed.

## Selection And Focus

- The app should have one coherent active file.
- Selecting a file should update the Preview Stage, Workspace context, and Inspector together.
- Selecting a native document should return the Workspace to that document's view.
- Clicking toolbar controls in a text editor must not destroy the user's text selection.
- Folder selection and file selection must not produce contradictory highlights.

## File Safety

The UI must clearly separate:

- What Inventory knows about
- What Inventory owns
- What Inventory physically changes

Source assets are indexed in place. Native Inventory documents are app-owned and may be explicitly renamed or deleted.

See `FILE_SAFETY_RULES.md` for the full trust boundary.

## Design Test

A change is successful when it makes Inventory feel more capable without making it feel busier.
