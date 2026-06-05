# File Safety Rules

Inventory must be trustworthy around user files. These rules are product requirements, not nice-to-haves.

## Core Rule

The app never silently moves, renames, copies, modifies, or deletes user files.

## Metadata Versus Assets

Inventory project metadata stores:

- File paths
- File names
- Extensions
- File types
- Sizes
- Modified timestamps
- Hashes when needed
- Tags
- Notes
- Preview/cache paths
- Source/license metadata later

Inventory does not store or own the original asset files.

Inventory-owned documents are a separate case. Files created by Inventory inside an Inventory project's `documents/` folder, such as `.nvd`, are owned by that project and may be explicitly renamed or deleted through document-management actions.

## Default Behaviour

Safe defaults:

- Index files in place.
- Preview files without modifying them.
- Store thumbnails in the app cache.
- Reveal/open originals only when requested.
- Copy files by default when sending assets elsewhere.

Riskier actions:

- Move
- Rename
- Delete from disk
- Overwrite
- Modify original metadata

Riskier actions require explicit user confirmation and should not appear in early versions unless they are truly needed.

An explicit rename of an Inventory-owned document may update its real file because the app created and owns that file. An explicit delete of an Inventory-owned document must clearly say that the file will be permanently deleted and cannot be undone.

## Physical File Operations

Any physical file operation should follow this flow:

1. Plan the operation.
2. Show a clear preview.
3. Validate conflicts and missing paths.
4. Ask for confirmation.
5. Apply the operation.
6. Log what happened.
7. Offer undo when practical.

## Copy Before Move

Copy is the preferred operation for project workflows.

Move should be treated as an advanced action because it changes where the user's source asset lives.

## Delete Rules

Removing an asset from the Inventory index and deleting it from disk are different actions.

Allowed early:

- Remove asset from Inventory index.
- Remove source folder from Inventory.

Avoid early:

- Delete original file from disk.
- Delete entire folders.
- Bulk destructive cleanup.

Allowed for Inventory-owned documents:

- Rename a project-owned document after a direct user command.
- Delete a project-owned document after a clear permanent-delete confirmation.

## Cache Rules

Generated files belong in an app-owned cache, such as:

- Thumbnails
- Model preview renders
- Extracted metadata
- Temporary scan outputs

The app should not write cache files beside the user's original assets unless the user explicitly chooses that behaviour.

## Missing Files

If a scanned file disappears or moves outside the app:

- Mark it as missing.
- Keep tags and notes.
- Offer relink/remove actions later.
- Do not assume the user wants the record deleted.

## Future Operation Log

When file operations are implemented, log at least:

- Timestamp
- Operation type
- Source path
- Destination path, if any
- Result
- Error message, if any
- Whether the operation was user-confirmed
