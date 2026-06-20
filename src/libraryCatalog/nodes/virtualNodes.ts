import { FolderOpen } from "lucide-react";

import { node } from "../node";
import type { LibraryNodeTemplate } from "../types";

export function createVirtualLibraryRootNode(childTemplates: LibraryNodeTemplate[]): LibraryNodeTemplate {
  return node("library", "Library", "Browse everything Inventory knows about through the shared tag taxonomy.", "Foundation", FolderOpen, {
    aliases: ["catalog", "master library", "everything"],
    suggestedTags: [],
    fileTypes: ["Any"],
    childSuggestionIds: childTemplates.map((template) => template.id),
    childSuggestions: [],
    matchRules: [],
  });
}
