# Inventory

Inventory is a local-first creative workspace for organising, previewing, and making with the files you own.

It is being built as a desktop app that keeps the user's files on their machine while giving them a calmer place to work across documents, vectors, previews, tags, and project-owned creative files.

## Current Focus

- A local Inventory project format with project-owned native files.
- A Master Library for organising files without moving the originals.
- Preview support for common creative formats.
- Write, a native `.nvd` document editor.
- Draw, a native `.nvv` vector editor.
- Durable local metadata for tags, notes, workspace state, and editor settings.

See the project docs in [`docs/`](docs/) for the design direction, MVP scope, decisions, and file-safety rules.

## Stack

- Tauri v2
- React
- TypeScript
- Tailwind CSS
- Rust
- Vitest

## Development

Install dependencies, then run the app:

```powershell
npm install
npm run tauri dev
```

Useful checks:

```powershell
npm run build
npm test
cd src-tauri
cargo fmt --check
cargo test
```

## License

No public license has been granted at this time.
