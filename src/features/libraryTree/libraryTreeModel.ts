import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  customLibraryNodeTemplate,
  getDefaultLibraryNodeTagsForName,
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
import {
  automaticCatalogTagIgnoredTerms,
  sourceFileExtensions,
  toAsset,
} from "../../libraryCatalog/tag-inference";
import type {
  AddFolderSuggestion,
  AddLibraryNodeDraft,
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
import {
  createVirtualFolderId,
  findFolder,
  findFolderNodePath,
  findFolderPath,
  folderContainsId,
  getAddLibraryNodeParentOptions,
  getTreeNodePathForView,
  insertFolder,
  pruneStarterLibraryNodes,
  removeFolder,
  setFolderAssetAssignment,
  setFolderAssetExclusion,
  toSlug,
  updateFolder,
} from "./libraryTreeFolderState";
import * as templateUtils from "./libraryTreeTemplateUtils";
import * as tagUtils from "./libraryTreeTagUtils";
import * as placement from "./libraryTreePlacementUtils";
import * as suggestions from "./libraryTreeSuggestionUtils";
export {
  createVirtualFolderId,
  findFolder,
  findFolderNodePath,
  findFolderPath,
  folderContainsId,
  getAddLibraryNodeParentOptions,
  getTreeNodePathForView,
  insertFolder,
  pruneStarterLibraryNodes,
  removeFolder,
  setFolderAssetAssignment,
  setFolderAssetExclusion,
  toSlug,
  updateFolder,
} from "./libraryTreeFolderState";
export {
  findLibraryNodeTemplateById,
  findLibraryNodeTemplateByName,
  getLibraryNodeTemplateSearchText,
  groupLibraryNodeTemplates,
} from "./libraryTreeTemplateUtils";
export const initialVirtualFolders: VirtualFolder[] = [];
const defaultLibraryRootTemplateId = "library";
const autoStructureMaxDepth = 2;
const autoStructureRootLimit = 6;
const autoStructureChildLimit = 5;
const libraryTreeSuggestionDeps = {
  defaultLibraryRootTemplateId,
  getLibraryNodeTagsFromTemplate,
  getLibraryNodeTemplateForFolder,
  normalizeLibraryNodeFileTypes,
  toSlug,
};
function getLibraryTreePlacementDeps() {
  return {
    assetPlacementGenericTagTerms,
    assetPlacementNameNoiseTerms,
    createLibraryNodeDraft,
    defaultLibraryRootTemplateId,
    getCustomNodeCatalogTags: tagUtils.getCustomNodeCatalogTags,
    getInheritedSuggestionFileTypes,
    getLibraryNodeChildSuggestionTemplates,
    getLibraryNodeTemplateForSuggestionParent,
    scopeLibraryNodeFileTypes,
    sortVirtualFoldersByName,
  };
}

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
  "jfif",
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
const assetPlacementGenericTagTerms = new Set([
  "animal",
  "artifact",
  "audio",
  "building",
  "city",
  "clothing",
  "color",
  "country",
  "creature",
  "decor",
  "document",
  "environment",
  "farm",
  "food",
  "fruit",
  "furniture",
  "image",
  "ingredient",
  "item",
  "location",
  "material",
  "meal",
  "music",
  "nature",
  "object",
  "person",
  "plant",
  "place",
  "protein",
  "room",
  "seafood",
  "source",
  "style",
  "texture",
  "vehicle",
  "water",
  "weapon",
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
  const legacyRootWrapper = sortedFolders.length === 1 && isLegacyVisualRootWrapper(sortedFolders[0]) ? sortedFolders[0] : null;
  const topLevelAssetScopes = legacyRootWrapper ? null : getChildAssetScopes(sortedFolders, masterLibraryAssets);
  const assignedAssetIds = legacyRootWrapper
    ? new Set<number>()
    : new Set(
        [...(topLevelAssetScopes?.values() ?? [])]
          .flatMap((scopedAssets) => scopedAssets)
          .map((asset) => asset.id),
      );
  const rootAssetNodes = legacyRootWrapper
    ? []
    : sortAssets(
        masterLibraryAssets.filter((asset) => !assignedAssetIds.has(asset.id)),
        "name",
        "asc",
      ).map((asset) => assetToStructureNode(asset));
  const visibleLibraryChildren = legacyRootWrapper
    ? virtualFolderToNode(legacyRootWrapper, masterLibraryAssets, openNodeIds).children ?? []
    : [
        ...sortedFolders.map((folder) => virtualFolderToNode(folder, topLevelAssetScopes?.get(folder.id) ?? [], openNodeIds)),
        ...rootAssetNodes,
      ];
  const inventoryWriteNodes = inventoryWriteAssets.map((asset) => assetToStructureNode(asset));
  const inventoryDrawNodes = inventoryDrawAssets.map((asset) => assetToStructureNode(asset));
  const nodes: StructureNode[] = [
    {
      id: "library",
      label: "Master",
      icon: Backpack,
      canAddChild: true,
      view: "all",
      meta: String(masterLibraryAssets.length),
      open: openNodeIds.has("library"),
      children: visibleLibraryChildren,
    },
    {
      id: "inventory-files",
      label: "Create",
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

  const visibleSelectedFolderId = legacyRootWrapper && selectedFolderId === legacyRootWrapper.id ? null : selectedFolderId;

  return nodes.map((node) => markActive(node, activeView, visibleSelectedFolderId, selectedAssetId));
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
  const assetNodes = matchingAssets.map((asset) => assetToStructureNode(asset, folder.id));

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

function isLegacyVisualRootWrapper(folder: VirtualFolder) {
  return folder.templateId === defaultLibraryRootTemplateId;
}

export function assetToStructureNode(asset: Asset, parentFolderId: string | null = null): StructureNode {
  return {
    id: `asset-${asset.id}`,
    label: asset.name,
    assetId: asset.id,
    parentFolderId,
    icon: typeIcons[asset.type],
  };
}

export function createVirtualFolderFromTemplate(template: LibraryNodeTemplate, name: string): VirtualFolder {
  return createVirtualFolderFromDraft(createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name), template.fileTypes));
}

export function createDefaultTopLevelLibraryNodesForAssets(assets: ScannedAsset[]) {
  if (assets.length === 0) {
    return [];
  }
  return createAutomaticStarterLibraryNodes(assets.map((asset) => toAsset(asset)));
}

function createAutomaticStarterLibraryNodes(
  assets: Asset[],
  parentFolder: VirtualFolder | null = null,
  depth = 0,
): VirtualFolder[] {
  if (assets.length === 0 || depth >= autoStructureMaxDepth) {
    return [];
  }

  const candidateMap = new Map<
    string,
    {
      draft: AddLibraryNodeDraft;
      highConfidenceCount: number;
      maxScore: number;
      scoreTotal: number;
      supportingAssetIds: Set<number>;
    }
  >();

  for (const asset of assets) {
    const suggestion = getAutomaticStarterSuggestionForAsset(asset, parentFolder);

    if (!suggestion?.draft) {
      continue;
    }

    const key = `${parentFolder?.id ?? "root"}:${suggestion.draft.templateId ?? "custom"}:${normalizeLibraryMatchText(suggestion.draft.name)}`;
    const existingCandidate = candidateMap.get(key);

    if (existingCandidate) {
      existingCandidate.supportingAssetIds.add(asset.id);
      existingCandidate.scoreTotal += suggestion.score;
      existingCandidate.maxScore = Math.max(existingCandidate.maxScore, suggestion.score);
      if (suggestion.confidence === "high") {
        existingCandidate.highConfidenceCount += 1;
      }
      continue;
    }

    candidateMap.set(key, {
      draft: suggestion.draft,
      highConfidenceCount: suggestion.confidence === "high" ? 1 : 0,
      maxScore: suggestion.score,
      scoreTotal: suggestion.score,
      supportingAssetIds: new Set([asset.id]),
    });
  }

  const selectionLimit = depth === 0 ? autoStructureRootLimit : autoStructureChildLimit;
  const candidates = depth === 0 ? consolidateAutomaticRootCandidates([...candidateMap.values()]) : [...candidateMap.values()];

  return candidates
    .filter((candidate) => shouldCreateAutomaticStarterFolder(candidate, assets.length, depth))
    .sort(
      (first, second) =>
        second.supportingAssetIds.size - first.supportingAssetIds.size ||
        second.highConfidenceCount - first.highConfidenceCount ||
        second.scoreTotal - first.scoreTotal ||
        compareText(first.draft.name, second.draft.name),
    )
    .slice(0, selectionLimit)
    .map((candidate) => {
      const folder = createVirtualFolderFromDraft(candidate.draft);
      const supportingAssets = assets.filter((asset) => candidate.supportingAssetIds.has(asset.id));
      const children = createAutomaticStarterLibraryNodes(supportingAssets, folder, depth + 1);

      return children.length > 0 ? { ...folder, children } : folder;
    });
}

function consolidateAutomaticRootCandidates(
  candidates: Array<{
    draft: AddLibraryNodeDraft;
    highConfidenceCount: number;
    maxScore: number;
    scoreTotal: number;
    supportingAssetIds: Set<number>;
  }>,
) {
  const consolidatedCandidates = [...candidates];
  const descendantCandidateKeysByRootId = new Map<string, Set<string>>();
  const familyCandidates = new Map<
    string,
    {
      highConfidenceCount: number;
      maxScore: number;
      scoreTotal: number;
      supportingAssetIds: Set<number>;
      template: LibraryNodeTemplate;
    }
  >();

  for (const candidate of candidates) {
    if (!candidate.draft.templateId) {
      continue;
    }

    const templatePath = templateUtils.getTagTemplatePath(candidate.draft.templateId);

    if (templatePath.length <= 1) {
      continue;
    }

    const topLevelTemplateId = `tag:${templatePath[0]}`;
    const topLevelTemplate = templateUtils.findLibraryNodeTemplateById(libraryNodeTemplates, topLevelTemplateId);

    if (!topLevelTemplate) {
      continue;
    }

    const descendantCandidateKeys = descendantCandidateKeysByRootId.get(topLevelTemplateId) ?? new Set<string>();
    descendantCandidateKeys.add(`${candidate.draft.templateId}:${normalizeLibraryMatchText(candidate.draft.name)}`);
    descendantCandidateKeysByRootId.set(topLevelTemplateId, descendantCandidateKeys);

    const existingFamilyCandidate = familyCandidates.get(topLevelTemplateId);

    if (existingFamilyCandidate) {
      candidate.supportingAssetIds.forEach((assetId) => existingFamilyCandidate.supportingAssetIds.add(assetId));
      existingFamilyCandidate.highConfidenceCount += candidate.highConfidenceCount;
      existingFamilyCandidate.maxScore = Math.max(existingFamilyCandidate.maxScore, candidate.maxScore);
      existingFamilyCandidate.scoreTotal += candidate.scoreTotal;
      continue;
    }

    familyCandidates.set(topLevelTemplateId, {
      highConfidenceCount: candidate.highConfidenceCount,
      maxScore: candidate.maxScore,
      scoreTotal: candidate.scoreTotal,
      supportingAssetIds: new Set(candidate.supportingAssetIds),
      template: topLevelTemplate,
    });
  }

  const suppressedDescendantKeys = new Set<string>();

  for (const [topLevelTemplateId, familyCandidate] of familyCandidates) {
    const descendantCandidateKeys = descendantCandidateKeysByRootId.get(topLevelTemplateId);

    if (!descendantCandidateKeys || descendantCandidateKeys.size < 2 || familyCandidate.supportingAssetIds.size < 2) {
      continue;
    }

    descendantCandidateKeys.forEach((key) => suppressedDescendantKeys.add(key));
    consolidatedCandidates.push({
      draft: createLibraryNodeDraft(
        familyCandidate.template,
        familyCandidate.template.name,
        getLibraryNodeTagsFromTemplate(familyCandidate.template, familyCandidate.template.name),
        familyCandidate.template.fileTypes,
      ),
      highConfidenceCount: familyCandidate.highConfidenceCount,
      maxScore: familyCandidate.maxScore,
      scoreTotal: familyCandidate.scoreTotal + 18,
      supportingAssetIds: familyCandidate.supportingAssetIds,
    });
  }

  return consolidatedCandidates.filter((candidate) => {
    if (!candidate.draft.templateId) {
      return true;
    }

    return !suppressedDescendantKeys.has(`${candidate.draft.templateId}:${normalizeLibraryMatchText(candidate.draft.name)}`);
  });
}

function getAutomaticStarterSuggestionForAsset(asset: Asset, parentFolder: VirtualFolder | null) {
  if (!parentFolder) {
    return getPreferredNewAssetPlacementSuggestion(getAssetPlacementSuggestions(asset, [], [asset]));
  }

  return getNewChildPlacementSuggestions(parentFolder, asset, [parentFolder])[0] ?? null;
}

function shouldCreateAutomaticStarterFolder(
  candidate: {
    highConfidenceCount: number;
    maxScore: number;
    supportingAssetIds: Set<number>;
  },
  assetCount: number,
  depth: number,
) {
  if (candidate.supportingAssetIds.size >= 2) {
    return true;
  }

  if (candidate.highConfidenceCount > 0) {
    return true;
  }

  if (assetCount <= 3) {
    return candidate.maxScore >= (depth === 0 ? 60 : 72);
  }

  return candidate.maxScore >= (depth === 0 ? 84 : 92);
}

export function createVirtualFolderFromDraft(draft: AddLibraryNodeDraft): VirtualFolder {
  return {
    id: createVirtualFolderId(draft.name),
    name: draft.name,
    assetIds: [],
    excludedAssetIds: [],
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
  return placement.getAssetsForLibraryNode(folder, assets);
}

export function getChildAssetScopes(children: VirtualFolder[], scopedAssets: Asset[]) {
  return placement.getChildAssetScopes(children, scopedAssets);
}

export function getBestLibraryNodeChildForAsset(children: VirtualFolder[], asset: Asset) {
  return placement.getBestLibraryNodeChildForAsset(children, asset);
}

export function getLibraryNodeChildAssignmentScore(folder: VirtualFolder, asset: Asset) {
  return placement.getLibraryNodeChildAssignmentScore(folder, asset);
}

export function getDirectAssetsForLibraryNode(folder: VirtualFolder, assets: Asset[]) {
  return placement.getDirectAssetsForLibraryNode(folder, assets);
}

export function getDirectAssetsForLibraryNodePath(folders: VirtualFolder[], folderId: string, assets: Asset[]) {
  return placement.getDirectAssetsForLibraryNodePath(folders, folderId, assets, getLibraryTreePlacementDeps());
}

export function getDescendantLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[]) {
  return placement.getDescendantLibraryNodeAssetIds(folder, assets);
}

export function getAssetPlacementSuggestions(asset: Asset, folders: VirtualFolder[], assets: Asset[]) {
  return placement.getAssetPlacementSuggestions(asset, folders, assets, getLibraryTreePlacementDeps());
}

export function getNewAssetPlacementSuggestions(suggestions: AssetPlacementSuggestion[], limit = 3) {
  return placement.getNewAssetPlacementSuggestions(suggestions, limit);
}

export function getPreferredNewAssetPlacementSuggestion(suggestions: AssetPlacementSuggestion[]) {
  return placement.getPreferredNewAssetPlacementSuggestion(suggestions);
}

export function collectAssetPlacementSuggestions(
  folder: VirtualFolder,
  asset: Asset,
  assets: Asset[],
  path: VirtualFolder[],
): AssetPlacementSuggestion[] {
  return placement.collectAssetPlacementSuggestions(folder, asset, assets, path, getLibraryTreePlacementDeps());
}

export function getExistingChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, scopedAssets: Asset[], parentPath: VirtualFolder[]) {
  return placement.getExistingChildPlacementSuggestions(parentFolder, asset, scopedAssets, parentPath);
}

export function getNewChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, parentPath: VirtualFolder[]) {
  return placement.getNewChildPlacementSuggestions(parentFolder, asset, parentPath, getLibraryTreePlacementDeps());
}

export function getLibraryNodeChildSuggestionTemplates(parentTemplate: LibraryNodeTemplate) {
  return suggestions.getLibraryNodeChildSuggestionTemplates(parentTemplate, libraryNodeTemplates, libraryTreeSuggestionDeps);
}

export function getAssetPlacementNameTerms(asset: Asset) {
  return placement.getAssetPlacementNameTerms(asset, getLibraryTreePlacementDeps());
}

export function toTitleCase(value: string) {
  return placement.toTitleCase(value);
}

export function libraryNodeFileTypeListAllowsAsset(fileTypes: LibraryNodeFileType[], asset: Asset) {
  return placement.libraryNodeFileTypeListAllowsAsset(fileTypes, asset);
}

export function dedupeAssetPlacementSuggestions(suggestions: AssetPlacementSuggestion[]) {
  return placement.dedupeAssetPlacementSuggestions(suggestions);
}

export function libraryNodeFileRulesAllowAsset(folder: VirtualFolder, asset: Asset) {
  return placement.libraryNodeFileRulesAllowAsset(folder, asset);
}

export function scoreAssetPlacementSuggestion(folder: VirtualFolder, asset: Asset, path: VirtualFolder[]): AssetPlacementSuggestion | null {
  return placement.scoreAssetPlacementSuggestion(folder, asset, path);
}

export function scoreDraftPlacementSuggestion(
  draft: AddLibraryNodeDraft,
  template: LibraryNodeTemplate,
  asset: Asset,
  path: string[],
  parentFolderId: string | null,
): AssetPlacementSuggestion | null {
  const suggestion = placement.scoreDraftPlacementSuggestion(draft, template, asset, path);
  return suggestion ? { ...suggestion, parentFolderId } : null;
}

export function scoreAssetPlacementTerms(asset: Asset, terms: Array<[string, number]>, pathDepth: number) {
  return placement.scoreAssetPlacementTerms(asset, terms, pathDepth, getLibraryTreePlacementDeps());
}

export function getAssetPlacementConfidence(score: number): AssetPlacementSuggestion["confidence"] {
  return placement.getAssetPlacementConfidence(score);
}

export function getLibraryNodeSuggestionTerms(folder: VirtualFolder) {
  return placement.getLibraryNodeSuggestionTerms(folder);
}

export function getLibraryNodeDraftSuggestionTerms(draft: AddLibraryNodeDraft, template: LibraryNodeTemplate) {
  return placement.getLibraryNodeDraftSuggestionTerms(draft, template);
}

export function getLibrarySuggestionTermParts(value: string) {
  return placement.getLibrarySuggestionTermParts(value);
}

export function formatMatchedTerms(terms: string[]) {
  return placement.formatMatchedTerms(terms);
}

export function libraryNodeIncludesAsset(folder: VirtualFolder, asset: Asset) {
  return placement.libraryNodeIncludesAsset(folder, asset);
}

export function libraryNodeRulesMatchAsset(folder: VirtualFolder, asset: Asset) {
  return placement.libraryNodeRulesMatchAsset(folder, asset);
}

export function libraryNodeFileTypeMatches(template: LibraryNodeTemplate, asset: Asset) {
  return placement.libraryNodeFileTypeMatches(template, asset);
}

export function libraryNodeRuleMatchesAsset(rule: LibraryNodeRule, asset: Asset) {
  return placement.libraryNodeRuleMatchesAsset(rule, asset);
}

export function compareLibraryRuleValue(candidate: string, operator: LibraryNodeRuleOperator, normalizedValue: string) {
  return placement.compareLibraryRuleValue(candidate, operator, normalizedValue);
}

export function getLibraryNodeTemplateForFolder(folder: VirtualFolder) {
  return placement.getLibraryNodeTemplateForFolder(folder);
}

export function getLibraryNodeRules(folder: VirtualFolder): LibraryNodeRule[] {
  return placement.getLibraryNodeRules(folder);
}

export function getEffectiveLibraryNodeTags(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "tags">) {
  return placement.getEffectiveLibraryNodeTags(template, folder, getLibraryTreePlacementDeps());
}

export function isStaleTemplateFolderTag(template: LibraryNodeTemplate, tag: string) {
  return placement.isStaleTemplateFolderTag(template, tag);
}

export function isLibraryNodeContentRule(rule: LibraryNodeRule) {
  return placement.isLibraryNodeContentRule(rule);
}

export function mergeLibraryNodeRules(...ruleGroups: LibraryNodeRule[][]) {
  return placement.mergeLibraryNodeRules(...ruleGroups);
}

export function getLibraryNodeTagsFromTemplate(template: LibraryNodeTemplate, name: string) {
  return placement.getLibraryNodeTagsFromTemplate(template, name, getLibraryTreePlacementDeps());
}

export function createLibraryNodeRulesFromTemplate(template: LibraryNodeTemplate, name: string, tags: string[], fileTypes = template.fileTypes) {
  return placement.createLibraryNodeRulesFromTemplate(template, name, tags, fileTypes);
}

export function normalizeLibraryNodeFileTypes(fileTypes: LibraryNodeFileType[]) {
  return placement.normalizeLibraryNodeFileTypes(fileTypes);
}

export function getAssetTagSuggestions(asset: Asset | null, assets: Asset[], folders: VirtualFolder[]) {
  return tagUtils.getAssetTagSuggestions(asset, assets, folders, libraryNodeIncludesAsset);
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
  return placement.getLibraryNodeRuleOperator(rule);
}

export function getLibraryNodeImpliedMatchTerms(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "suggestedTags" | "tags">) {
  return placement.getLibraryNodeImpliedMatchTerms(template, folder);
}

export function addLibraryMatchTerm(terms: Set<string>, value: string) {
  placement.addLibraryMatchTerm(terms, value);
}

export function getNormalizedAssetSearchText(asset: Asset) {
  return placement.getNormalizedAssetSearchText(asset);
}

export function getAssignedAssetIds(folders: VirtualFolder[], assets: Asset[]) {
  return placement.getAssignedAssetIds(folders, assets);
}

export function getLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[], includeChildren: boolean) {
  return placement.getLibraryNodeAssetIds(folder, assets, includeChildren);
}

export function countFolderAssets(folder: VirtualFolder, assets: Asset[]): number {
  return placement.countFolderAssets(folder, assets);
}

export function countManualFolderAssets(folder: VirtualFolder): number {
  return placement.countManualFolderAssets(folder);
}

export function sumManualFolderAssets(folders: VirtualFolder[]): number {
  return placement.sumManualFolderAssets(folders);
}

export function getAddFolderSuggestions(
  templates: LibraryNodeTemplate[],
  parentFolder: VirtualFolder | null,
  query: string,
  folders: VirtualFolder[] = [],
): AddFolderSuggestion[] {
  return suggestions.getAddFolderSuggestions(templates, parentFolder, query, folders, libraryTreeSuggestionDeps);
}

export function createSuggestionFromTemplate(
  template: LibraryNodeTemplate,
  source: AddFolderSuggestion["source"],
  parentFileTypes: LibraryNodeFileType[],
): AddFolderSuggestion {
  return suggestions.createSuggestionFromTemplate(template, source, parentFileTypes, libraryTreeSuggestionDeps);
}

export function createCustomChildSuggestion(
  name: string,
  parentLabel: string,
  parentFileTypes: LibraryNodeFileType[],
  icon: LucideIcon,
): AddFolderSuggestion {
  return suggestions.createCustomChildSuggestion(name, parentLabel, parentFileTypes, icon, libraryTreeSuggestionDeps);
}

export function rankTemplateForParentSuggestion(template: LibraryNodeTemplate, parentTemplate: LibraryNodeTemplate, search: string) {
  return suggestions.rankTemplateForParentSuggestion(template, parentTemplate, search, libraryTreeSuggestionDeps);
}

export function getAddFolderSuggestionSearchText(suggestion: AddFolderSuggestion) {
  return suggestions.getAddFolderSuggestionSearchText(suggestion);
}

export function getLibraryNodeTemplateForSuggestionParent(parentFolder: VirtualFolder | null, templates: LibraryNodeTemplate[]) {
  return suggestions.getLibraryNodeTemplateForSuggestionParent(parentFolder, templates, libraryTreeSuggestionDeps);
}

export function getInheritedSuggestionFileTypes(template: LibraryNodeTemplate) {
  return suggestions.getInheritedSuggestionFileTypes(template, libraryTreeSuggestionDeps);
}

export function scopeLibraryNodeFileTypes(parentFileTypes: LibraryNodeFileType[], childFileTypes: LibraryNodeFileType[]) {
  return suggestions.scopeLibraryNodeFileTypes(parentFileTypes, childFileTypes, libraryTreeSuggestionDeps);
}

export function libraryNodeFileTypesOverlap(first: LibraryNodeFileType[], second: LibraryNodeFileType[]) {
  return suggestions.libraryNodeFileTypesOverlap(first, second, libraryTreeSuggestionDeps);
}

