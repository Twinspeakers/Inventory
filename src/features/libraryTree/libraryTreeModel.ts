import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  customLibraryNodeTemplate,
  getDefaultLibraryNodeTagsForName,
  isIgnoredLibraryMatchTerm,
  allLibraryNodeTemplates,
  libraryTagDefinitions,
  libraryNodeTemplates,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  type LibraryNodeFileType,
  type LibraryNodeMatchField,
  type LibraryNodeMatchRule,
  type LibraryNodeTemplate,
} from "../../libraryCatalog";
import {
  automaticCatalogTagIgnoredTerms,
  sourceFileExtensions,
} from "../../libraryCatalog/tagInference";
import type {
  AddFolderSuggestion,
  AddLibraryNodeDraft,
  AddLibraryNodeParentOption,
  Asset,
  AssetPlacementSuggestion,
  AssetType,
  LibraryNodeRule,
  LibraryNodeRuleOperator,
  ScannedAsset,
  SourceFolder,
  StructureNode,
  VirtualFolder,
} from "../../app/appTypes";
import { compareText, normalizePath } from "../../app/workspace/workspaceState";
import type { AssetSortKey, LibraryView, SortDirection } from "../assetShelf";
import { Archive, Backpack, Box, FileAudio, FileImage, FileText, Folder, FolderOpen, type LucideIcon } from "lucide-react";
export const initialVirtualFolders: VirtualFolder[] = [];
const starterLibraryNodeIds = new Set(["vf-tavern", "vf-tavern-props", "vf-tavern-lighting", "vf-fishing", "vf-icons"]);
const defaultTopLevelLibraryNodeTemplateIds: Record<AssetType, string> = {
  "3D": "3d-objects",
  Image: "images",
  Audio: "audio",
  Document: "documents",
  Archive: "archives",
};

const typeIcons: Record<AssetType, LucideIcon> = {
  Image: FileImage,
  "3D": Box,
  Audio: FileAudio,
  Document: FileText,
  Archive,
};

const assetPlacementNameNoiseTerms = new Set([
  ...automaticCatalogTagIgnoredTerms,
  "2d",
  "3d",
  "avif",
  "fbx",
  "flac",
  "glb",
  "gltf",
  "jpeg",
  "jpg",
  "mp3",
  "ogg",
  "obj",
  "pdf",
  "png",
  "stl",
  "svg",
  "texture",
  "wav",
  "webp",
]);

export function getAssetModelKey(asset: Asset) {
  return `${asset.id}:${asset.path}`;
}

export function getScannedAssetModelKey(asset: ScannedAsset) {
  return `${asset.id}:${asset.path}`;
}


export function buildStructure(
  activeView: LibraryView,
  assets: Asset[],
  virtualFolders: VirtualFolder[],
  selectedFolderId: string | null,
  selectedAssetId: number | null,
  openNodeIds: Set<string>,
  inventoryDocumentPaths: Set<string>,
): StructureNode[] {
  const inventoryDocumentAssets = sortAssets(
    assets.filter((asset) => inventoryDocumentPaths.has(normalizePath(asset.path))),
    "name",
    "asc",
  );
  const inventoryWriteAssets = inventoryDocumentAssets.filter((asset) => asset.extension.toLowerCase() === "nvd");
  const inventoryDrawAssets = inventoryDocumentAssets.filter((asset) => asset.extension.toLowerCase() === "nvv");
  const masterLibraryAssets = assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path)));
  const sortedFolders = sortVirtualFoldersByName(virtualFolders);
  const assignedAssetIds = getAssignedAssetIds(sortedFolders, masterLibraryAssets);
  const rootAssetNodes = sortAssets(
    masterLibraryAssets.filter((asset) => !assignedAssetIds.has(asset.id)),
    "name",
    "asc",
  ).map(assetToStructureNode);
  const inventoryWriteNodes = inventoryWriteAssets.map(assetToStructureNode);
  const inventoryDrawNodes = inventoryDrawAssets.map(assetToStructureNode);
  const nodes: StructureNode[] = [
    {
      id: "library",
      label: "Master Library",
      icon: Backpack,
      canAddChild: true,
      view: "all",
      meta: String(masterLibraryAssets.length),
      open: openNodeIds.has("library"),
      children: [
        ...sortedFolders.map((folder) => virtualFolderToNode(folder, masterLibraryAssets, openNodeIds)),
        ...rootAssetNodes,
      ],
    },
    {
      id: "inventory-files",
      label: "Inventory",
      icon: FolderOpen,
      view: "inventory-files",
      meta: String(inventoryDocumentAssets.length),
      open: openNodeIds.has("inventory-files"),
      children: [
        {
          id: "inventory-documents",
          label: "Write",
          icon: inventoryWriteNodes.length > 0 ? FolderOpen : Folder,
          view: "inventory-documents",
          meta: String(inventoryWriteNodes.length),
          open: openNodeIds.has("inventory-documents"),
          children: inventoryWriteNodes,
        },
        {
          id: "inventory-vectors",
          label: "Draw",
          icon: inventoryDrawNodes.length > 0 ? FolderOpen : Folder,
          view: "inventory-vectors",
          meta: String(inventoryDrawNodes.length),
          open: openNodeIds.has("inventory-vectors"),
          children: inventoryDrawNodes,
        },
      ],
    },
  ];

  return nodes.map((node) => markActive(node, activeView, selectedFolderId, selectedAssetId));
}

export function markActive(node: StructureNode, activeView: LibraryView, selectedFolderId: string | null, selectedAssetId: number | null): StructureNode {
  const children = node.children?.map((child) => markActive(child, activeView, selectedFolderId, selectedAssetId));
  const active = typeof node.assetId === "number" ? node.assetId === selectedAssetId : node.folderId ? node.folderId === selectedFolderId : !selectedFolderId && node.view === activeView;

  return {
    ...node,
    active,
    children,
    descendantActive: children?.some((child) => child.active || child.descendantActive),
  };
}

export function filterAssets(
  activeView: LibraryView,
  assets: Asset[],
  selectedFolderId: string | null,
  virtualFolders: VirtualFolder[],
  inventoryDocumentPaths: Set<string>,
) {
  const inventoryFileAssets = assets.filter((asset) => inventoryDocumentPaths.has(normalizePath(asset.path)));
  const masterLibraryAssets = assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path)));

  if (selectedFolderId) {
    return getDirectAssetsForLibraryNodePath(virtualFolders, selectedFolderId, masterLibraryAssets);
  }

  switch (activeView) {
    case "inventory-files":
      return inventoryFileAssets;
    case "inventory-documents":
      return inventoryFileAssets.filter((asset) => asset.extension.toLowerCase() === "nvd");
    case "inventory-vectors":
      return inventoryFileAssets.filter((asset) => asset.extension.toLowerCase() === "nvv");
    case "inbox": {
      const assignedIds = getAssignedAssetIds(virtualFolders, masterLibraryAssets);
      return masterLibraryAssets.filter((asset) => !assignedIds.has(asset.id));
    }
    case "all":
    default:
      return masterLibraryAssets;
  }
}

export function filterAssetsByEnabledSources(assets: Asset[], sourceFolders: SourceFolder[], inventoryDocumentPaths: Set<string>) {
  if (sourceFolders.length === 0) {
    return assets;
  }

  const enabledAssetIds = new Set(sourceFolders.filter((folder) => folder.enabled).flatMap((folder) => folder.assetIds));
  return assets.filter((asset) => enabledAssetIds.has(asset.id) || inventoryDocumentPaths.has(normalizePath(asset.path)));
}

export function filterAssetsBySearchQuery(assets: Asset[], query: string) {
  const normalizedQuery = normalizeLibraryMatchText(query);

  if (!normalizedQuery) {
    return assets;
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);

  return assets.filter((asset) => {
    const searchText = getNormalizedAssetSearchText(asset);
    return terms.every((term) => normalizedTextIncludesTerm(searchText, term));
  });
}

export function sortAssets(assets: Asset[], sortKey: AssetSortKey, direction: SortDirection) {
  const sortedAssets = [...assets].sort((first, second) => {
    let result = 0;

    switch (sortKey) {
      case "type":
        result = compareText(`${first.type} ${first.extension} ${first.name}`, `${second.type} ${second.extension} ${second.name}`);
        break;
      case "modified":
        if (first.modifiedUnix === null && second.modifiedUnix !== null) {
          return 1;
        }
        if (first.modifiedUnix !== null && second.modifiedUnix === null) {
          return -1;
        }
        result = compareNullableNumbers(first.modifiedUnix, second.modifiedUnix);
        break;
      case "size":
        result = first.sizeBytes - second.sizeBytes;
        break;
      case "name":
      default:
        result = compareText(first.name, second.name);
        break;
    }

    if (result === 0) {
      result = compareText(first.name, second.name);
    }

    return direction === "asc" ? result : -result;
  });

  return sortedAssets;
}

export function mergeScannedAssets(existingAssets: ScannedAsset[], newAssets: ScannedAsset[]) {
  const assetsByPath = new Map<string, ScannedAsset>();

  for (const asset of existingAssets) {
    assetsByPath.set(normalizePath(asset.path), asset);
  }

  for (const asset of newAssets) {
    const pathKey = normalizePath(asset.path);
    const existingAsset = assetsByPath.get(pathKey);

    assetsByPath.set(pathKey, {
      ...asset,
      name: existingAsset?.name ?? asset.name,
      kept_tags: existingAsset?.kept_tags ?? asset.kept_tags ?? [],
      notes: existingAsset?.notes ?? asset.notes ?? "",
      tags: existingAsset?.tags ?? asset.tags ?? [],
    });
  }

  return [...assetsByPath.values()];
}

export function getSourceSummary(sourceFolders: SourceFolder[]) {
  if (sourceFolders.length === 0) {
    return null;
  }

  const enabledFolders = sourceFolders.filter((folder) => folder.enabled);

  if (enabledFolders.length === 0) {
    return "All source folders closed";
  }

  if (enabledFolders.length === 1) {
    return enabledFolders[0].path;
  }

  return `${enabledFolders.length} source folders loaded`;
}

export function getSourceFolderId(path: string) {
  return `source-${normalizePath(path).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}`;
}

export function compareNullableNumbers(first: number | null, second: number | null) {
  if (first === null && second === null) {
    return 0;
  }

  if (first === null) {
    return 1;
  }

  if (second === null) {
    return -1;
  }

  return first - second;
}

export function virtualFolderToNode(folder: VirtualFolder, assets: Asset[], openNodeIds: Set<string>): StructureNode {
  const scopedAssets = getAssetsForLibraryNode(folder, assets);
  const matchingAssets = sortAssets(getDirectAssetsForLibraryNode(folder, assets), "name", "asc");
  const sortedChildren = sortVirtualFoldersByName(folder.children);
  const childAssetScopes = getChildAssetScopes(sortedChildren, scopedAssets);
  const childFolderNodes = sortedChildren.map((child) => virtualFolderToNode(child, childAssetScopes.get(child.id) ?? [], openNodeIds));
  const assetNodes = matchingAssets.map(assetToStructureNode);

  return {
    id: folder.id,
    label: folder.name,
    icon: childFolderNodes.length > 0 || assetNodes.length > 0 ? FolderOpen : Folder,
    canAddChild: true,
    folderId: folder.id,
    meta: String(countFolderAssets(folder, assets)),
    open: openNodeIds.has(folder.id),
    children: [...childFolderNodes, ...assetNodes],
  };
}

export function sortVirtualFoldersByName(folders: VirtualFolder[]) {
  return [...folders].sort((first, second) => compareText(first.name, second.name));
}

export function assetToStructureNode(asset: Asset): StructureNode {
  return {
    id: `asset-${asset.id}`,
    label: asset.name,
    assetId: asset.id,
    icon: typeIcons[asset.type],
  };
}

export function createVirtualFolderFromTemplate(template: LibraryNodeTemplate, name: string): VirtualFolder {
  return createVirtualFolderFromDraft(createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name), template.fileTypes));
}

export function createDefaultTopLevelLibraryNodesForAssets(assets: ScannedAsset[]) {
  const assetTypes = new Set(assets.map((asset) => asset.file_type));

  return (Object.entries(defaultTopLevelLibraryNodeTemplateIds) as Array<[AssetType, string]>)
    .filter(([assetType]) => assetTypes.has(assetType))
    .map(([, templateId]) => libraryNodeTemplates.find((template) => template.id === templateId))
    .filter((template): template is LibraryNodeTemplate => Boolean(template))
    .map((template) => createVirtualFolderFromTemplate(template, template.name));
}

export function createVirtualFolderFromDraft(draft: AddLibraryNodeDraft): VirtualFolder {
  return {
    id: createVirtualFolderId(draft.name),
    name: draft.name,
    assetIds: [],
    children: [],
    diskPath: null,
    isPlannedOnDisk: false,
    pathSegment: toSlug(draft.name) || "node",
    rules: draft.rules,
    suggestedTags: [...draft.tags],
    tags: [...draft.tags],
    templateId: draft.templateId,
  };
}

export function createLibraryNodeDraft(
  template: LibraryNodeTemplate,
  name: string,
  tags: string[],
  fileTypes: LibraryNodeFileType[],
): AddLibraryNodeDraft {
  const normalizedFileTypes = normalizeLibraryNodeFileTypes(fileTypes);
  const normalizedTags = normalizeLibraryNodeTagValues(tags);

  return {
    fileTypes: normalizedFileTypes,
    name,
    rules: createLibraryNodeRulesFromTemplate(template, name, normalizedTags, normalizedFileTypes),
    tags: normalizedTags,
    templateId: template.id === "custom" ? null : template.id,
  };
}

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

export function getDirectAssetsForLibraryNodePath(folders: VirtualFolder[], folderId: string, assets: Asset[]) {
  const path = findFolderNodePath(folders, folderId);

  if (!path) {
    return [];
  }

  let scopedAssets = assets;

  for (const [index, folder] of path.entries()) {
    const folderAssets = getAssetsForLibraryNode(folder, scopedAssets);

    if (index === path.length - 1) {
      return getDirectAssetsForLibraryNode(folder, scopedAssets);
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

export function getAssetPlacementSuggestions(asset: Asset, folders: VirtualFolder[], assets: Asset[]) {
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const folder of folders) {
    const folderAssets = getAssetsForLibraryNode(folder, assets);

    if (!folderAssets.some((candidate) => candidate.id === asset.id)) {
      continue;
    }

    const childAssetScopes = getChildAssetScopes(folder.children, folderAssets);
    const childFoldersWithAsset = folder.children.filter((child) => childAssetScopes.get(child.id)?.some((candidate) => candidate.id === asset.id));

    if (childFoldersWithAsset.length > 0) {
      continue;
    }

    suggestions.push(...getExistingChildPlacementSuggestions(folder, asset, folderAssets, [folder]));
    suggestions.push(...getNewChildPlacementSuggestions(folder, asset, [folder]));
  }

  return dedupeAssetPlacementSuggestions(suggestions)
    .sort((first, second) => second.score - first.score || second.path.length - first.path.length || compareText(first.path.join(" "), second.path.join(" ")))
    .slice(0, 8);
}

export function getExistingChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, scopedAssets: Asset[], parentPath: VirtualFolder[]) {
  return parentFolder.children
    .filter((child) => !getAssetsForLibraryNode(child, scopedAssets).some((candidate) => candidate.id === asset.id) && libraryNodeFileRulesAllowAsset(child, asset))
    .map((child) => scoreAssetPlacementSuggestion(child, asset, [...parentPath, child]))
    .filter((suggestion): suggestion is AssetPlacementSuggestion => Boolean(suggestion && suggestion.score >= 24));
}

export function getNewChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, parentPath: VirtualFolder[]) {
  const parentTemplate = getLibraryNodeTemplateForSuggestionParent(parentFolder, libraryNodeTemplates);
  const parentFileTypes = getInheritedSuggestionFileTypes(parentTemplate);
  const existingChildNames = new Set(parentFolder.children.map((child) => normalizeLibraryMatchText(child.name)));
  const candidateTemplates = getLibraryNodeChildSuggestionTemplates(parentTemplate);
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const template of candidateTemplates) {
    const name = template.name;
    const normalizedName = normalizeLibraryMatchText(name);

    if (!normalizedName || existingChildNames.has(normalizedName)) {
      continue;
    }

    const fileTypes = scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes);

    if (!libraryNodeFileTypeListAllowsAsset(fileTypes, asset)) {
      continue;
    }

    const draft = createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name), fileTypes);
    const scoredSuggestion = scoreDraftPlacementSuggestion(draft, template, asset, [...parentPath.map((folder) => folder.name), name], parentFolder.id);

    if (scoredSuggestion && scoredSuggestion.score >= 30) {
      suggestions.push(scoredSuggestion);
    }
  }

  if (suggestions.length === 0) {
    const fallbackSuggestion = getFallbackNewChildPlacementSuggestion(parentFolder, parentFileTypes, existingChildNames, asset, parentPath);

    if (fallbackSuggestion) {
      suggestions.push(fallbackSuggestion);
    }
  }

  return suggestions;
}

export function getFallbackNewChildPlacementSuggestion(
  parentFolder: VirtualFolder,
  parentFileTypes: LibraryNodeFileType[],
  existingChildNames: Set<string>,
  asset: Asset,
  parentPath: VirtualFolder[],
) {
  const nameTerms = getAssetPlacementNameTerms(asset);

  if (nameTerms.length === 0) {
    return null;
  }

  const name = nameTerms.map(toTitleCase).join(" ");
  const normalizedName = normalizeLibraryMatchText(name);

  if (!normalizedName || existingChildNames.has(normalizedName)) {
    return null;
  }

  const draft = createLibraryNodeDraft(customLibraryNodeTemplate, name, nameTerms, parentFileTypes);
  return scoreDraftPlacementSuggestion(draft, customLibraryNodeTemplate, asset, [...parentPath.map((folder) => folder.name), name], parentFolder.id);
}

export function getLibraryNodeChildSuggestionTemplates(parentTemplate: LibraryNodeTemplate) {
  const templates: LibraryNodeTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  function addTemplate(template: LibraryNodeTemplate | undefined) {
    if (!template || template.id === "all-assets" || template.id === parentTemplate.id || seenTemplateIds.has(template.id)) {
      return;
    }

    seenTemplateIds.add(template.id);
    templates.push(template);
  }

  for (const childTemplateId of parentTemplate.childSuggestionIds) {
    addTemplate(findLibraryNodeTemplateById(libraryNodeTemplates, childTemplateId));
  }

  for (const childName of parentTemplate.childSuggestions) {
    addTemplate(findLibraryNodeTemplateByName(libraryNodeTemplates, childName));
  }

  for (const template of libraryNodeTemplates) {
    if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes)) {
      addTemplate(template);
    }
  }

  return templates;
}

export function getAssetPlacementNameTerms(asset: Asset) {
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
      assetPlacementNameNoiseTerms.has(term) ||
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
    folderId: folder.id,
    matchedTerms: scoredTerms.matchedTerms,
    path: pathLabels,
    reason: `Suggested from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name or tags.`,
    score: scoredTerms.score,
    target: "existing",
  };
}

export function scoreDraftPlacementSuggestion(
  draft: AddLibraryNodeDraft,
  template: LibraryNodeTemplate,
  asset: Asset,
  path: string[],
  parentFolderId: string | null,
): AssetPlacementSuggestion | null {
  const scoredTerms = scoreAssetPlacementTerms(asset, getLibraryNodeDraftSuggestionTerms(draft, template), path.length);

  if (!scoredTerms) {
    return null;
  }

  return {
    draft,
    matchedTerms: scoredTerms.matchedTerms,
    parentFolderId,
    path,
    reason: `Create this child from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name or tags.`,
    score: scoredTerms.score + 6,
    target: "new",
  };
}

export function scoreAssetPlacementTerms(asset: Asset, terms: Array<[string, number]>, pathDepth: number) {
  const assetText = normalizeLibraryMatchText([
    asset.name,
    asset.extension,
    asset.type,
    ...asset.tags,
  ].join(" "));
  const matchedTerms: string[] = [];
  let score = pathDepth * 4;

  for (const [term, weight] of terms) {
    if (normalizedTextIncludesTerm(assetText, term)) {
      matchedTerms.push(term);
      score += weight;
    }
  }

  if (matchedTerms.length === 0) {
    return null;
  }

  return {
    matchedTerms: [...new Set(matchedTerms)].slice(0, 8),
    score,
  };
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
  return folder.assetIds.includes(asset.id) || libraryNodeRulesMatchAsset(folder, asset);
}

export function libraryNodeRulesMatchAsset(folder: VirtualFolder, asset: Asset) {
  const rules = getLibraryNodeRules(folder);

  if (rules.length > 0) {
    const fileRules = rules.filter((rule) => rule.field === "type" || rule.field === "extension");
    const contentRules = rules.filter((rule) => rule.field !== "type" && rule.field !== "extension");
    const fileRulesMatch = fileRules.length === 0 || fileRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));
    const contentRulesMatch = contentRules.length === 0 || contentRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));

    return fileRulesMatch && contentRulesMatch;
  }

  const template = getLibraryNodeTemplateForFolder(folder);

  if (!libraryNodeFileTypeMatches(template, asset)) {
    return false;
  }

  const assetSearchText = getNormalizedAssetSearchText(asset);
  return getLibraryNodeImpliedMatchTerms(template, folder).some((term) => normalizedTextIncludesTerm(assetSearchText, term));
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
    if (folder.templateId && template.id !== "custom") {
      const existingFileRules = folder.rules.filter((rule) => !isLibraryNodeContentRule(rule));
      const refreshedContentRules = createLibraryNodeRulesFromTemplate(template, folder.name, tags).filter(isLibraryNodeContentRule);

      return mergeLibraryNodeRules(existingFileRules, refreshedContentRules);
    }

    return mergeLibraryNodeRules(folder.rules);
  }

  return createLibraryNodeRulesFromTemplate(template, folder.name, tags);
}

export function getEffectiveLibraryNodeTags(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "tags">) {
  return normalizeLibraryNodeTagValues([
    ...getLibraryNodeTagsFromTemplate(template, folder.name),
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

export function getLibraryNodeTagsFromTemplate(template: LibraryNodeTemplate, name: string) {
  const tags = new Set<string>();

  for (const tag of template.suggestedTags) {
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
  }

  if (template.id === "custom") {
    for (const term of normalizeLibraryMatchText(name).split(" ")) {
      addNormalizedLibraryMatchTerm(tags, term);
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

export function getAssetTagSuggestions(assets: Asset[], folders: VirtualFolder[]) {
  const tags = new Set<string>();

  for (const tagDefinition of libraryTagDefinitions) {
    for (const value of [
      tagDefinition.id,
      tagDefinition.label,
      ...(tagDefinition.aliases ?? []),
      ...(tagDefinition.parents ?? []),
      ...(tagDefinition.implies ?? []),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }
  }

  for (const template of libraryNodeTemplates) {
    for (const value of [
      template.name,
      ...template.aliases,
      ...template.suggestedTags,
      ...template.childSuggestions,
      ...template.matchRules.flatMap((rule) => rule.terms),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }
  }

  for (const asset of assets) {
    for (const tag of asset.userTags) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
    }
  }

  collectFolderTagSuggestions(folders, tags);

  return [...tags].sort(compareText);
}

export function collectFolderTagSuggestions(folders: VirtualFolder[], tags: Set<string>) {
  for (const folder of folders) {
    for (const value of [
      folder.name,
      ...(folder.tags ?? []),
      ...(folder.suggestedTags ?? []),
      ...(folder.rules ?? []).map((rule) => rule.value),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }

    collectFolderTagSuggestions(folder.children, tags);
  }
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

export function createVirtualFolderId(name: string) {
  const slug = toSlug(name) || "node";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `vf-${Date.now()}-${slug}-${suffix}`;
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findFolder(folders: VirtualFolder[], folderId: string): VirtualFolder | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }

    const child = findFolder(folder.children, folderId);

    if (child) {
      return child;
    }
  }

  return null;
}

export function folderContainsId(folder: VirtualFolder, folderId: string): boolean {
  if (folder.id === folderId) {
    return true;
  }

  return folder.children.some((child) => folderContainsId(child, folderId));
}

export function findFolderPath(folders: VirtualFolder[], folderId: string): string[] | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder.id];
    }

    const childPath = findFolderPath(folder.children, folderId);

    if (childPath) {
      return [folder.id, ...childPath];
    }
  }

  return null;
}

export function findFolderNodePath(folders: VirtualFolder[], folderId: string): VirtualFolder[] | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder];
    }

    const childPath = findFolderNodePath(folder.children, folderId);

    if (childPath) {
      return [folder, ...childPath];
    }
  }

  return null;
}

export function updateFolder(folders: VirtualFolder[], folderId: string, update: (folder: VirtualFolder) => VirtualFolder): VirtualFolder[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return update(folder);
    }

    return {
      ...folder,
      children: updateFolder(folder.children, folderId, update),
    };
  });
}

export function getTreeNodePathForView(view: LibraryView) {
  switch (view) {
    case "inventory-files":
      return ["inventory-files"];
    case "inventory-documents":
      return ["inventory-files", "inventory-documents"];
    case "inventory-vectors":
      return ["inventory-files", "inventory-vectors"];
    case "all":
      return ["library"];
    case "inbox":
    default:
      return ["library"];
  }
}

export function removeFolder(folders: VirtualFolder[], folderId: string): VirtualFolder[] {
  return folders
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      children: removeFolder(folder.children, folderId),
    }));
}

export function pruneStarterLibraryNodes(folders: VirtualFolder[]): VirtualFolder[] {
  return folders
    .filter((folder) => !starterLibraryNodeIds.has(folder.id))
    .map((folder) => ({
      ...folder,
      children: pruneStarterLibraryNodes(folder.children),
    }));
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

export function getAddLibraryNodeParentOptions(folders: VirtualFolder[]): AddLibraryNodeParentOption[] {
  const options: AddLibraryNodeParentOption[] = [{ id: null, label: "Master Library" }];

  function addFolderOptions(currentFolders: VirtualFolder[], parentLabels: string[]) {
    for (const folder of currentFolders) {
      const pathLabels = [...parentLabels, folder.name];

      options.push({
        id: folder.id,
        label: pathLabels.join(" / "),
      });
      addFolderOptions(folder.children, pathLabels);
    }
  }

  addFolderOptions(folders, ["Master Library"]);
  return options;
}

export function getAddFolderSuggestions(
  templates: LibraryNodeTemplate[],
  parentFolder: VirtualFolder | null,
  query: string,
  folders: VirtualFolder[] = [],
): AddFolderSuggestion[] {
  const search = normalizeLibraryMatchText(query);
  const parentTemplate = getLibraryNodeTemplateForSuggestionParent(parentFolder, templates);
  const parentLabel = parentFolder?.name ?? "Master Library";
  const parentFileTypes = getInheritedSuggestionFileTypes(parentTemplate);
  const suggestions: AddFolderSuggestion[] = [];
  const seenNames = new Set<string>();
  const currentParentChildren = getSuggestionParentChildren(parentFolder, folders);
  const existingChildNames = new Set(currentParentChildren.map((child) => normalizeLibraryMatchText(child.name)).filter(Boolean));
  const existingChildTemplateIds = new Set(
    currentParentChildren
      .map((child) => getLibraryNodeTemplateForFolder(child).id)
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

    addSuggestion(createSuggestionFromTemplate(childTemplate, "parent", parentFileTypes));
  }

  for (const childName of parentTemplate.childSuggestions) {
    const childTemplate = findLibraryNodeTemplateByName(templates, childName);

    addSuggestion(
      childTemplate
        ? createSuggestionFromTemplate(childTemplate, "parent", parentFileTypes)
        : createCustomChildSuggestion(childName, parentLabel, parentFileTypes, parentTemplate.icon),
    );
  }

  const rankedTemplates = templates
    .filter((template) => template.id !== parentTemplate.id && template.id !== "all-assets")
    .map((template) => ({
      rank: rankTemplateForSuggestionContext(template, parentTemplate, parentFolder, search, folders),
      template,
    }))
    .filter(({ rank }) => rank < 500)
    .sort((first, second) => first.rank - second.rank || compareText(first.template.name, second.template.name));

  for (const { template } of rankedTemplates) {
    addSuggestion(createSuggestionFromTemplate(template, "catalog", parentFileTypes));

    if (!search && suggestions.length >= 14) {
      break;
    }
  }

  return suggestions.slice(0, search ? 24 : 14);
}

function rankTemplateForSuggestionContext(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  parentFolder: VirtualFolder | null,
  search: string,
  folders: VirtualFolder[],
) {
  const baseRank = rankTemplateForParentSuggestion(template, parentTemplate, search);

  if (baseRank >= 600) {
    return baseRank;
  }

  return baseRank + getStructureAwareSuggestionAdjustment(template, parentTemplate, parentFolder, search, folders);
}

export function createSuggestionFromTemplate(
  template: LibraryNodeTemplate,
  source: AddFolderSuggestion["source"],
  parentFileTypes: LibraryNodeFileType[],
): AddFolderSuggestion {
  return {
    category: template.category,
    description: template.description,
    fileTypes: scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes),
    icon: template.icon,
    id: `${source}:${template.id}`,
    name: template.name,
    source,
    tags: getLibraryNodeTagsFromTemplate(template, template.name),
    template,
  };
}

export function createCustomChildSuggestion(
  name: string,
  parentLabel: string,
  parentFileTypes: LibraryNodeFileType[],
  icon: LucideIcon,
): AddFolderSuggestion {
  return {
    category: `${parentLabel} Child`,
    description: `Suggested child folder under ${parentLabel}.`,
    fileTypes: parentFileTypes,
    icon,
    id: `parent:${toSlug(name) || normalizeLibraryMatchText(name)}`,
    name,
    source: "parent",
    tags: getDefaultLibraryNodeTagsForName(name),
    template: null,
  };
}

export function rankTemplateForParentSuggestion(template: LibraryNodeTemplate, parentTemplate: LibraryNodeTemplate, search: string) {
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

  const taxonomyRank = getTagTemplateSuggestionRank(template, parentTemplate);

  if (taxonomyRank < 600) {
    return taxonomyRank + getTemplateSearchAdjustment(template, templateText, search);
  }

  if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes)) {
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

function getStructureAwareSuggestionAdjustment(
  template: LibraryNodeTemplate,
  parentTemplate: LibraryNodeTemplate,
  parentFolder: VirtualFolder | null,
  search: string,
  folders: VirtualFolder[],
) {
  let adjustment = 0;
  const templatePath = getTagTemplatePath(template.id);

  if (!search && !parentFolder && folders.length === 0 && templatePath.length > 1) {
    adjustment += 90 + templatePath.length * 8;
  }

  const existingTemplateIds = collectExistingFolderTemplateIds(folders);

  if (existingTemplateIds.has(template.id)) {
    adjustment += parentFolder ? 24 : 40;
  }

  if (!parentFolder) {
    adjustment += getRootSuggestionAdjustment(template, parentTemplate, search, folders);
  }

  if (parentFolder) {
    const childTemplatePaths = parentFolder.children
      .map((child) => getTagTemplatePath(getLibraryNodeTemplateForFolder(child).id))
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
) {
  if (search || parentTemplate.id !== "all-assets") {
    return 0;
  }

  let adjustment = 0;
  const rootTemplateIds = new Set(
    folders
      .map((folder) => getLibraryNodeTemplateForFolder(folder).id)
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
      adjustment += 14;
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

function collectExistingFolderTemplateIds(folders: VirtualFolder[]) {
  const templateIds = new Set<string>();

  function visit(currentFolders: VirtualFolder[]) {
    for (const folder of currentFolders) {
      const templateId = getLibraryNodeTemplateForFolder(folder).id;

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

function getTagTemplatePath(templateId: string) {
  if (!templateId.startsWith("tag:")) {
    return [] as string[];
  }

  return templateId
    .slice(4)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isDirectTagTemplateChild(templatePath: string[], parentPath: string[]) {
  return templatePath.length === parentPath.length + 1 && hasTagTemplatePathPrefix(templatePath, parentPath);
}

function isTagTemplateDescendant(templatePath: string[], parentPath: string[]) {
  return templatePath.length > parentPath.length && hasTagTemplatePathPrefix(templatePath, parentPath);
}

function hasTagTemplatePathPrefix(candidatePath: string[], prefixPath: string[]) {
  return prefixPath.every((segment, index) => candidatePath[index] === segment);
}

function getSharedTagTemplatePrefixLength(firstPath: string[], secondPath: string[]) {
  let prefixLength = 0;

  while (prefixLength < firstPath.length && prefixLength < secondPath.length && firstPath[prefixLength] === secondPath[prefixLength]) {
    prefixLength += 1;
  }

  return prefixLength;
}

function getTemplateSearchAdjustment(template: LibraryNodeTemplate, templateText: string, search: string) {
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

export function getLibraryNodeTemplateForSuggestionParent(parentFolder: VirtualFolder | null, templates: LibraryNodeTemplate[]) {
  if (!parentFolder) {
    return templates.find((template) => template.id === "all-assets") ?? customLibraryNodeTemplate;
  }

  const template = getLibraryNodeTemplateForFolder(parentFolder);

  if (template.id !== "custom") {
    return template;
  }

  return findLibraryNodeTemplateByName(templates, parentFolder.name) ?? template;
}

export function findLibraryNodeTemplateByName(templates: LibraryNodeTemplate[], name: string) {
  const normalizedName = normalizeLibraryMatchText(name);
  return templates.find((template) => normalizeLibraryMatchText(template.name) === normalizedName);
}

export function findLibraryNodeTemplateById(templates: LibraryNodeTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId);
}

export function getInheritedSuggestionFileTypes(template: LibraryNodeTemplate) {
  const fileTypes = normalizeLibraryNodeFileTypes(template.fileTypes);
  return fileTypes.includes("Any") ? (["Any"] satisfies LibraryNodeFileType[]) : fileTypes;
}

export function scopeLibraryNodeFileTypes(parentFileTypes: LibraryNodeFileType[], childFileTypes: LibraryNodeFileType[]) {
  const normalizedParentFileTypes = normalizeLibraryNodeFileTypes(parentFileTypes);
  const normalizedChildFileTypes = normalizeLibraryNodeFileTypes(childFileTypes);

  if (normalizedParentFileTypes.includes("Any")) {
    return normalizedChildFileTypes;
  }

  if (normalizedChildFileTypes.includes("Any")) {
    return normalizedParentFileTypes;
  }

  const scopedFileTypes = normalizedChildFileTypes.filter((fileType) => normalizedParentFileTypes.includes(fileType));
  return scopedFileTypes.length > 0 ? scopedFileTypes : normalizedParentFileTypes;
}

export function libraryNodeFileTypesOverlap(first: LibraryNodeFileType[], second: LibraryNodeFileType[]) {
  const normalizedFirst = normalizeLibraryNodeFileTypes(first);
  const normalizedSecond = normalizeLibraryNodeFileTypes(second);

  return normalizedFirst.includes("Any") || normalizedSecond.includes("Any") || normalizedFirst.some((fileType) => normalizedSecond.includes(fileType));
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

