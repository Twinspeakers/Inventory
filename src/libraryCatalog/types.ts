import type { LucideIcon } from "lucide-react";

export type LibraryNodeFileType = "Any" | "Image" | "3D" | "Audio" | "Document" | "Archive" | "Source";
export type LibraryNodeMatchField = "name" | "path" | "extension" | "tag" | "type" | "notes";

export type LibraryNodeMatchRule = {
  field: LibraryNodeMatchField;
  terms: string[];
  weight?: number;
};

export type LibraryNodeTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  aliases: string[];
  icon: LucideIcon;
  suggestedTags: string[];
  fileTypes: LibraryNodeFileType[];
  childSuggestionIds: string[];
  childSuggestions: string[];
  matchRules: LibraryNodeMatchRule[];
};

export type LibraryTagKind = "content" | "system" | "style" | "workflow";

export type LibraryTagDefinition = {
  id: string;
  label: string;
  kind: LibraryTagKind;
  description?: string;
  aliases?: string[];
  parents?: string[];
  implies?: string[];
  matches?: string[];
  related?: string[];
  locksToFileTypes?: LibraryNodeFileType[];
};
