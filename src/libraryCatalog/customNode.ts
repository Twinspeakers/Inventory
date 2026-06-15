import { Folder } from "lucide-react";
import type { LibraryNodeTemplate } from "./types";

export const customLibraryNodeTemplate: LibraryNodeTemplate = {
  id: "custom",
  name: "Custom Node",
  description: "A blank library node you can name for the way this library wants to think.",
  category: "Custom",
  aliases: [],
  icon: Folder,
  suggestedTags: [],
  fileTypes: ["Any"],
  childSuggestionIds: [],
  childSuggestions: [],
  matchRules: [],
};
