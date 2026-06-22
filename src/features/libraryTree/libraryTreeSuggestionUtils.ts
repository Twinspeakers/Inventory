import { customLibraryNodeTemplate, getDefaultLibraryNodeTagsForName, normalizeLibraryMatchText, type LibraryNodeFileType, type LibraryNodeTemplate } from "../../libraryCatalog";
import type { AddFolderSuggestion, VirtualFolder } from "../../app/appTypes";
import { compareText } from "../../app/workspace/workspaceState";
import type { LucideIcon } from "lucide-react";
import {
  findLibraryNodeTemplateById,
  findLibraryNodeTemplateByName,
  getLibraryNodeTemplateSearchText,
  getSharedTagTemplatePrefixLength,
  isTagTemplateAncestor,
  getTagTemplatePath,
  getTemplateSearchAdjustment,
  isDirectTagTemplateChild,
  isTagTemplateDescendant,
} from "./libraryTreeTemplateUtils";

type SuggestionDeps = {
  defaultLibraryRootTemplateId: string;
  getLibraryNodeTagsFromTemplate: (template: LibraryNodeTemplate, name: string) => string[];
  getLibraryNodeTemplateForFolder: (folder: VirtualFolder) => LibraryNodeTemplate;
  normalizeLibraryNodeFileTypes: (fileTypes: LibraryNodeFileType[]) => LibraryNodeFileType[];
  toSlug: (value: string) => string;
};

export function getAddFolderSuggestions(
  templates: LibraryNodeTemplate[],
  parentFolder: VirtualFolder | null,
  query: string,
  folders: VirtualFolder[] = [],
  deps: SuggestionDeps,
): AddFolderSuggestion[] {
  const search = normalizeLibraryMatchText(query);
  const parentTemplate = getLibraryNodeTemplateForSuggestionParent(parentFolder, templates, deps);
  const parentLabel = parentFolder?.name ?? "Master";
  const parentFileTypes = getInheritedSuggestionFileTypes(parentTemplate, deps);
  const suggestionLimit = search ? 24 : parentFolder?.children.length ? 24 : 14;
  const suggestions: AddFolderSuggestion[] = [];
  const seenNames = new Set<string>();
  const currentParentChildren = getSuggestionParentChildren(parentFolder, folders);
  const existingChildNames = new Set(currentParentChildren.map((child) => normalizeLibraryMatchText(child.name)).filter(Boolean));
  const existingChildTemplateIds = new Set(
    currentParentChildren
      .map((child) => deps.getLibraryNodeTemplateForFolder(child).id)
      .filter((templateId) => templateId && templateId !== "custom"),
  );

  function addSuggestion(suggestion: AddFolderSuggestion) {
    const key = normalizeLibraryMatchText(suggestion.name);

    if (!key || seenNames.has(key) || existingChildNames.has(key)) {
      return;
    }

    if (suggestion.template && existingChildTemplateIds.has(suggestion.template.id)) {
      return;
    }

    if (search && !getAddFolderSuggestionSearchText(suggestion).includes(search)) {
      return;
    }

    seenNames.add(key);
    suggestions.push(suggestion);
  }

  for (const childTemplateId of parentTemplate.childSuggestionIds) {
    const childTemplate = findLibraryNodeTemplateById(templates, childTemplateId);

    if (!childTemplate) {
      continue;
    }

    addSuggestion(createSuggestionFromTemplate(childTemplate, "parent", parentFileTypes, deps));
  }

  for (const childName of parentTemplate.childSuggestions) {
    const childTemplate = findLibraryNodeTemplateByName(templates, childName);

    addSuggestion(
      childTemplate
        ? createSuggestionFromTemplate(childTemplate, "parent", parentFileTypes, deps)
        : createCustomChildSuggestion(childName, parentLabel, parentFileTypes, parentTemplate.icon, deps),
    );
  }

  const rankedTemplates = templates
    .filter((template) => template.id !== parentTemplate.id && template.id !== deps.defaultLibraryRootTemplateId)
    .map((template) => ({
      rank: rankTemplateForSuggestionContext(template, parentTemplate, parentFolder, search, folders, deps),
      template,
    }))
    .filter(({ rank }) => rank < 500)
    .sort((first, second) => first.rank - second.rank || compareText(first.template.name, second.template.name));

  for (const { template } of rankedTemplates) {
    addSuggestion(createSuggestionFromTemplate(template, "catalog", parentFileTypes, deps));

    if (suggestions.length >= suggestionLimit) {
      break;
    }
  }

  return suggestions.slice(0, suggestionLimit);
}

export function createSuggestionFromTemplate(
  template: LibraryNodeTemplate,
  source: AddFolderSuggestion["source"],
  parentFileTypes: LibraryNodeFileType[],
  deps: SuggestionDeps,
): AddFolderSuggestion {
  return {
    category: template.category,
    description: template.description,
    fileTypes: scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes, deps),
    icon: template.icon,
    id: `${source}:${template.id}`,
    name: template.name,
    source,
    tags: deps.getLibraryNodeTagsFromTemplate(template, template.name),
    template,
  };
}

export function createCustomChildSuggestion(
  name: string,
  parentLabel: string,
  parentFileTypes: LibraryNodeFileType[],
  icon: LucideIcon,
  deps: Pick<SuggestionDeps, "toSlug">,
): AddFolderSuggestion {
  return {
    category: `${parentLabel} Child`,
    description: `Suggested child folder under ${parentLabel}.`,
    fileTypes: parentFileTypes,
    icon,
    id: `parent:${deps.toSlug(name) || normalizeLibraryMatchText(name)}`,
    name,
    source: "parent",
    tags: getDefaultLibraryNodeTagsForName(name),
    template: null,
  };
}

export function rankTemplateForParentSuggestion(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  search: string,
  deps: Pick<SuggestionDeps, "normalizeLibraryNodeFileTypes">,
) {
  const templateText = getLibraryNodeTemplateSearchText(template);

  if (search && !templateText.includes(search)) {
    return 600;
  }

  const childSuggestionIdIndex = parentTemplate.childSuggestionIds.findIndex((childTemplateId) => childTemplateId === template.id);

  if (childSuggestionIdIndex >= 0) {
    return childSuggestionIdIndex;
  }

  const childSuggestionIndex = parentTemplate.childSuggestions.findIndex(
    (childName) => normalizeLibraryMatchText(childName) === normalizeLibraryMatchText(template.name),
  );

  if (childSuggestionIndex >= 0) {
    return 20 + childSuggestionIndex;
  }

  const templatePath = getTagTemplatePath(template.id);
  const parentPath = getTagTemplatePath(parentTemplate.id);

  if (parentPath.length > 0 && isTagTemplateAncestor(templatePath, parentPath)) {
    return 600;
  }

  const taxonomyRank = getTagTemplateSuggestionRank(template, parentTemplate);

  if (taxonomyRank < 600) {
    return taxonomyRank + getTemplateSearchAdjustment(template, templateText, search);
  }

  if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes, deps)) {
    const baseRank = template.id.startsWith("tag:")
      ? parentTemplate.category === template.category
        ? 210
        : 240
      : parentTemplate.category === template.category
        ? 260
        : 300;

    return baseRank + getTemplateSearchAdjustment(template, templateText, search);
  }

  if (parentTemplate.fileTypes.includes("Any") || template.fileTypes.includes("Any")) {
    return 360 + getTemplateSearchAdjustment(template, templateText, search);
  }

  if (search) {
    return 420 + getTemplateSearchAdjustment(template, templateText, search);
  }

  return 600;
}

export function getAddFolderSuggestionSearchText(suggestion: AddFolderSuggestion) {
  return normalizeLibraryMatchText([
    suggestion.name,
    suggestion.category,
    suggestion.description,
    ...suggestion.fileTypes,
    ...suggestion.tags,
    suggestion.template ? getLibraryNodeTemplateSearchText(suggestion.template) : "",
  ].join(" "));
}

export function getLibraryNodeTemplateForSuggestionParent(
  parentFolder: VirtualFolder | null,
  templates: LibraryNodeTemplate[],
  deps: Pick<SuggestionDeps, "getLibraryNodeTemplateForFolder" | "defaultLibraryRootTemplateId">,
) {
  if (!parentFolder) {
    return templates.find((template) => template.id === deps.defaultLibraryRootTemplateId) ?? customLibraryNodeTemplate;
  }

  const template = deps.getLibraryNodeTemplateForFolder(parentFolder);

  if (template.id !== "custom") {
    return template;
  }

  return findLibraryNodeTemplateByName(templates, parentFolder.name) ?? template;
}

export function getInheritedSuggestionFileTypes(
  template: LibraryNodeTemplate,
  deps: Pick<SuggestionDeps, "normalizeLibraryNodeFileTypes">,
) {
  const fileTypes = deps.normalizeLibraryNodeFileTypes(template.fileTypes);
  return fileTypes.includes("Any") ? (["Any"] satisfies LibraryNodeFileType[]) : fileTypes;
}

export function scopeLibraryNodeFileTypes(
  parentFileTypes: LibraryNodeFileType[],
  childFileTypes: LibraryNodeFileType[],
  deps: Pick<SuggestionDeps, "normalizeLibraryNodeFileTypes">,
) {
  const normalizedParentFileTypes = deps.normalizeLibraryNodeFileTypes(parentFileTypes);
  const normalizedChildFileTypes = deps.normalizeLibraryNodeFileTypes(childFileTypes);

  if (normalizedParentFileTypes.includes("Any")) {
    return normalizedChildFileTypes;
  }

  if (normalizedChildFileTypes.includes("Any")) {
    return normalizedParentFileTypes;
  }

  const scopedFileTypes = normalizedChildFileTypes.filter((fileType) => normalizedParentFileTypes.includes(fileType));
  return scopedFileTypes.length > 0 ? scopedFileTypes : normalizedParentFileTypes;
}

export function libraryNodeFileTypesOverlap(
  first: LibraryNodeFileType[],
  second: LibraryNodeFileType[],
  deps: Pick<SuggestionDeps, "normalizeLibraryNodeFileTypes">,
) {
  const normalizedFirst = deps.normalizeLibraryNodeFileTypes(first);
  const normalizedSecond = deps.normalizeLibraryNodeFileTypes(second);

  return normalizedFirst.includes("Any") || normalizedSecond.includes("Any") || normalizedFirst.some((fileType) => normalizedSecond.includes(fileType));
}

export function getLibraryNodeChildSuggestionTemplates(
  parentTemplate: LibraryNodeTemplate,
  templates: LibraryNodeTemplate[],
  deps: Pick<SuggestionDeps, "defaultLibraryRootTemplateId" | "normalizeLibraryNodeFileTypes">,
) {
  const suggestionTemplates: LibraryNodeTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  function addTemplate(template: LibraryNodeTemplate | undefined) {
    if (!template || template.id === deps.defaultLibraryRootTemplateId || template.id === parentTemplate.id || seenTemplateIds.has(template.id)) {
      return;
    }

    seenTemplateIds.add(template.id);
    suggestionTemplates.push(template);
  }

  for (const childTemplateId of parentTemplate.childSuggestionIds) {
    addTemplate(findLibraryNodeTemplateById(templates, childTemplateId));
  }

  for (const childName of parentTemplate.childSuggestions) {
    addTemplate(findLibraryNodeTemplateByName(templates, childName));
  }

  for (const template of templates) {
    if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes, deps)) {
      addTemplate(template);
    }
  }

  return suggestionTemplates;
}

function rankTemplateForSuggestionContext(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  parentFolder: VirtualFolder | null,
  search: string,
  folders: VirtualFolder[],
  deps: Pick<SuggestionDeps, "defaultLibraryRootTemplateId" | "getLibraryNodeTemplateForFolder" | "normalizeLibraryNodeFileTypes">,
) {
  const baseRank = rankTemplateForParentSuggestion(template, parentTemplate, search, deps);

  if (baseRank >= 600) {
    return baseRank;
  }

  return baseRank + getStructureAwareSuggestionAdjustment(template, parentTemplate, parentFolder, search, folders, deps);
}

function getStructureAwareSuggestionAdjustment(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  parentFolder: VirtualFolder | null,
  search: string,
  folders: VirtualFolder[],
  deps: Pick<SuggestionDeps, "defaultLibraryRootTemplateId" | "getLibraryNodeTemplateForFolder">,
) {
  let adjustment = 0;
  const templatePath = getTagTemplatePath(template.id);

  if (!search && !parentFolder && folders.length === 0 && templatePath.length > 1) {
    adjustment += 90 + templatePath.length * 8;
  }

  const existingTemplateIds = collectExistingFolderTemplateIds(folders, deps);

  if (existingTemplateIds.has(template.id)) {
    adjustment += parentFolder ? 24 : 40;
  }

  if (!parentFolder) {
    adjustment += getRootSuggestionAdjustment(template, parentTemplate, search, folders, deps);
  }

  if (parentFolder) {
    const childTemplatePaths = parentFolder.children
      .map((child) => getTagTemplatePath(deps.getLibraryNodeTemplateForFolder(child).id))
      .filter((path) => path.length > 0);

    adjustment += getExistingChildBranchAdjustment(templatePath, childTemplatePaths);
  }

  return adjustment;
}

function getRootSuggestionAdjustment(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  search: string,
  folders: VirtualFolder[],
  deps: Pick<SuggestionDeps, "defaultLibraryRootTemplateId" | "getLibraryNodeTemplateForFolder">,
) {
  if (search || parentTemplate.id !== deps.defaultLibraryRootTemplateId) {
    return 0;
  }

  let adjustment = 0;
  const rootTemplateIds = new Set(
    folders
      .map((folder) => deps.getLibraryNodeTemplateForFolder(folder).id)
      .filter((templateId) => templateId && templateId !== "custom"),
  );
  const templatePath = getTagTemplatePath(template.id);
  const directRootSuggestionIndex = parentTemplate.childSuggestionIds.findIndex((childTemplateId) => childTemplateId === template.id);

  if (directRootSuggestionIndex >= 0 && !rootTemplateIds.has(template.id)) {
    adjustment -= Math.max(22, 80 - directRootSuggestionIndex * 3);
  }

  if (templatePath.length > 1) {
    const topLevelTemplateId = `tag:${templatePath[0]}`;

    if (!rootTemplateIds.has(topLevelTemplateId)) {
      adjustment += 96 + templatePath.length * 10;
    } else {
      adjustment -= 36 + templatePath.length * 4;
    }
  }

  return adjustment;
}

function getExistingChildBranchAdjustment(templatePath: string[], childTemplatePaths: string[][]) {
  if (templatePath.length === 0 || childTemplatePaths.length === 0) {
    return 0;
  }

  let bestAdjustment = 0;

  for (const childPath of childTemplatePaths) {
    if (isDirectTagTemplateChild(templatePath, childPath)) {
      bestAdjustment = Math.min(bestAdjustment, -80);
      continue;
    }

    if (isTagTemplateDescendant(templatePath, childPath)) {
      bestAdjustment = Math.min(bestAdjustment, -60);
      continue;
    }

    const sharedPrefixLength = getSharedTagTemplatePrefixLength(templatePath, childPath);

    if (sharedPrefixLength > 0) {
      bestAdjustment = Math.min(bestAdjustment, -(18 + sharedPrefixLength * 12));
    }
  }

  return bestAdjustment;
}

function getSuggestionParentChildren(parentFolder: VirtualFolder | null, folders: VirtualFolder[]) {
  return parentFolder ? parentFolder.children : folders;
}

function collectExistingFolderTemplateIds(
  folders: VirtualFolder[],
  deps: Pick<SuggestionDeps, "getLibraryNodeTemplateForFolder">,
) {
  const templateIds = new Set<string>();

  function visit(currentFolders: VirtualFolder[]) {
    for (const folder of currentFolders) {
      const templateId = deps.getLibraryNodeTemplateForFolder(folder).id;

      if (templateId && templateId !== "custom") {
        templateIds.add(templateId);
      }

      visit(folder.children);
    }
  }

  visit(folders);
  return templateIds;
}

function getTagTemplateSuggestionRank(template: LibraryNodeTemplate, parentTemplate: LibraryNodeTemplate) {
  const templatePath = getTagTemplatePath(template.id);

  if (templatePath.length === 0) {
    return 600;
  }

  const parentPath = getTagTemplatePath(parentTemplate.id);

  if (parentPath.length > 0) {
    if (isTagTemplateAncestor(templatePath, parentPath)) {
      return 600;
    }

    if (isDirectTagTemplateChild(templatePath, parentPath)) {
      return 60;
    }

    if (isTagTemplateDescendant(templatePath, parentPath)) {
      return 90 + (templatePath.length - parentPath.length);
    }

    if (templatePath[0] === parentPath[0]) {
      return 150 + templatePath.length;
    }
  }

  let bestRank = 600;

  for (const [scopeIndex, childTemplateId] of parentTemplate.childSuggestionIds.entries()) {
    const scopePath = getTagTemplatePath(childTemplateId);

    if (scopePath.length === 0) {
      continue;
    }

    if (isDirectTagTemplateChild(templatePath, scopePath)) {
      bestRank = Math.min(bestRank, 120 + scopeIndex * 12);
      continue;
    }

    if (isTagTemplateDescendant(templatePath, scopePath)) {
      bestRank = Math.min(bestRank, 160 + scopeIndex * 12 + (templatePath.length - scopePath.length));
      continue;
    }

    if (templatePath[0] === scopePath[0]) {
      bestRank = Math.min(bestRank, 230 + scopeIndex * 8 + templatePath.length);
    }
  }

  return bestRank;
}
