# Design Draft

This file is the compact UI design contract for Inventory. It should guide interface changes without becoming a feature diary. For file safety, manifest structure, and native document formats, read the dedicated format and safety docs instead.

## Product Feel

Inventory should feel like a compact creative workstation: part asset browser, part scene viewer, part organiser, and part native document editor.

It should be:

- Dense but readable.
- Calm and work-focused.
- Fast to scan.
- Safe around user files.
- Satisfying to organise.
- Clear about virtual structure versus real disk structure.

Avoid:

- Marketing-page layouts.
- Large decorative cards.
- Excessive rounded containers.
- Unnecessary explanatory text.
- Colour that competes with the assets.
- Treating future roadmap notes as current UI requirements.

## Visual Language

Inventory should look credible beside tools like a DAW, Blender, Godot, or VS Code.

- Dark mode is primarily grayscale so asset colours stand out.
- Light mode should remain genuinely light across major surfaces.
- `#98F300` lime and `#2400F9` blue are fixed Inventory brand colours used selectively.
- Theme colours control work surfaces, not brand identity.
- Borders, spacing, alignment, and hierarchy should do more work than decoration.
- Icons are preferred for familiar tools where labels would add clutter.
- Persistent UI should feel flat, sharp, and intentional.

Do not use Tailwind's `shadow-soft` for new persistent UI surfaces, app chrome, editor toolbars, floating editor tools, panels, notices, or always-visible controls. Reserve shadows only for truly transient menus/popovers after visually checking that they do not create a broad dark artifact.

## Core Mental Model

Inventory separates three things:

1. Real source folders owned by the user.
2. A virtual Master Library owned by the Inventory project.
3. Native Inventory files owned by the app.

Source Folders are scanned and indexed in place. Inventory may preview, refresh, and remove them from the active project, but must not silently alter their contents.

The Master Library is a virtual hierarchy for organising source assets. It should feel like a curated scene tree, not a duplicate of the user's disk folders. One source file should appear once in the tree. If it belongs in a specific child folder, it should not also remain duplicated in the parent.

The built-in Inventory branch sits beside Master Library and contains Inventory-owned native files:

- `Inventory > Write` for `.nvd` documents.
- `Inventory > Draw` for `.nvv` vector documents.

Native files do not belong in the user-editable Master Library.

## Main Layout

Inventory uses a compact workstation layout:

```text
+---------------------------------------------------------------+
| Native title bar                                              |
+---------------------------------------------------------------+
| File  Edit  View  Library  Asset  Board  Window  Help         |
+-------------------+-----------------------------+-------------+
| Library / Document| Preview Stage / Editor      | Inspector   |
| Navigation        |                             |             |
|                   +-----------------------------+             |
|                   | Workspace Asset Shelf       |             |
+-------------------+-----------------------------+-------------+
```

The left pane, right Inspector, and bottom Workspace can collapse or resize. Collapsing them should leave an almost full-screen Preview Stage.

Commands that belong to the whole app live in the menu bar. Editor-specific tools belong in the active scene toolbar.

## Library And Selection

Library Structure contains:

- Master Library.
- Inventory.
- Source Folders.

Selection should have one coherent meaning:

- Selecting a folder changes the Workspace to that folder's direct files.
- Selecting a file makes it the active file for Workspace, Preview Stage, and Inspector.
- Selecting a native document opens or returns to that document view.
- File selection should clear unrelated folder selection.
- Folder and file highlights must never imply two contradictory active selections.

Child folders sort alphabetically at every depth. Files may appear beneath folders, and folders may collapse to keep the tree tidy.

The Add Library Node flow should be parent-aware, search-friendly, and hierarchy-first. It should inherit obvious constraints from the parent instead of asking the user to repeat them.

## Workspace And Preview Stage

The Workspace is the browsing shelf beneath the Preview Stage. It should prioritise the files themselves: thumbnails, names, and necessary metadata. Labels should not cover useful preview content.

The Preview Stage is the main reader or editor surface. It should use the largest reasonable amount of space and avoid decorative framing that makes content feel smaller.

Supported preview/editor families may change over time. Do not hard-code design assumptions around a single file type.

Native editors should keep editing state stable across view changes where practical. Toolbar clicks in a text editor must not destroy the user's text selection.

## Inspector

The Inspector is a scrollable, type-aware detail surface. It should use hierarchy and spacing rather than stacking every value into a card.

Common Inspector content may include:

- File title.
- Modified date.
- File size.
- Tags and kept tags.
- Notes.
- Suggested placement or organisation hints.

Type-specific controls belong here when they describe the selected file or active document rather than the whole application.

## Settings And Themes

Settings should stay calm and sparse. Current groups are:

- General.
- Themes.
- Notifications.

Themes may control surface colours and custom user themes. Built-in Light and Dark themes should not be editable or removable.

Notification preferences belong in Settings only when they control repeated prompts or reminders.

## File Safety

The UI must clearly separate:

- What Inventory knows about.
- What Inventory owns.
- What Inventory physically changes.

Source assets are indexed in place. Native Inventory documents are app-owned and may be explicitly renamed or deleted.

See `FILE_SAFETY_RULES.md` for the full trust boundary.

## Design Test

A change is successful when it makes Inventory feel more capable without making it feel busier.
