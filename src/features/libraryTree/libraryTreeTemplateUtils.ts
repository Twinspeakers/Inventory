import type { LibraryNodeTemplate } from "../../libraryCatalog";
import { normalizeLibraryMatchText } from "../../libraryCatalog";

export function getTagTemplatePath(templateId: string) {
  if (!templateId.startsWith("tag:")) {
    return [] as string[];
  }

  return templateId
    .slice(4)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isDirectTagTemplateChild(templatePath: string[], parentPath: string[]) {
  return templatePath.length === parentPath.length + 1 && hasTagTemplatePathPrefix(templatePath, parentPath);
}

export function isTagTemplateDescendant(templatePath: string[], parentPath: string[]) {
  return templatePath.length > parentPath.length && hasTagTemplatePathPrefix(templatePath, parentPath);
}

export function isTagTemplateAncestor(templatePath: string[], descendantPath: string[]) {
  return templatePath.length < descendantPath.length && hasTagTemplatePathPrefix(descendantPath, templatePath);
}

function hasTagTemplatePathPrefix(candidatePath: string[], prefixPath: string[]) {
  return prefixPath.every((segment, index) => candidatePath[index] === segment);
}

export function getSharedTagTemplatePrefixLength(firstPath: string[], secondPath: string[]) {
  let prefixLength = 0;

  while (prefixLength < firstPath.length && prefixLength < secondPath.length && firstPath[prefixLength] === secondPath[prefixLength]) {
    prefixLength += 1;
  }

  return prefixLength;
}

export function getTemplateSearchAdjustment(template: LibraryNodeTemplate, templateText: string, search: string) {
  if (!search) {
    return 0;
  }

  const normalizedName = normalizeLibraryMatchText(template.name);
  const normalizedAliases = template.aliases.map((alias) => normalizeLibraryMatchText(alias));

  if (normalizedName === search) {
    return -70;
  }

  if (normalizedAliases.includes(search)) {
    return -60;
  }

  if (normalizedName.startsWith(search)) {
    return -40;
  }

  if (normalizedName.includes(search)) {
    return -24;
  }

  if (normalizedAliases.some((alias) => alias.startsWith(search))) {
    return -18;
  }

  if (templateText.startsWith(search)) {
    return -12;
  }

  return 0;
}

export function findLibraryNodeTemplateByName(templates: LibraryNodeTemplate[], name: string) {
  const normalizedName = normalizeLibraryMatchText(name);
  return templates.find((template) => normalizeLibraryMatchText(template.name) === normalizedName);
}

export function findLibraryNodeTemplateById(templates: LibraryNodeTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId);
}

export function getLibraryNodeTemplateSearchText(template: LibraryNodeTemplate) {
  return [
    template.name,
    template.description,
    template.category,
    ...template.aliases,
    ...template.suggestedTags,
    ...template.fileTypes,
    ...template.childSuggestions,
    ...template.matchRules.flatMap((rule) => [rule.field, ...rule.terms]),
  ]
    .join(" ")
    .toLowerCase();
}

export function groupLibraryNodeTemplates(templates: LibraryNodeTemplate[]) {
  const groups: Array<{ category: string; templates: LibraryNodeTemplate[] }> = [];

  for (const template of templates) {
    const group = groups.find((candidate) => candidate.category === template.category);

    if (group) {
      group.templates.push(template);
    } else {
      groups.push({ category: template.category, templates: [template] });
    }
  }

  return groups;
}
