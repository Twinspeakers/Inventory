import type { LibraryNodeTemplate } from "../types";
import { generatedLibraryNodeTemplates } from "./generatedNodeTemplates";
import { libraryNodeTemplates as manualLibraryNodeTemplates } from "./libraryNodes";
import { libraryNodeTemplateOverrides } from "./nodeTemplateOverrides";

const visibleManualTemplateIds = new Set([
  "all-assets",
  "3d-objects",
  "images",
  "photos",
  "textures",
  "icons",
  "ui",
  "concept-art",
  "sprites",
  "screenshots",
  "audio",
  "sound-effects",
  "music",
  "ambience",
  "voice",
  "documents",
  "pdfs",
  "notes",
  "tutorials",
  "planning",
  "licenses",
  "receipts",
  "source-files",
  "blender",
  "photoshop",
  "illustrator",
  "godot",
  "unity",
  "code",
  "archives",
  "marketplace-packs",
  "realistic",
  "stylized",
  "low-poly",
  "mid-poly",
  "high-poly",
  "very-high-poly",
  "pixel-art",
  "sci-fi",
  "fantasy",
  "historical",
]);

const generatedTopLevelTemplates = generatedLibraryNodeTemplates.filter((template) => {
  const path = template.id.replace(/^tag:/, "");
  return path.split("/").length === 1;
});

const allManualLibraryNodeTemplates = manualLibraryNodeTemplates.map((template) => {
  if (template.id !== "all-assets") {
    return template;
  }

  return {
    ...template,
    childSuggestionIds: uniqueValues([...template.childSuggestionIds, ...generatedTopLevelTemplates.map((candidate) => candidate.id)]),
    childSuggestions: uniqueValues([...template.childSuggestions, ...generatedTopLevelTemplates.map((candidate) => candidate.name)]),
  };
}).map(applyTemplateOverride);

export const allLibraryNodeTemplates: LibraryNodeTemplate[] = allManualLibraryNodeTemplates.concat(generatedLibraryNodeTemplates.map(applyTemplateOverride));

export const libraryNodeTemplates: LibraryNodeTemplate[] = allLibraryNodeTemplates.filter((template) => {
  if (template.id.startsWith("tag:")) {
    return true;
  }

  return visibleManualTemplateIds.has(template.id);
});

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function applyTemplateOverride(template: LibraryNodeTemplate): LibraryNodeTemplate {
  const override = libraryNodeTemplateOverrides[template.id];

  if (!override) {
    return template;
  }

  return {
    ...template,
    ...override,
    aliases: uniqueValues([...(template.aliases ?? []), ...(override.aliases ?? [])]),
    suggestedTags: uniqueValues([...(template.suggestedTags ?? []), ...(override.suggestedTags ?? [])]),
    childSuggestionIds:
      "childSuggestionIds" in override
        ? uniqueValues([...(override.childSuggestionIds ?? [])])
        : template.childSuggestionIds,
    childSuggestions:
      "childSuggestions" in override
        ? uniqueValues([...(override.childSuggestions ?? [])])
        : template.childSuggestions,
    fileTypes: override.fileTypes ?? template.fileTypes,
    matchRules: override.matchRules ?? template.matchRules,
  };
}
