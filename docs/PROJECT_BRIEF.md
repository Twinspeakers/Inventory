# Project Brief

## Working Name

Inventory

## North Star

Inventory is a local-first desktop app for finding, understanding, organising, previewing, and lightly editing the creative files a person owns.

The long-term idea is a personal library for every useful digital asset: images, textures, models, audio, documents, references, source files, native Inventory documents, marketplace downloads, and eventually mixed-reality-ready objects.

## Core Promise

Help the user turn a large, messy collection of files into a useful library without putting the original files at risk.

Inventory should answer:

- What do I have?
- Where is it?
- What is it?
- What belongs together?
- Can I preview it quickly?
- Can I make the small change I need without opening a specialist tool?
- Can I reuse or export it safely?

## Product Shape

Inventory is not a file explorer clone and not an asset vault.

Its main concepts are:

- Inventory Project: a real project folder whose `Invent.nvi` file remembers one library.
- Source Folders: real user-owned folders that Inventory scans in place.
- Master Library: a virtual hierarchy that organises source assets without moving them.
- Inventory: a separate built-in branch for app-owned native files such as `.nvd`.
- Preview Stage: the main reader or editor surface for the selected file.
- Workspace: the browseable shelf of files in the current view.
- Inspector: tags, notes, metadata, suggestions, statistics, and type-specific controls.

## Primary Users

- Creative generalists with many different file types
- Solo game developers
- 3D artists
- UI and asset collectors
- Modders
- Writers and document-heavy creators
- People who know they own the right file but cannot find it quickly

## Guiding Principles

- Local-first by default.
- Original source files remain user-owned and safe.
- Inventory stores project memory and metadata, not a hidden copy of the user's creative life.
- The Master Library should reduce work rather than become another filing chore.
- Search, preview, tags, and structure should reinforce one another.
- File types should coexist in one library rather than being isolated into unrelated apps.
- Lightweight editing should complement specialist tools, not imitate them badly.
- Copy is safer than move.
- Destructive operations must be explicit.
- The interface should feel like a calm professional creative tool.

## Current Technical Shape

- Tauri v2 desktop shell
- Rust native commands and persistence
- React + TypeScript UI
- Tailwind CSS styling
- SQLite retained for legacy app metadata
- `Invent.nvi` JSON manifests as active Inventory project state
- Tiptap for NVD rich-text editing
- PDF.js for PDF previews
- Three.js for 3D previews

## Product Boundaries

Inventory is not intended to become:

- A cloud-first account service
- A marketplace
- A team collaboration platform
- A version control system
- A destructive file cleanup utility
- A replacement for Blender, Godot, Photoshop, Reaper, Word, or Scrivener

The app may borrow the most useful lightweight actions from specialist tools while keeping the library itself central.

## Long-Term Direction

Inventory may eventually become a personal digital object library with safe project export, provenance tracking, broad native editor support, and mixed reality metadata.

That direction should grow from a trustworthy library, not distract from it.
