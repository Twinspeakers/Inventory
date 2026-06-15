import { Folder, Leaf, Package, User } from "lucide-react";

import { libraryTagSourceSections, type LibraryTagSourceFile, type LibraryTagSourceFolder, type LibraryTagSourceSection } from "../tags";
import type { LibraryNodeFileType, LibraryNodeTemplate, LibraryTagDefinition } from "../types";

const hiddenSectionIds = new Set(["system"]);
const skippedFileIds = new Set(["general", "system"]);

const sectionIcons = {
  activities: Package,
  animals: Leaf,
  environment: Folder,
  food: Package,
  materials: Package,
  "natural-world": Leaf,
  objects: Package,
  people: User,
  styles: Folder,
} as const;

type BuiltTemplateGroup = {
  childIds: string[];
  childNames: string[];
  templates: LibraryNodeTemplate[];
};

export const generatedLibraryNodeTemplates = buildGeneratedLibraryNodeTemplates(libraryTagSourceSections);

function buildGeneratedLibraryNodeTemplates(sections: LibraryTagSourceSection[]) {
  return sections.flatMap((section) => {
    if (hiddenSectionIds.has(section.id)) {
      return [];
    }

    return buildSourceFolderTemplate(section, {
      path: [section.id],
      section,
      sectionLabel: section.label,
      isSection: true,
    }).templates;
  });
}

function buildSourceFolderTemplate(
  folder: LibraryTagSourceFolder,
  context: {
    path: string[];
    section: LibraryTagSourceSection;
    sectionLabel: string;
    isSection: boolean;
  },
): BuiltTemplateGroup {
  const childIds: string[] = [];
  const childNames: string[] = [];
  const childTemplates: LibraryNodeTemplate[] = [];

  for (const childFolder of folder.folders ?? []) {
    const builtChildFolder = buildSourceFolderTemplate(childFolder, {
      path: [...context.path, childFolder.id],
      section: context.section,
      sectionLabel: context.sectionLabel,
      isSection: false,
    });

    childIds.push(...builtChildFolder.childIds.slice(0, 1));
    childNames.push(...builtChildFolder.childNames.slice(0, 1));
    childTemplates.push(...builtChildFolder.templates);
  }

  for (const file of folder.files) {
    if (!shouldGenerateFileTemplate(file, folder, context.isSection)) {
      continue;
    }

    const fileTemplateId = getTagTemplateId([...context.path, file.id]);
    childIds.push(fileTemplateId);
    childNames.push(getSourceFileTemplateName(file));
    childTemplates.push(createSourceFileTemplate(file, {
      id: fileTemplateId,
      sectionId: context.section.id,
      sectionLabel: context.sectionLabel,
      pathLabels: [...getSourceFolderPathLabels(context.path), getSourceFileTemplateName(file)],
    }));
  }

  const templateId = getTagTemplateId(context.path);
  const templateName = context.isSection ? folder.label : getSourceFolderTemplateName(folder);
  const templateTags = collectSourceFolderTags(folder);
  const template: LibraryNodeTemplate = {
    id: templateId,
    name: templateName,
    description: context.isSection
      ? `${folder.label} folders generated from the tag library taxonomy.`
      : `Tag-backed folder template for ${[context.sectionLabel, ...getSourceFolderPathLabels(context.path).slice(1)].join(" / ")}.`,
    category: context.isSection ? "Tag Sections" : context.sectionLabel,
    aliases: [],
    icon: getTemplateIcon(context.section.id),
    suggestedTags: getTemplateSuggestedTags(templateTags),
    fileTypes: getTemplateFileTypes(templateTags),
    childSuggestionIds: childIds,
    childSuggestions: childNames,
    matchRules: createTemplateMatchRules(templateTags),
  };

  return {
    childIds: [templateId],
    childNames: [templateName],
    templates: [template, ...childTemplates],
  };
}

function createSourceFileTemplate(
  file: LibraryTagSourceFile,
  context: {
    id: string;
    sectionId: string;
    sectionLabel: string;
    pathLabels: string[];
  },
): LibraryNodeTemplate {
  const name = getSourceFileTemplateName(file);

  return {
    id: context.id,
    name,
    description: `Tag-backed folder template for ${context.pathLabels.join(" / ")}.`,
    category: context.sectionLabel,
    aliases: [],
    icon: getTemplateIcon(context.sectionId),
    suggestedTags: getTemplateSuggestedTags(file.tags),
    fileTypes: getTemplateFileTypes(file.tags),
    childSuggestionIds: [],
    childSuggestions: [],
    matchRules: createTemplateMatchRules(file.tags),
  };
}

function shouldGenerateFileTemplate(file: LibraryTagSourceFile, folder: LibraryTagSourceFolder, isSection: boolean) {
  if (skippedFileIds.has(file.id)) {
    return false;
  }

  if (file.id === folder.id) {
    return false;
  }

  return !(isSection && file.id === "system");
}

function getTemplateIcon(sectionId: string) {
  return sectionIcons[sectionId as keyof typeof sectionIcons] ?? Folder;
}

function getTagTemplateId(path: string[]) {
  return `tag:${path.join("/")}`;
}

function getSourceFolderTemplateName(folder: LibraryTagSourceFolder) {
  return folder.label;
}

function getSourceFileTemplateName(file: LibraryTagSourceFile) {
  return humanizeIdentifier(file.id);
}

function getSourceFolderPathLabels(path: string[]) {
  return path.map((segment) => humanizeIdentifier(segment));
}

function humanizeIdentifier(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function collectSourceFolderTags(folder: LibraryTagSourceFolder): LibraryTagDefinition[] {
  return [
    ...folder.files.flatMap((file) => file.tags),
    ...(folder.folders ?? []).flatMap((childFolder) => collectSourceFolderTags(childFolder)),
  ];
}

function getTemplateSuggestedTags(tags: LibraryTagDefinition[]) {
  return uniqueValues(tags.map((tag) => tag.id)).slice(0, 16);
}

function getTemplateFileTypes(tags: LibraryTagDefinition[]): LibraryNodeFileType[] {
  const fileTypes = uniqueValues(tags.flatMap((tag) => tag.locksToFileTypes ?? []));
  return fileTypes.length > 0 ? (fileTypes as LibraryNodeFileType[]) : ["Any"];
}

function createTemplateMatchRules(tags: LibraryTagDefinition[]) {
  const tagTerms = uniqueValues(tags.map((tag) => tag.id)).slice(0, 32);
  const nameTerms = uniqueValues(tags.flatMap((tag) => [tag.label, ...(tag.aliases ?? [])])).slice(0, 32);

  return [
    ...(tagTerms.length > 0 ? [{ field: "tag" as const, terms: tagTerms, weight: 8 }] : []),
    ...(nameTerms.length > 0 ? [{ field: "name" as const, terms: nameTerms, weight: 4 }] : []),
  ];
}

function uniqueValues<T extends string>(values: T[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
