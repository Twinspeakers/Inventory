import type { LucideIcon } from "lucide-react";
import type { LibraryNodeTemplate } from "./types";

export function node(
  id: string,
  name: string,
  description: string,
  category: string,
  icon: LucideIcon,
  options: Omit<LibraryNodeTemplate, "id" | "name" | "description" | "category" | "icon" | "childSuggestionIds" | "childSuggestions"> & {
    childSuggestionIds?: string[];
    childSuggestions?: string[];
  },
): LibraryNodeTemplate {
  return {
    id,
    name,
    description,
    category,
    icon,
    aliases: options.aliases,
    suggestedTags: options.suggestedTags,
    fileTypes: options.fileTypes,
    childSuggestionIds: options.childSuggestionIds ?? [],
    childSuggestions: options.childSuggestions ?? [],
    matchRules: options.matchRules,
  };
}
