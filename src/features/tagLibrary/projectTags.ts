import { normalizeLibraryMatchText, normalizeLibraryNodeTagValues } from "../../libraryCatalog";

export function createProjectTagGroupId(label: string) {
  const slug = toSlug(label) || "project-group";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `project-group-${Date.now()}-${slug}-${suffix}`;
}

export function createProjectTagId(label: string) {
  return normalizeLibraryNodeTagValues([label])[0] ?? "";
}

export function projectTagGroupLabelExists(label: string, labels: Iterable<string>) {
  const normalizedLabel = normalizeLibraryMatchText(label);
  return [...labels].some((candidate) => normalizeLibraryMatchText(candidate) === normalizedLabel);
}

function toSlug(value: string) {
  return normalizeLibraryMatchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
