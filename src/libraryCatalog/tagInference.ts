import type { Asset, AssetType, ScannedAsset } from "../app/appTypes";
import type { ModelInspectorResult } from "../sceneReaders/threeModelReader";
import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  isIgnoredLibraryMatchTerm,
  libraryNodeIgnoredMatchTerms,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
} from "./normalization";
import { libraryTagDefinitions } from "./tags";
import type { LibraryTagDefinition } from "./types";

export const sourceFileExtensions = new Set([
  "ai",
  "blend",
  "eps",
  "gd",
  "godot",
  "js",
  "json",
  "mat",
  "prefab",
  "psb",
  "psd",
  "py",
  "rs",
  "shader",
  "tres",
  "ts",
  "tscn",
  "tsx",
  "unity",
  "unitypackage",
]);

export const TAG_INFERENCE_VERSION = 13;

export const automaticCatalogTagIgnoredTerms = new Set([
  ...libraryNodeIgnoredMatchTerms,
  "archive",
  "audio",
  "cities",
  "city",
  "document",
  "editable",
  "godot",
  "image",
  "mesh",
  "meshes",
  "model",
  "models",
  "package",
  "source",
  "sources",
  "visual",
]);

const fileTypeAutomaticTags: Record<AssetType, string[]> = {
  Archive: ["archive"],
  Audio: ["audio"],
  Document: ["document"],
  Image: ["image"],
  "3D": ["3d"],
};

const extensionAutomaticTags: Record<string, string[]> = {
  ai: ["illustrator", "vector"],
  blend: ["blender"],
  csv: ["data"],
  dds: ["texture"],
  eps: ["vector"],
  exr: ["hdr"],
  gd: ["godot", "code"],
  gif: ["animated"],
  hdr: ["hdr"],
  ico: ["icon"],
  js: ["code"],
  json: ["data"],
  license: ["license", "legal"],
  mat: ["unity", "material"],
  md: ["markdown", "note"],
  pdf: ["pdf"],
  prefab: ["unity"],
  psb: ["photoshop"],
  psd: ["photoshop"],
  py: ["code"],
  rs: ["code", "rust"],
  shader: ["shader", "code"],
  svg: ["svg", "vector"],
  tga: ["texture"],
  tres: ["godot"],
  ts: ["code", "typescript"],
  tscn: ["godot"],
  tsx: ["code", "typescript"],
  txt: ["text", "note"],
  unity: ["unity"],
  unitypackage: ["unity", "package"],
  usd: ["scene"],
  usdz: ["scene"],
  xml: ["data"],
  yaml: ["data"],
  yml: ["data"],
};

const typeColors: Record<AssetType, string> = {
  Image: "bg-surface-raised",
  "3D": "bg-surface-raised",
  Audio: "bg-copper",
  Document: "bg-violet",
  Archive: "bg-amber",
};

const MAX_AUTOMATIC_REGISTRY_TAGS = 24;
const audioSoundEffectTerms = [
  "sfx",
  "fx",
  "effect",
  "sound effect",
  "sound effects",
  "soundeffect",
  "soundeffects",
  "sound fx",
  "soundfx",
  "one shot",
  "one-shot",
  "oneshot",
  "foley",
  "ui",
  "button",
  "click",
  "tap",
  "pop",
  "beep",
  "confirm",
  "select",
  "hit",
  "impact",
  "step",
  "footstep",
  "whoosh",
  "pickup",
  "drop",
  "open",
  "close",
  "door",
  "chest",
  "coin",
  "jump",
  "land",
  "chop",
  "chopping",
  "axe",
  "swing",
  "slash",
  "punch",
  "explosion",
  "explode",
  "attack",
  "cast",
  "collect",
  "damage",
  "death",
  "equip",
  "error",
  "fail",
  "fireball",
  "gun",
  "hover",
  "hurt",
  "item",
  "laser",
  "lose",
  "magic",
  "menu",
  "reload",
  "shoot",
  "shot",
  "spawn",
  "spell",
  "success",
  "unequip",
  "weapon",
  "win",
];

const audioImpactTerms = [
  "impact",
  "anvil",
  "axe",
  "chop",
  "chopping",
  "chopped",
  "hit",
  "strike",
  "thud",
  "bang",
  "boom",
  "bump",
  "crack",
  "crash",
  "smash",
  "snap",
  "slam",
  "collide",
  "collision",
  "knock",
  "clank",
  "clang",
  "hammer",
  "metal",
  "wood",
  "stone",
  "punch",
  "kick",
  "drop",
  "land",
  "fall",
  "break",
  "breaks",
  "broken",
  "shatter",
];

const audioNonSoundEffectTerms = [
  "ambient",
  "ambience",
  "atmo",
  "dialogue",
  "loop",
  "music",
  "narration",
  "score",
  "song",
  "stem",
  "theme",
  "track",
  "voice",
  "voiceover",
  "vo",
];

const likelySoundEffectAudioExtensions = new Set(["aif", "aiff", "flac", "ogg", "wav"]);
const libraryTagDefinitionsByKey = createLibraryTagDefinitionLookup(libraryTagDefinitions);

const modelPolyTagThresholds = {
  low: 5_000,
  high: 50_000,
  veryHigh: 250_000,
};

export function toAsset(asset: ScannedAsset, modelResult?: ModelInspectorResult): Asset {
  const systemTags = normalizeLibraryNodeTagValues(getAutomaticAssetTags(asset, modelResult));
  const defaultKeptTags = normalizeLibraryNodeTagValues(getDefaultKeptAssetTags(asset)).filter((tag) => systemTags.includes(tag));
  const keptTags = normalizeLibraryNodeTagValues([...defaultKeptTags, ...(asset.kept_tags ?? [])]);
  const userTags = normalizeLibraryNodeTagValues(asset.tags ?? []);

  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    type: asset.file_type,
    extension: asset.extension,
    size: formatBytes(asset.size_bytes),
    sizeBytes: asset.size_bytes,
    modified: formatModified(asset.modified_unix),
    modifiedUnix: asset.modified_unix,
    defaultKeptTags,
    keptTags,
    systemTags,
    tags: normalizeLibraryNodeTagValues([...systemTags, ...keptTags, ...userTags]),
    userTags,
    notes: asset.notes ?? "",
    color: typeColors[asset.file_type],
  };
}

export function getBaseName(path: string) {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]+/).pop() || normalized;
}

function getAutomaticAssetTags(asset: ScannedAsset, modelResult?: ModelInspectorResult) {
  const tags = new Set<string>();
  const extension = asset.extension.toLowerCase();

  for (const tag of [
    asset.file_type.toLowerCase(),
    extension,
    ...fileTypeAutomaticTags[asset.file_type],
    ...(extensionAutomaticTags[extension] ?? []),
  ]) {
    addKnownLibraryTag(tags, tag);
  }

  for (const tag of getAutomaticAudioTags(asset)) {
    addKnownLibraryTag(tags, tag);
  }

  for (const tag of getAutomaticModelInspectorTags(modelResult)) {
    addKnownLibraryTag(tags, tag);
  }

  for (const tag of getAutomaticLibraryRegistryTags(asset)) {
    addAutomaticRegistryTag(tags, tag);
  }

  return [...tags];
}

function getDefaultKeptAssetTags(asset: ScannedAsset) {
  return normalizeLibraryNodeTagValues([
    asset.file_type.toLowerCase(),
    asset.extension,
    ...fileTypeAutomaticTags[asset.file_type],
  ]);
}

function getScannedAssetTagSearchText(asset: ScannedAsset) {
  return normalizeLibraryMatchText([
    asset.name,
    asset.extension,
    asset.file_type,
  ].join(" "));
}

function getAutomaticLibraryRegistryTags(asset: ScannedAsset) {
  const tags = new Set<string>();
  const searchText = getScannedAssetTagSearchText(asset);

  for (const tagDefinition of libraryTagDefinitions) {
    if (tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
      break;
    }

    if (!libraryTagDefinitionCanMatchAsset(asset, tagDefinition) || !libraryTagDefinitionMatchesSearchText(tagDefinition, searchText)) {
      continue;
    }

    addLibraryTagDefinitionTags(tags, tagDefinition);
  }

  return [...tags];
}

function libraryTagDefinitionCanMatchAsset(asset: ScannedAsset, tagDefinition: LibraryTagDefinition) {
  const fileTypes = tagDefinition.locksToFileTypes;

  if (!fileTypes || fileTypes.length === 0 || fileTypes.includes("Any")) {
    return true;
  }

  return fileTypes.some((fileType) => fileType === asset.file_type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

function libraryTagDefinitionMatchesSearchText(tagDefinition: LibraryTagDefinition, searchText: string) {
  return getLibraryTagDefinitionTriggerTerms(tagDefinition).some((term) => normalizedTextIncludesTerm(searchText, term));
}

function getLibraryTagDefinitionTriggerTerms(tagDefinition: LibraryTagDefinition) {
  const terms = new Set<string>();

  for (const value of [
    tagDefinition.id,
    tagDefinition.label,
    ...(tagDefinition.aliases ?? []),
  ]) {
    addLibraryRegistryTriggerTerm(terms, value);
  }

  return [...terms];
}

function addLibraryRegistryTriggerTerm(terms: Set<string>, value: string) {
  const normalized = normalizeLibraryMatchText(value);

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return;
  }

  addNormalizedLibraryMatchTerm(terms, normalized);
}

function addLibraryTagDefinitionTags(tags: Set<string>, tagDefinition: LibraryTagDefinition) {
  const tagKey = getLibraryTagDefinitionKey(tagDefinition);

  if (!tagKey || tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
    return;
  }

  addAutomaticRegistryTag(tags, tagDefinition.id);

  for (const relatedTagId of [...(tagDefinition.parents ?? []), ...(tagDefinition.implies ?? [])]) {
    if (tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
      break;
    }

    addAutomaticRegistryTag(tags, relatedTagId);
  }
}

function addAutomaticRegistryTag(tags: Set<string>, value: string) {
  const normalized = canonicalizeLibraryTag(normalizeLibraryMatchText(value));

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return false;
  }

  const size = tags.size;
  addNormalizedLibraryMatchTerm(tags, normalized);
  return tags.size > size;
}

function addKnownLibraryTag(tags: Set<string>, value: string) {
  const tagDefinition = getLibraryTagDefinitionByKey(value);

  if (!tagDefinition) {
    return false;
  }

  const size = tags.size;
  addLibraryTagDefinitionTags(tags, tagDefinition);
  return tags.size > size;
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
  }

  for (const tagDefinition of tagDefinitions) {
    addLookupValue(tagDefinition.label, tagDefinition);
  }

  for (const tagDefinition of tagDefinitions) {
    for (const alias of tagDefinition.aliases ?? []) {
      addLookupValue(alias, tagDefinition);
    }
  }

  return lookup;
}

function getLibraryTagDefinitionKey(tagDefinition: LibraryTagDefinition) {
  return getLibraryTagKey(tagDefinition.id);
}

function getLibraryTagKey(value: string) {
  return canonicalizeLibraryTag(normalizeLibraryMatchText(value));
}

function getAutomaticAudioTags(asset: ScannedAsset) {
  if (asset.file_type !== "Audio") {
    return [];
  }

  const tags = new Set<string>();
  const fileSearchText = normalizeLibraryMatchText([
    asset.name,
    asset.extension,
  ].join(" "));
  const parentSearchText = normalizeLibraryMatchText(getAssetImmediateParentName(asset.path));
  const combinedSearchText = normalizeLibraryMatchText([fileSearchText, parentSearchText].join(" "));
  const looksLikeNonSoundEffect =
    normalizedTextIncludesAnyTerm(fileSearchText, audioNonSoundEffectTerms) || normalizedTextIncludesAnyTerm(parentSearchText, audioNonSoundEffectTerms);
  const hasSoundEffectEvidence = normalizedTextIncludesAnyTerm(combinedSearchText, audioSoundEffectTerms);
  const hasImpactEvidence = normalizedTextIncludesAnyTerm(combinedSearchText, audioImpactTerms);

  if (!looksLikeNonSoundEffect && (hasSoundEffectEvidence || likelySoundEffectAudioExtensions.has(asset.extension.toLowerCase()))) {
    tags.add("sfx");
  }

  if (!looksLikeNonSoundEffect && hasImpactEvidence) {
    tags.add("impact");
  }

  return [...tags];
}

function getAutomaticModelInspectorTags(modelResult?: ModelInspectorResult) {
  if (modelResult?.status !== "ready") {
    return [];
  }

  const triangleCount = modelResult.info.triangleCount;

  if (triangleCount <= 0) {
    return [];
  }

  if (triangleCount < modelPolyTagThresholds.low) {
    return ["low-poly"];
  }

  if (triangleCount < modelPolyTagThresholds.high) {
    return ["mid-poly"];
  }

  if (triangleCount < modelPolyTagThresholds.veryHigh) {
    return ["high-poly"];
  }

  return ["very-high-poly"];
}

function getAssetImmediateParentName(path: string) {
  const directory = getAssetDirectoryPath(path);
  return directory ? getBaseName(directory) : "";
}

function getAssetDirectoryPath(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function normalizedTextIncludesAnyTerm(text: string, terms: string[]) {
  return terms.some((term) => normalizedTextIncludesTerm(text, normalizeLibraryMatchText(term)));
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function formatModified(value: number | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value * 1000));
}
