import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  isIgnoredLibraryMatchTerm,
  libraryTagDefinitions,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  type LibraryTagDefinition,
} from "../../libraryCatalog";
import type { Asset, AssetType, VirtualFolder } from "../../app/appTypes";

const libraryTagSuggestionTermsById = new Map(
  libraryTagDefinitions.map((tagDefinition) => [tagDefinition.id, getLibraryTagSuggestionTerms(tagDefinition)] as const),
);
const libraryTagDefinitionsByKey = createLibraryTagDefinitionLookup(libraryTagDefinitions);
const libraryTagDefinitionsByMatch = createLibraryTagDefinitionsByMatchLookup(libraryTagDefinitions);

export function getCustomNodeCatalogTags(name: string) {
  const tagDefinition = getLibraryTagDefinitionByKey(name);

  if (!tagDefinition) {
    return [];
  }

  const tags = new Set<string>();
  const pending = [tagDefinition];
  const visitedTagIds = new Set<string>();

  while (pending.length > 0) {
    const currentTagDefinition = pending.pop();

    if (!currentTagDefinition || visitedTagIds.has(currentTagDefinition.id)) {
      continue;
    }

    visitedTagIds.add(currentTagDefinition.id);
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(currentTagDefinition.id));

    for (const relatedTagId of currentTagDefinition.matches ?? []) {
      const relatedTagDefinition = getLibraryTagDefinitionByKey(relatedTagId);

      if (relatedTagDefinition) {
        pending.push(relatedTagDefinition);
      } else {
        addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(relatedTagId));
      }
    }

    for (const relatedTagDefinition of libraryTagDefinitionsByMatch.get(getLibraryTagKey(currentTagDefinition.id)) ?? []) {
      pending.push(relatedTagDefinition);
    }
  }

  return [...tags];
}

export function getAssetTagSuggestions(
  asset: Asset | null,
  assets: Asset[],
  folders: VirtualFolder[],
  libraryNodeIncludesAsset: (folder: VirtualFolder, asset: Asset) => boolean,
) {
  if (!asset) {
    return [];
  }

  const existingTagIds = new Set(normalizeLibraryNodeTagValues(asset.tags));
  const currentTagIds = new Set(normalizeLibraryNodeTagValues([...asset.systemTags, ...asset.keptTags, ...asset.userTags]));
  const folderContextTagIds = getAssetFolderContextTagIds(asset, folders, libraryNodeIncludesAsset);
  const siblingTagCounts = getAssetSiblingTagCounts(asset, assets);
  const cooccurringTagCounts = getAssetCooccurringTagCounts(asset, assets, currentTagIds);
  const nameText = normalizeLibraryMatchText(asset.name);
  const searchText = normalizeLibraryMatchText([asset.name, asset.extension, asset.type].join(" "));

  return libraryTagDefinitions
    .filter((tagDefinition) => tagDefinitionSupportsAssetType(tagDefinition, asset.type))
    .map((tagDefinition) => ({
      score: scoreAssetTagSuggestion(tagDefinition, {
        cooccurringTagCounts,
        currentTagIds,
        existingTagIds,
        folderContextTagIds,
        nameText,
        searchText,
        siblingTagCounts,
      }),
      tagId: tagDefinition.id,
    }))
    .filter(({ score, tagId }) => score > 0 && !existingTagIds.has(normalizeLibraryMatchText(tagId)))
    .sort((first, second) => second.score - first.score || first.tagId.localeCompare(second.tagId))
    .slice(0, 16)
    .map(({ tagId }) => tagId);
}

function scoreAssetTagSuggestion(
  tagDefinition: LibraryTagDefinition,
  context: {
    cooccurringTagCounts: Map<string, number>;
    currentTagIds: Set<string>;
    existingTagIds: Set<string>;
    folderContextTagIds: Set<string>;
    nameText: string;
    searchText: string;
    siblingTagCounts: Map<string, number>;
  },
) {
  const tagId = normalizeLibraryMatchText(tagDefinition.id);

  if (!tagId || context.existingTagIds.has(tagId)) {
    return 0;
  }

  const termScore = getAssetTagSuggestionTermScore(tagDefinition, context.nameText, context.searchText);
  const folderScore = context.folderContextTagIds.has(tagId) ? 28 : 0;
  const siblingScore = Math.min(42, (context.siblingTagCounts.get(tagId) ?? 0) * 14);
  const cooccurrenceScore = Math.min(24, (context.cooccurringTagCounts.get(tagId) ?? 0) * 6);
  const directEvidenceScore = termScore + folderScore;
  const contextualEvidenceScore = siblingScore + cooccurrenceScore;

  let relationScore = 0;
  relationScore += countNormalizedTagOverlap(tagDefinition.parents, context.currentTagIds) * 22;
  relationScore += countNormalizedTagOverlap(tagDefinition.implies, context.currentTagIds) * 18;
  relationScore += countNormalizedTagOverlap(tagDefinition.related, context.currentTagIds) * 10;
  relationScore += countNormalizedTagOverlap(tagDefinition.parents, context.folderContextTagIds) * 10;
  relationScore += countNormalizedTagOverlap(tagDefinition.implies, context.folderContextTagIds) * 8;
  const evidenceScore = directEvidenceScore + contextualEvidenceScore;

  if (directEvidenceScore === 0 && relationScore === 0) {
    return 0;
  }

  if (evidenceScore === 0 && relationScore === 0) {
    return 0;
  }

  let penalty = 0;

  if (tagDefinition.kind === "system") {
    penalty += 20;
  } else if (tagDefinition.kind === "workflow") {
    penalty += 8;
  }

  return Math.max(0, evidenceScore + relationScore - penalty);
}

function getAssetTagSuggestionTermScore(tagDefinition: LibraryTagDefinition, nameText: string, searchText: string) {
  let bestScore = 0;

  for (const term of libraryTagSuggestionTermsById.get(tagDefinition.id) ?? []) {
    if (!term) {
      continue;
    }

    if (nameText === term) {
      bestScore = Math.max(bestScore, 140);
      continue;
    }

    if (normalizedTextIncludesTerm(nameText, term)) {
      bestScore = Math.max(bestScore, term.includes(" ") ? 116 : 94);
      continue;
    }

    if (normalizedTextIncludesTerm(searchText, term)) {
      bestScore = Math.max(bestScore, term.includes(" ") ? 68 : 52);
    }
  }

  return bestScore;
}

function getLibraryTagSuggestionTerms(tagDefinition: LibraryTagDefinition) {
  const terms = new Set<string>();

  for (const value of [tagDefinition.id, tagDefinition.label, ...(tagDefinition.aliases ?? [])]) {
    const normalized = normalizeLibraryMatchText(value);

    if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
      continue;
    }

    addNormalizedLibraryMatchTerm(terms, normalized);

    if (!normalized.includes(" ")) {
      for (const term of normalized.split(" ")) {
        if (!term || term.length < 4 || isIgnoredLibraryMatchTerm(term)) {
          continue;
        }

        addNormalizedLibraryMatchTerm(terms, term);
      }
    }
  }

  return [...terms];
}

function getLibraryTagDefinitionByKey(value: string) {
  return libraryTagDefinitionsByKey.get(getLibraryTagKey(value)) ?? null;
}

function createLibraryTagDefinitionLookup(tagDefinitions: LibraryTagDefinition[]) {
  const lookup = new Map<string, LibraryTagDefinition>();

  function addLookupValue(value: string, tagDefinition: LibraryTagDefinition) {
    const key = getLibraryTagKey(value);

    if (key && !lookup.has(key)) {
      lookup.set(key, tagDefinition);
    }
  }

  for (const tagDefinition of tagDefinitions) {
    addLookupValue(tagDefinition.id, tagDefinition);
    addLookupValue(tagDefinition.label, tagDefinition);

    for (const alias of tagDefinition.aliases ?? []) {
      addLookupValue(alias, tagDefinition);
    }
  }

  return lookup;
}

function createLibraryTagDefinitionsByMatchLookup(tagDefinitions: LibraryTagDefinition[]) {
  const lookup = new Map<string, LibraryTagDefinition[]>();

  for (const tagDefinition of tagDefinitions) {
    for (const match of tagDefinition.matches ?? []) {
      const key = getLibraryTagKey(match);

      if (!key) {
        continue;
      }

      const matchingDefinitions = lookup.get(key);

      if (matchingDefinitions) {
        matchingDefinitions.push(tagDefinition);
      } else {
        lookup.set(key, [tagDefinition]);
      }
    }
  }

  return lookup;
}

function getLibraryTagKey(value: string) {
  return canonicalizeLibraryTag(normalizeLibraryMatchText(value));
}

function tagDefinitionSupportsAssetType(tagDefinition: LibraryTagDefinition, assetType: AssetType) {
  return !tagDefinition.locksToFileTypes || tagDefinition.locksToFileTypes.includes(assetType);
}

function countNormalizedTagOverlap(values: string[] | undefined, normalizedTags: Set<string>) {
  if (!values || values.length === 0 || normalizedTags.size === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + (normalizedTags.has(normalizeLibraryMatchText(value)) ? 1 : 0), 0);
}

function getAssetFolderContextTagIds(
  asset: Asset,
  folders: VirtualFolder[],
  libraryNodeIncludesAsset: (folder: VirtualFolder, asset: Asset) => boolean,
) {
  const tags = new Set<string>();

  collectAssetFolderContextTagIds(asset, folders, tags, libraryNodeIncludesAsset);
  return tags;
}

function collectAssetFolderContextTagIds(
  asset: Asset,
  folders: VirtualFolder[],
  tags: Set<string>,
  libraryNodeIncludesAsset: (folder: VirtualFolder, asset: Asset) => boolean,
) {
  let matchedAnyFolder = false;

  for (const folder of folders) {
    if (!libraryNodeIncludesAsset(folder, asset)) {
      continue;
    }

    matchedAnyFolder = true;
    const matchedChildFolder = collectAssetFolderContextTagIds(asset, folder.children, tags, libraryNodeIncludesAsset);

    if (!matchedChildFolder) {
      for (const value of [...(folder.tags ?? []), ...(folder.suggestedTags ?? [])]) {
        const normalized = normalizeLibraryMatchText(value);

        if (normalized) {
          tags.add(normalized);
        }
      }
    }
  }

  return matchedAnyFolder;
}

function getAssetSiblingTagCounts(asset: Asset, assets: Asset[]) {
  const siblingTagCounts = new Map<string, number>();
  const assetDirectoryPath = getAssetDirectoryPath(asset.path);

  for (const candidate of assets) {
    if (candidate.id === asset.id || getAssetDirectoryPath(candidate.path) !== assetDirectoryPath) {
      continue;
    }

    for (const tagId of new Set(normalizeLibraryNodeTagValues(candidate.tags))) {
      siblingTagCounts.set(tagId, (siblingTagCounts.get(tagId) ?? 0) + 1);
    }
  }

  return siblingTagCounts;
}

function getAssetCooccurringTagCounts(asset: Asset, assets: Asset[], currentTagIds: Set<string>) {
  const cooccurringTagCounts = new Map<string, number>();

  if (currentTagIds.size === 0) {
    return cooccurringTagCounts;
  }

  for (const candidate of assets) {
    if (candidate.id === asset.id) {
      continue;
    }

    const candidateTagIds = new Set(normalizeLibraryNodeTagValues(candidate.tags));

    if (![...currentTagIds].some((tagId) => candidateTagIds.has(tagId))) {
      continue;
    }

    for (const tagId of candidateTagIds) {
      if (!currentTagIds.has(tagId)) {
        cooccurringTagCounts.set(tagId, (cooccurringTagCounts.get(tagId) ?? 0) + 1);
      }
    }
  }

  return cooccurringTagCounts;
}

function getAssetDirectoryPath(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}
