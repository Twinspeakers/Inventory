import type { LibraryTagDefinition } from "./types";

export function tag(
  id: string,
  options: Omit<LibraryTagDefinition, "id" | "kind"> & {
    kind?: LibraryTagDefinition["kind"];
  },
): LibraryTagDefinition {
  return {
    id,
    kind: options.kind ?? "content",
    ...options,
  };
}
