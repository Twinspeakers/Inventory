# Inventory Agent Notes

## Context loading
For general project orientation, read only:
1. README.md
2. docs/PROJECT_BRIEF.md
3. docs/DECISIONS.md
4. docs/FILE_SAFETY_RULES.md

Only read these when directly relevant:
- docs/INVENTORY_FORMAT.md — project file/data format work
- docs/DESIGN_DRAFT.md — UX/design direction
- docs/HANDOVER.md — current state or resuming stale work
- docs/WORK_LOG.md — history/debugging only

Do not read generated folders or build output:
- node_modules/
- .vite/
- dist/
- src-tauri/target/
- coverage/
- *.log

Do not read package-lock.json unless dependency work or specifically asked.

## Existing UI warning
Do not use Tailwind's `shadow-soft` at all. It creates strange behaviour.