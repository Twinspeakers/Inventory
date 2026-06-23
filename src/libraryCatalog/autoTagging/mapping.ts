import { normalizeLibraryMatchText } from "../normalization";
import { libraryTagDefinitions } from "../tags";
import { blockedImageAutoTagIds } from "./policies";

const tagDefinitionsById = new Map(libraryTagDefinitions.map((tagDefinition) => [tagDefinition.id, tagDefinition] as const));

const explicitAutoTagFallbacks: Record<string, string[]> = {
  "airplane": ["vehicle"],
  "amphibian": ["animal"],
  "baked-good": ["food"],
  "bakery": ["food"],
  "beach": ["beach"],
  "bicycle": ["vehicle"],
  "blueprint": ["paper-document"],
  "blueprint-sheet": ["paper-document"],
  "boat": ["vehicle"],
  "book": ["paper-document"],
  "bridge": ["building"],
  "bush": ["plant-life"],
  "cabin": ["building"],
  "car": ["vehicle"],
  "castle": ["building"],
  "cat": ["animal"],
  "cattle": ["animal"],
  "cave": ["terrain"],
  "chicken": ["animal"],
  "classroom": ["room"],
  "corridor": ["room"],
  "cottage": ["building"],
  "croissant": ["food"],
  "dessert": ["food"],
  "dog": ["animal"],
  "drink": ["food"],
  "duck": ["animal"],
  "factory": ["building"],
  "farm": ["building"],
  "field": ["terrain"],
  "fish": ["animal"],
  "flower": ["flower"],
  "forest": ["terrain"],
  "frog": ["animal"],
  "garage": ["room"],
  "grass": ["plant-life"],
  "greenhouse": ["building"],
  "hammer": [],
  "home": ["building"],
  "horse": ["animal"],
  "hotel": ["building"],
  "island": ["terrain"],
  "kitchen": ["room"],
  "lake": ["terrain"],
  "leaf": ["plant-life"],
  "letter": ["paper-document"],
  "lighthouse": ["building"],
  "living-room": ["room"],
  "lizard": ["animal"],
  "map": ["paper-document"],
  "mammal": ["animal"],
  "mountain": ["terrain"],
  "mushroom": [],
  "office": ["room"],
  "orange": ["fruit"],
  "palace": ["building"],
  "pastry": ["food"],
  "plant": ["plant-life"],
  "poodle": ["animal"],
  "rainforest": ["terrain"],
  "recipe": ["paper-document"],
  "reef": ["terrain"],
  "restaurant": [],
  "river": ["terrain"],
  "road": ["road"],
  "room": ["room"],
  "rose": ["plant-life"],
  "sandwich": ["food"],
  "school-building": ["building"],
  "shop": ["building"],
  "shrub": ["plant-life"],
  "sign": [],
  "skyscraper": ["building"],
  "snake": ["animal"],
  "sparrow": ["animal"],
  "storage-room": ["room"],
  "street": [],
  "temple-building": ["building"],
  "tiger": ["animal"],
  "tool": [],
  "tower": ["building"],
  "train": ["vehicle"],
  "tree": ["tree"],
  "truck": ["vehicle"],
  "valley": ["terrain"],
  "vehicle": ["vehicle"],
  "vine": ["plant-life"],
  "volcano": ["terrain"],
  "warehouse": ["building"],
  "waterfall": ["terrain"],
  "workshop": ["building"],
};

export function mapCandidateToAllowedAutoTagId(tagId: string, allowedTagIds: ReadonlySet<string>) {
  const normalizedTagId = normalizeLibraryMatchText(tagId);

  if (!normalizedTagId || blockedImageAutoTagIds.has(normalizedTagId)) {
    return null;
  }

  if (allowedTagIds.has(normalizedTagId)) {
    return normalizedTagId;
  }

  const fallbackMatches = explicitAutoTagFallbacks[normalizedTagId] ?? [];
  const fallbackTagId = fallbackMatches.find((candidate) => allowedTagIds.has(candidate));

  if (fallbackTagId) {
    return fallbackTagId;
  }

  return findAllowedAncestor(normalizedTagId, allowedTagIds);
}

function findAllowedAncestor(tagId: string, allowedTagIds: ReadonlySet<string>) {
  const pending = [tagId];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const currentTagId = pending.shift();

    if (!currentTagId || visited.has(currentTagId)) {
      continue;
    }

    visited.add(currentTagId);

    if (allowedTagIds.has(currentTagId)) {
      return currentTagId;
    }

    const definition = tagDefinitionsById.get(currentTagId);

    if (!definition) {
      continue;
    }

    for (const relatedTagId of [...(definition.parents ?? []), ...(definition.implies ?? [])]) {
      const normalizedRelatedTagId = normalizeLibraryMatchText(relatedTagId);

      if (!normalizedRelatedTagId || blockedImageAutoTagIds.has(normalizedRelatedTagId) || visited.has(normalizedRelatedTagId)) {
        continue;
      }

      pending.push(normalizedRelatedTagId);
    }
  }

  return null;
}
