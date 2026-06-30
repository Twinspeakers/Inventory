import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  customLibraryNodeTemplate,
  isIgnoredLibraryMatchTerm,
  allLibraryNodeTemplates,
  libraryNodeTemplates,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  type LibraryNodeFileType,
  type LibraryNodeMatchField,
  type LibraryNodeMatchRule,
  type LibraryNodeTemplate,
} from "../../libraryCatalog";
import { sourceFileExtensions } from "../../libraryCatalog/tag-inference";
import type {
  AddLibraryNodeDraft,
  Asset,
  AssetPlacementSuggestion,
  LibraryNodeRule,
  LibraryNodeRuleOperator,
  VirtualFolder,
} from "../../app/appTypes";
import { compareText } from "../../app/workspace/workspaceState";
import { findFolderNodePath, toSlug } from "./libraryTreeFolderState";
import { getCustomNodeCatalogTags as getCustomNodeCatalogTagsBase } from "./libraryTreeTagUtils";
import { findLibraryNodeTemplateByName, getTagTemplatePath, isTagTemplateAncestor } from "./libraryTreeTemplateUtils";

type PlacementDeps = {
  assetPlacementGenericTagTerms: Set<string>;
  assetPlacementNameNoiseTerms: Set<string>;
  createLibraryNodeDraft: (
    template: LibraryNodeTemplate,
    name: string,
    tags: string[],
    fileTypes: LibraryNodeFileType[],
  ) => AddLibraryNodeDraft;
  defaultLibraryRootTemplateId: string;
  getCustomNodeCatalogTags: (name: string) => string[];
  getInheritedSuggestionFileTypes: (template: LibraryNodeTemplate) => LibraryNodeFileType[];
  getLibraryNodeChildSuggestionTemplates: (parentTemplate: LibraryNodeTemplate) => LibraryNodeTemplate[];
  getLibraryNodeTemplateForSuggestionParent: (parentFolder: VirtualFolder | null, templates: LibraryNodeTemplate[]) => LibraryNodeTemplate;
  scopeLibraryNodeFileTypes: (parentFileTypes: LibraryNodeFileType[], childFileTypes: LibraryNodeFileType[]) => LibraryNodeFileType[];
  sortVirtualFoldersByName: (folders: VirtualFolder[]) => VirtualFolder[];
};

export function getAssetsForLibraryNode(folder: VirtualFolder, assets: Asset[]) {
  return assets.filter((asset) => libraryNodeIncludesAsset(folder, asset));
}

export function getChildAssetScopes(children: VirtualFolder[], scopedAssets: Asset[]) {
  const childAssetScopes = new Map<string, Asset[]>(children.map((child) => [child.id, []]));

  for (const asset of scopedAssets) {
    const bestChild = getBestLibraryNodeChildForAsset(children, asset);

    if (!bestChild) {
      continue;
    }

    childAssetScopes.get(bestChild.id)?.push(asset);
  }

  return childAssetScopes;
}

export function getBestLibraryNodeChildForAsset(children: VirtualFolder[], asset: Asset) {
  let bestChild: VirtualFolder | null = null;
  let bestScore = 0;

  for (const child of children) {
    if (!libraryNodeIncludesAsset(child, asset)) {
      continue;
    }

    const score = getLibraryNodeChildAssignmentScore(child, asset);

    if (score > bestScore || (score === bestScore && bestChild && compareText(child.name, bestChild.name) < 0)) {
      bestChild = child;
      bestScore = score;
    }
  }

  return bestChild;
}

export function getLibraryNodeChildAssignmentScore(folder: VirtualFolder, asset: Asset) {
  if (folder.assetIds.includes(asset.id)) {
    return 10000;
  }

  const scoredSuggestion = scoreAssetPlacementSuggestion(folder, asset, [folder]);
  return scoredSuggestion?.score ?? 0;
}

export function getDirectAssetsForLibraryNode(folder: VirtualFolder, assets: Asset[]) {
  if (folder.children.length === 0) {
    return getAssetsForLibraryNode(folder, assets);
  }

  const descendantAssetIds = getDescendantLibraryNodeAssetIds(folder, assets);

  return assets.filter((asset) => libraryNodeIncludesAsset(folder, asset) && !descendantAssetIds.has(asset.id));
}

export function getDirectAssetsForLibraryNodePath(
  folders: VirtualFolder[],
  folderId: string,
  assets: Asset[],
  deps: Pick<PlacementDeps, "sortVirtualFoldersByName">,
) {
  const path = findFolderNodePath(folders, folderId);

  if (!path) {
    return [];
  }

  const topLevelFolder = path[0];

  if (!topLevelFolder) {
    return [];
  }

  let scopedAssets = getChildAssetScopes(deps.sortVirtualFoldersByName(folders), assets).get(topLevelFolder.id) ?? [];

  for (const [index, folder] of path.entries()) {
    const folderAssets = index === 0 ? scopedAssets : getAssetsForLibraryNode(folder, scopedAssets);

    if (index === path.length - 1) {
      return getDirectAssetsForLibraryNode(folder, folderAssets);
    }

    const nextFolder = path[index + 1];
    scopedAssets = getChildAssetScopes(folder.children, folderAssets).get(nextFolder.id) ?? [];
  }

  return [];
}

export function getDescendantLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[]) {
  const ids = new Set<number>();

  for (const child of folder.children) {
    for (const assetId of getLibraryNodeAssetIds(child, assets, true)) {
      ids.add(assetId);
    }
  }

  return ids;
}

export function getAssetPlacementSuggestions(asset: Asset, folders: VirtualFolder[], assets: Asset[], deps: PlacementDeps) {
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const folder of folders) {
    suggestions.push(...collectAssetPlacementSuggestions(folder, asset, assets, [folder], deps));
  }

  if (suggestions.length === 0) {
    suggestions.push(...getRootPlacementSuggestions(asset, folders, deps));
  }

  return dedupeAssetPlacementSuggestions(suggestions)
    .sort((first, second) => second.score - first.score || second.path.length - first.path.length || compareText(first.path.join(" "), second.path.join(" ")))
    .slice(0, 8);
}

export function getNewAssetPlacementSuggestions(suggestions: AssetPlacementSuggestion[], limit = 3) {
  return suggestions.filter((suggestion) => suggestion.target === "new" && Boolean(suggestion.draft)).slice(0, limit);
}

export function getPreferredNewAssetPlacementSuggestion(suggestions: AssetPlacementSuggestion[]) {
  return getNewAssetPlacementSuggestions(suggestions, 1)[0] ?? null;
}

export function collectAssetPlacementSuggestions(
  folder: VirtualFolder,
  asset: Asset,
  assets: Asset[],
  path: VirtualFolder[],
  deps: PlacementDeps,
): AssetPlacementSuggestion[] {
  const folderAssets = getAssetsForLibraryNode(folder, assets);

  if (!folderAssets.some((candidate) => candidate.id === asset.id)) {
    return [];
  }

  const childAssetScopes = getChildAssetScopes(folder.children, folderAssets);
  const childFoldersWithAsset = folder.children.filter((child) => childAssetScopes.get(child.id)?.some((candidate) => candidate.id === asset.id));

  if (childFoldersWithAsset.length > 0) {
    return childFoldersWithAsset.flatMap((child) =>
      collectAssetPlacementSuggestions(child, asset, childAssetScopes.get(child.id) ?? folderAssets, [...path, child], deps),
    );
  }

  return [
    ...getExistingChildPlacementSuggestions(folder, asset, folderAssets, path),
    ...getNewChildPlacementSuggestions(folder, asset, path, deps),
  ];
}

export function getExistingChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, scopedAssets: Asset[], parentPath: VirtualFolder[]) {
  return parentFolder.children
    .filter((child) => !getAssetsForLibraryNode(child, scopedAssets).some((candidate) => candidate.id === asset.id) && libraryNodeFileRulesAllowAsset(child, asset))
    .map((child) => scoreAssetPlacementSuggestion(child, asset, [...parentPath, child]))
    .filter((suggestion): suggestion is AssetPlacementSuggestion => Boolean(suggestion && suggestion.score >= 24));
}

export function getNewChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, parentPath: VirtualFolder[], deps: PlacementDeps) {
  const parentTemplate = deps.getLibraryNodeTemplateForSuggestionParent(parentFolder, libraryNodeTemplates);
  const parentFileTypes = deps.getInheritedSuggestionFileTypes(parentTemplate);
  const existingChildNames = new Set(parentFolder.children.map((child) => normalizeLibraryMatchText(child.name)));
  const candidateTemplates = getPlacementSuggestionTemplates(parentTemplate, deps);
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const template of candidateTemplates) {
    const name = template.name;
    const normalizedName = normalizeLibraryMatchText(name);

    if (!normalizedName || existingChildNames.has(normalizedName)) {
      continue;
    }

    const fileTypes = deps.scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes);

    if (!libraryNodeFileTypeListAllowsAsset(fileTypes, asset)) {
      continue;
    }

    const draft = deps.createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name, deps), fileTypes);
    const scoredSuggestion = scoreDraftPlacementSuggestion(draft, template, asset, [...parentPath.map((folder) => folder.name), name]);

    if (scoredSuggestion && scoredSuggestion.score >= 30) {
      suggestions.push({
        ...scoredSuggestion,
        parentFolderId: parentFolder.id,
      });
    }
  }

  return suggestions;
}

export function getAssetPlacementNameTerms(asset: Asset, deps: Pick<PlacementDeps, "assetPlacementNameNoiseTerms">) {
  const normalizedExtension = normalizeLibraryMatchText(asset.extension);
  const terms: string[] = [];
  const seenTerms = new Set<string>();

  for (const part of normalizeLibraryMatchText(asset.name).split(" ")) {
    const term = canonicalizeLibraryTag(part);

    if (
      !term ||
      term === normalizedExtension ||
      term.length <= 2 ||
      /^\d+$/.test(term) ||
      deps.assetPlacementNameNoiseTerms.has(term) ||
      isIgnoredLibraryMatchTerm(term) ||
      seenTerms.has(term)
    ) {
      continue;
    }

    seenTerms.add(term);
    terms.push(term);

    if (terms.length >= 3) {
      break;
    }
  }

  return terms;
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

export function libraryNodeFileTypeListAllowsAsset(fileTypes: LibraryNodeFileType[], asset: Asset) {
  const normalizedFileTypes = normalizeLibraryNodeFileTypes(fileTypes);

  return normalizedFileTypes.includes("Any") || normalizedFileTypes.some((fileType) => fileType === asset.type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

export function dedupeAssetPlacementSuggestions(suggestions: AssetPlacementSuggestion[]) {
  const seenSuggestions = new Set<string>();
  const dedupedSuggestions: AssetPlacementSuggestion[] = [];

  for (const suggestion of suggestions) {
    const finalPathLabel = suggestion.path[suggestion.path.length - 1] ?? "";
    const key = suggestion.target === "existing" ? `existing:${suggestion.folderId}` : `new:${suggestion.parentFolderId}:${normalizeLibraryMatchText(finalPathLabel)}`;

    if (seenSuggestions.has(key)) {
      continue;
    }

    seenSuggestions.add(key);
    dedupedSuggestions.push(suggestion);
  }

  return dedupedSuggestions;
}

export function libraryNodeFileRulesAllowAsset(folder: VirtualFolder, asset: Asset) {
  if (folder.builtinView) {
    return libraryNodeRulesMatchAsset(folder, asset);
  }

  const fileRules = getLibraryNodeRules(folder).filter((rule) => rule.field === "type" || rule.field === "extension");

  if (fileRules.length > 0) {
    return fileRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));
  }

  return libraryNodeFileTypeMatches(getLibraryNodeTemplateForFolder(folder), asset);
}

export function scoreAssetPlacementSuggestion(folder: VirtualFolder, asset: Asset, path: VirtualFolder[]): AssetPlacementSuggestion | null {
  const scoredTerms = scoreAssetPlacementTerms(asset, getLibraryNodeSuggestionTerms(folder), path.length);

  if (!scoredTerms) {
    return null;
  }

  const pathLabels = path.map((folderNode) => folderNode.name);

  return {
    confidence: getAssetPlacementConfidence(scoredTerms.score),
    folderId: folder.id,
    matchedTerms: scoredTerms.matchedTerms,
    path: pathLabels,
    reason: `Suggested from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name, path, or tags.`,
    score: scoredTerms.score,
    target: "existing",
  };
}

export function scoreDraftPlacementSuggestion(
  draft: AddLibraryNodeDraft,
  template: LibraryNodeTemplate,
  asset: Asset,
  path: string[],
): AssetPlacementSuggestion | null {
  const scoredTerms = scoreAssetPlacementTerms(asset, getLibraryNodeDraftSuggestionTerms(draft, template), path.length);

  if (!scoredTerms) {
    return null;
  }

  return {
    confidence: getAssetPlacementConfidence(scoredTerms.score + 6),
    draft,
    matchedTerms: scoredTerms.matchedTerms,
    parentFolderId: null,
    path,
    reason: `Create this child from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name, path, or tags.`,
    score: scoredTerms.score + 6,
    target: "new",
  };
}

export function scoreAssetPlacementTerms(
  asset: Asset,
  terms: Array<[string, number]>,
  pathDepth: number,
  deps?: Pick<PlacementDeps, "assetPlacementGenericTagTerms">,
) {
  const assetNameText = normalizeLibraryMatchText(asset.name);
  const assetPathText = normalizeLibraryMatchText(asset.path);
  const assetTagText = normalizeLibraryMatchText(asset.tags.join(" "));
  const assetMetaText = normalizeLibraryMatchText([asset.extension, asset.type].join(" "));
  const matchedTerms: string[] = [];
  const evidenceKinds = new Set<"name" | "path" | "tag" | "meta">();
  let genericTagOnlyMatchCount = 0;
  let strongMatchCount = 0;
  let score = pathDepth * 4;

  for (const [term, weight] of terms) {
    const normalizedTerm = normalizeLibraryMatchText(term);
    const isGenericTag = deps?.assetPlacementGenericTagTerms.has(normalizedTerm) ?? false;
    const matchesName = normalizedTextIncludesTerm(assetNameText, normalizedTerm);
    const matchesPath = normalizedTextIncludesTerm(assetPathText, normalizedTerm);
    const matchesTag = normalizedTextIncludesTerm(assetTagText, normalizedTerm);
    const matchesMeta = normalizedTextIncludesTerm(assetMetaText, normalizedTerm);

    if (!matchesName && !matchesPath && !matchesTag && !matchesMeta) {
      continue;
    }

    let termScore = 0;

    if (matchesName) {
      evidenceKinds.add("name");
      strongMatchCount += 1;
      termScore += weight + 12;
    }

    if (matchesPath) {
      evidenceKinds.add("path");
      strongMatchCount += 1;
      termScore += matchesName ? Math.max(6, Math.floor(weight / 4)) : Math.max(12, weight - 6);
    }

    if (matchesTag) {
      evidenceKinds.add("tag");
      termScore += isGenericTag ? Math.max(4, weight - 20) : Math.max(10, weight - 8);
    }

    if (matchesMeta) {
      evidenceKinds.add("meta");
      termScore += Math.max(4, Math.floor(weight / 3));
    }

    if (matchesTag && !matchesName && !matchesPath && !matchesMeta && isGenericTag) {
      genericTagOnlyMatchCount += 1;
    }

    matchedTerms.push(term);
    score += termScore;
  }

  if (matchedTerms.length === 0) {
    return null;
  }

  if (genericTagOnlyMatchCount > 0) {
    score -= genericTagOnlyMatchCount * 14;
  }

  if (strongMatchCount > 0 && evidenceKinds.has("tag")) {
    score += 8;
  }

  if (evidenceKinds.has("name") && evidenceKinds.has("path")) {
    score += 6;
  }

  if (!evidenceKinds.has("name") && !evidenceKinds.has("path") && genericTagOnlyMatchCount === matchedTerms.length) {
    score -= 16;
  }

  return {
    matchedTerms: [...new Set(matchedTerms)].slice(0, 8),
    score,
  };
}

export function getAssetPlacementConfidence(score: number): AssetPlacementSuggestion["confidence"] {
  if (score >= 80) {
    return "high";
  }

  if (score >= 48) {
    return "medium";
  }

  return "low";
}

export function getLibraryNodeSuggestionTerms(folder: VirtualFolder) {
  const template = getLibraryNodeTemplateForFolder(folder);
  const weightedTerms = new Map<string, number>();
  const folderTags = template.id !== "custom" ? getEffectiveLibraryNodeTags(template, folder) : normalizeLibraryNodeTagValues([...(folder.tags ?? []), ...(folder.suggestedTags ?? [])]);

  function add(value: string, weight: number) {
    for (const term of getLibrarySuggestionTermParts(value)) {
      weightedTerms.set(term, Math.max(weightedTerms.get(term) ?? 0, weight));
    }
  }

  add(folder.name, 36);

  for (const tag of folderTags) {
    add(tag, 28);
  }

  for (const rule of getLibraryNodeRules(folder)) {
    if (rule.field === "type" || rule.field === "extension") {
      continue;
    }

    add(rule.value, rule.field === "name" || rule.field === "tag" ? 34 : 16);
  }

  if (template.id !== "custom") {
    add(template.name, 28);

    for (const alias of template.aliases) {
      add(alias, 22);
    }

    for (const tag of template.suggestedTags) {
      add(tag, 22);
    }

    for (const rule of template.matchRules) {
      if (rule.field === "type" || rule.field === "extension") {
        continue;
      }

      for (const term of rule.terms) {
        add(term, rule.field === "name" || rule.field === "tag" ? 34 : 16);
      }
    }
  }

  return [...weightedTerms.entries()].sort((first, second) => second[1] - first[1] || compareText(first[0], second[0]));
}

export function getLibraryNodeDraftSuggestionTerms(draft: AddLibraryNodeDraft, template: LibraryNodeTemplate) {
  const weightedTerms = new Map<string, number>();

  function add(value: string, weight: number) {
    for (const term of getLibrarySuggestionTermParts(value)) {
      weightedTerms.set(term, Math.max(weightedTerms.get(term) ?? 0, weight));
    }
  }

  add(draft.name, 36);

  for (const tag of draft.tags) {
    add(tag, 28);
  }

  for (const rule of draft.rules) {
    if (rule.field === "type" || rule.field === "extension") {
      continue;
    }

    add(rule.value, rule.field === "name" || rule.field === "tag" ? 34 : 16);
  }

  if (template.id !== "custom") {
    add(template.name, 28);

    for (const alias of template.aliases) {
      add(alias, 22);
    }

    for (const tag of template.suggestedTags) {
      add(tag, 22);
    }

    for (const rule of template.matchRules) {
      if (rule.field === "type" || rule.field === "extension") {
        continue;
      }

      for (const term of rule.terms) {
        add(term, rule.field === "name" || rule.field === "tag" ? 34 : 16);
      }
    }
  }

  return [...weightedTerms.entries()].sort((first, second) => second[1] - first[1] || compareText(first[0], second[0]));
}

export function getLibrarySuggestionTermParts(value: string) {
  const terms = new Set<string>();
  const normalized = canonicalizeLibraryTag(normalizeLibraryMatchText(value));

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return [];
  }

  terms.add(normalized);

  for (const part of normalized.split(" ")) {
    const canonicalPart = canonicalizeLibraryTag(part);

    if (canonicalPart.length > 2 && !isIgnoredLibraryMatchTerm(canonicalPart)) {
      terms.add(canonicalPart);
    }
  }

  return [...terms];
}

export function formatMatchedTerms(terms: string[]) {
  if (terms.length === 0) {
    return "matching clues";
  }

  if (terms.length === 1) {
    return terms[0];
  }

  return `${terms.slice(0, 3).join(", ")}${terms.length > 3 ? ", ..." : ""}`;
}

export function libraryNodeIncludesAsset(folder: VirtualFolder, asset: Asset) {
  const excludedAssetIds = folder.excludedAssetIds ?? [];
  return folder.assetIds.includes(asset.id) || (!excludedAssetIds.includes(asset.id) && libraryNodeRulesMatchAsset(folder, asset));
}

export function libraryNodeRulesMatchAsset(folder: VirtualFolder, asset: Asset) {
  const template = getLibraryNodeTemplateForFolder(folder);

  if (folder.builtinView) {
    return getBuiltinSectionMatcher(folder.builtinView)(asset);
  }

  if (template.id === "library" && (!folder.rules || folder.rules.length === 0)) {
    return true;
  }

  const rules = getLibraryNodeRules(folder);

  if (rules.length > 0) {
    const fileRules = rules.filter((rule) => rule.field === "type" || rule.field === "extension");
    const contentRules = rules.filter((rule) => rule.field !== "type" && rule.field !== "extension");
    const fileRulesMatch = fileRules.length === 0 || fileRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));
    const contentRulesMatch = contentRules.length === 0 || contentRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));

    return fileRulesMatch && contentRulesMatch;
  }

  if (!libraryNodeFileTypeMatches(template, asset)) {
    return false;
  }

  const assetSearchText = getNormalizedAssetSearchText(asset);
  return getLibraryNodeImpliedMatchTerms(template, folder).some((term) => normalizedTextIncludesTerm(assetSearchText, term));
}

function getBuiltinSectionMatcher(view: NonNullable<VirtualFolder["builtinView"]>) {
  switch (view) {
    case "library-images":
      return (asset: Asset) => asset.type === "Image" && asset.extension.toLowerCase() !== "svg";
    case "library-vector":
      return (asset: Asset) => {
        const extension = asset.extension.toLowerCase();
        return extension === "svg" || extension === "nvv";
      };
    case "library-audio":
      return (asset: Asset) => asset.type === "Audio";
    case "library-models":
      return (asset: Asset) => asset.type === "3D";
    case "library-documents":
      return (asset: Asset) => asset.type === "Document" && asset.extension.toLowerCase() !== "nvv";
    case "library-archives":
      return (asset: Asset) => asset.type === "Archive";
    default:
      return () => false;
  }
}

export function libraryNodeFileTypeMatches(template: LibraryNodeTemplate, asset: Asset) {
  if (template.fileTypes.includes("Any")) {
    return true;
  }

  return template.fileTypes.some((fileType) => fileType === asset.type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

export function libraryNodeRuleMatchesAsset(rule: LibraryNodeRule, asset: Asset) {
  const value = normalizeLibraryMatchText(rule.value);

  if (!value) {
    return false;
  }

  switch (rule.field) {
    case "extension":
      return compareLibraryRuleValue(asset.extension, rule.operator, value);
    case "type":
      return compareLibraryRuleValue(asset.type, rule.operator, value);
    case "tag":
      return asset.tags.some((tag) => compareLibraryRuleValue(tag, rule.operator, value));
    case "name":
      return compareLibraryRuleValue(asset.name, rule.operator, value);
    case "path":
      return compareLibraryRuleValue(asset.path, rule.operator, value);
    case "notes":
      return compareLibraryRuleValue(asset.notes, rule.operator, value);
  }
}

export function compareLibraryRuleValue(candidate: string, operator: LibraryNodeRuleOperator, normalizedValue: string) {
  const normalizedCandidate = normalizeLibraryMatchText(candidate);

  if (operator === "equals") {
    return normalizedCandidate === normalizedValue;
  }

  return normalizedTextIncludesTerm(normalizedCandidate, normalizedValue);
}

export function getLibraryNodeTemplateForFolder(folder: VirtualFolder) {
  return folder.templateId ? allLibraryNodeTemplates.find((template) => template.id === folder.templateId) ?? customLibraryNodeTemplate : customLibraryNodeTemplate;
}

export function getLibraryNodeRules(folder: VirtualFolder): LibraryNodeRule[] {
  const template = getLibraryNodeTemplateForFolder(folder);
  const tags = getEffectiveLibraryNodeTags(template, folder);

  if (folder.rules && folder.rules.length > 0) {
    const existingFileRules = folder.rules.filter((rule) => !isLibraryNodeContentRule(rule));
    const refreshedContentRules = createLibraryNodeRulesFromTemplate(template, folder.name, tags).filter(isLibraryNodeContentRule);

    return mergeLibraryNodeRules(existingFileRules, refreshedContentRules);
  }

  return createLibraryNodeRulesFromTemplate(template, folder.name, tags);
}

export function getEffectiveLibraryNodeTags(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "tags">, deps?: Pick<PlacementDeps, "getCustomNodeCatalogTags">) {
  return normalizeLibraryNodeTagValues([
    ...getLibraryNodeTagsFromTemplate(template, folder.name, deps),
    ...(folder.tags ?? []),
  ]).filter((tag) => !isStaleTemplateFolderTag(template, tag));
}

export function isStaleTemplateFolderTag(template: LibraryNodeTemplate, tag: string) {
  return template.id === "props" && (tag === "object" || tag === "item");
}

export function isLibraryNodeContentRule(rule: LibraryNodeRule) {
  return rule.field !== "type" && rule.field !== "extension";
}

export function mergeLibraryNodeRules(...ruleGroups: LibraryNodeRule[][]) {
  const rules: LibraryNodeRule[] = [];
  const seenRules = new Set<string>();

  for (const rule of ruleGroups.flat()) {
    const normalizedValue = normalizeLibraryMatchText(rule.value);

    if (!normalizedValue || isIgnoredLibraryMatchTerm(normalizedValue)) {
      continue;
    }

    const key = `${rule.field}:${rule.operator}:${normalizedValue}`;

    if (seenRules.has(key)) {
      continue;
    }

    seenRules.add(key);
    rules.push({ ...rule, value: normalizedValue });
  }

  return rules;
}

export function getLibraryNodeTagsFromTemplate(
  template: LibraryNodeTemplate,
  name: string,
  deps?: Pick<PlacementDeps, "getCustomNodeCatalogTags">,
) {
  const tags = new Set<string>();

  for (const tag of template.suggestedTags) {
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
  }

  if (template.id === "custom") {
    for (const term of normalizeLibraryMatchText(name).split(" ")) {
      addNormalizedLibraryMatchTerm(tags, term);
    }

    for (const tag of (deps?.getCustomNodeCatalogTags(name) ?? getCustomNodeCatalogTagsBase(name))) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
    }
  }

  return [...tags];
}

export function createLibraryNodeRulesFromTemplate(template: LibraryNodeTemplate, name: string, tags: string[], fileTypes = template.fileTypes) {
  const rules: LibraryNodeRule[] = [];
  const seenRules = new Set<string>();

  function addRule(field: LibraryNodeMatchField, operator: LibraryNodeRuleOperator, value: string) {
    const normalizedValue = normalizeLibraryMatchText(value);

    if (!normalizedValue || isIgnoredLibraryMatchTerm(normalizedValue)) {
      return;
    }

    const key = `${field}:${operator}:${normalizedValue}`;

    if (seenRules.has(key)) {
      return;
    }

    seenRules.add(key);
    rules.push({ field, operator, value: normalizedValue });
  }

  for (const fileType of normalizeLibraryNodeFileTypes(fileTypes)) {
    if (fileType === "Any") {
      continue;
    }

    if (fileType === "Source") {
      for (const extension of sourceFileExtensions) {
        addRule("extension", "equals", extension);
      }
    } else {
      addRule("type", "equals", fileType);
    }
  }

  for (const matchRule of template.matchRules) {
    for (const term of matchRule.terms) {
      addRule(matchRule.field, getLibraryNodeRuleOperator(matchRule), term);
    }
  }

  for (const tag of tags) {
    addRule("tag", "contains", tag);
    addRule("name", "contains", tag);
  }

  if (template.id === "custom") {
    addRule("path", "contains", name);

    for (const term of normalizeLibraryMatchText(name).split(" ")) {
      addRule("name", "contains", term);
      addRule("tag", "contains", term);
    }
  }

  return rules;
}

export function normalizeLibraryNodeFileTypes(fileTypes: LibraryNodeFileType[]) {
  const uniqueFileTypes = [...new Set(fileTypes)];

  if (uniqueFileTypes.length === 0 || uniqueFileTypes.includes("Any")) {
    return ["Any"] satisfies LibraryNodeFileType[];
  }

  return uniqueFileTypes;
}

export function getLibraryNodeRuleOperator(rule: LibraryNodeMatchRule): LibraryNodeRuleOperator {
  return rule.field === "extension" || rule.field === "type" ? "equals" : "contains";
}

export function getLibraryNodeImpliedMatchTerms(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "suggestedTags" | "tags">) {
  const terms = new Set<string>();
  const templateTerms =
    template.id === "custom"
      ? []
      : [
          template.name,
          ...template.aliases,
          ...template.suggestedTags,
          ...template.matchRules.flatMap((rule) => rule.terms),
        ];

  for (const value of [
    folder.name,
    ...(folder.tags ?? []),
    ...(folder.suggestedTags ?? []),
    ...templateTerms,
  ]) {
    addLibraryMatchTerm(terms, value);
  }

  return [...terms];
}

export function addLibraryMatchTerm(terms: Set<string>, value: string) {
  const normalized = normalizeLibraryMatchText(value);
  addNormalizedLibraryMatchTerm(terms, normalized);

  for (const part of normalized.split(" ")) {
    addNormalizedLibraryMatchTerm(terms, part);
  }
}

export function getNormalizedAssetSearchText(asset: Asset) {
  return normalizeLibraryMatchText([asset.name, asset.path, asset.extension, asset.type, ...asset.tags, asset.notes].join(" "));
}

export function getAssignedAssetIds(folders: VirtualFolder[], assets: Asset[]) {
  const ids = new Set<number>();

  for (const folder of folders) {
    for (const assetId of getLibraryNodeAssetIds(folder, assets, true)) {
      ids.add(assetId);
    }
  }

  return ids;
}

export function getLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[], includeChildren: boolean) {
  const ids = new Set<number>();

  for (const asset of assets) {
    if (libraryNodeIncludesAsset(folder, asset)) {
      ids.add(asset.id);
    }
  }

  if (includeChildren) {
    for (const child of folder.children) {
      for (const assetId of getLibraryNodeAssetIds(child, assets, true)) {
        ids.add(assetId);
      }
    }
  }

  return ids;
}

export function countFolderAssets(folder: VirtualFolder, assets: Asset[]): number {
  return getLibraryNodeAssetIds(folder, assets, true).size;
}

export function countManualFolderAssets(folder: VirtualFolder): number {
  return folder.assetIds.length + sumManualFolderAssets(folder.children);
}

export function sumManualFolderAssets(folders: VirtualFolder[]): number {
  return folders.reduce((total, folder) => total + countManualFolderAssets(folder), 0);
}

function getRootPlacementSuggestions(asset: Asset, folders: VirtualFolder[], deps: PlacementDeps) {
  const parentTemplate = deps.getLibraryNodeTemplateForSuggestionParent(null, libraryNodeTemplates);
  const parentFileTypes = deps.getInheritedSuggestionFileTypes(parentTemplate);
  const existingChildNames = new Set(folders.map((folder) => normalizeLibraryMatchText(folder.name)));
  const candidateTemplates = getPlacementSuggestionTemplates(parentTemplate, deps);
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const template of candidateTemplates) {
    const name = template.name;
    const normalizedName = normalizeLibraryMatchText(name);

    if (!normalizedName || existingChildNames.has(normalizedName)) {
      continue;
    }

    const fileTypes = deps.scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes);

    if (!libraryNodeFileTypeListAllowsAsset(fileTypes, asset)) {
      continue;
    }

    const draft = deps.createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name, deps), fileTypes);
    const scoredSuggestion = scoreDraftPlacementSuggestion(draft, template, asset, [name]);

    if (scoredSuggestion && scoredSuggestion.score >= 30) {
      suggestions.push(scoredSuggestion);
    }
  }

  return suggestions;
}

function getPlacementSuggestionTemplates(parentTemplate: LibraryNodeTemplate, deps: Pick<PlacementDeps, "getLibraryNodeChildSuggestionTemplates">) {
  const candidateTemplates = deps.getLibraryNodeChildSuggestionTemplates(parentTemplate);
  const parentTemplatePath = getTagTemplatePath(parentTemplate.id);

  if (parentTemplatePath.length === 0) {
    return candidateTemplates;
  }

  return candidateTemplates.filter((template) => {
    const templatePath = getTagTemplatePath(template.id);

    if (templatePath.length === 0 || templatePath[0] !== parentTemplatePath[0]) {
      return false;
    }

    if (isTagTemplateAncestor(templatePath, parentTemplatePath)) {
      return false;
    }

    return true;
  });
}
