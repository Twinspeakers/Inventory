import { normalizeLibraryMatchText } from "../normalization";
import type {
  ImageClassifierConcept,
  VisionPromptDefinition,
  VisionPromptFamily,
  VisionPromptFamilyId,
  VisionSpecificPromptFamilyId,
} from "./visionPromptTypes";

const broadVisionConcepts: VisionPromptDefinition[] = [
  { id: "animal", label: "animal", familyId: "broad", kind: "subject", mappedTagId: "animal", stage: "broad", triggerFamilies: ["animals"] },
  { id: "person", label: "person", familyId: "broad", kind: "subject", mappedTagId: "person", stage: "broad", triggerFamilies: ["people", "culture"] },
  { id: "crowd", label: "crowd", familyId: "broad", kind: "subject", mappedTagId: "crowd", stage: "broad", triggerFamilies: ["people", "culture"] },
  { id: "food", label: "food", familyId: "broad", kind: "subject", mappedTagId: "food", stage: "broad", triggerFamilies: ["food"] },
  { id: "fruit", label: "fruit", familyId: "broad", kind: "subject", mappedTagId: "fruit", stage: "broad", triggerFamilies: ["food"] },
  { id: "vegetable", label: "vegetable", familyId: "broad", kind: "subject", mappedTagId: "vegetable", stage: "broad", triggerFamilies: ["food"] },
  { id: "dessert", label: "dessert", familyId: "broad", kind: "subject", mappedTagId: "dessert", stage: "broad", triggerFamilies: ["food"] },
  { id: "drink", label: "drink", familyId: "broad", kind: "subject", mappedTagId: "drink", stage: "broad", triggerFamilies: ["food"] },
  { id: "flower", label: "flower", familyId: "broad", kind: "subject", mappedTagId: "flower", stage: "broad", triggerFamilies: ["plants"] },
  { id: "tree", label: "tree", familyId: "broad", kind: "subject", mappedTagId: "tree", stage: "broad", triggerFamilies: ["plants"] },
  { id: "forest", label: "forest", familyId: "broad", kind: "scene", mappedTagId: "forest", stage: "broad", triggerFamilies: ["plants", "nature"] },
  { id: "plant-life", label: "plant", familyId: "broad", kind: "context", mappedTagId: "plant-life", stage: "broad", triggerFamilies: ["plants"] },
  { id: "indoors", label: "indoor scene", familyId: "broad", kind: "scene", mappedTagId: "indoors", stage: "broad", triggerFamilies: ["places", "objects"] },
  { id: "outdoors", label: "outdoor scene", familyId: "broad", kind: "scene", mappedTagId: "outdoors", stage: "broad", triggerFamilies: ["nature", "places", "transport"] },
  { id: "building", label: "building", familyId: "broad", kind: "scene", mappedTagId: "building", stage: "broad", triggerFamilies: ["places"] },
  { id: "city", label: "city", familyId: "broad", kind: "scene", mappedTagId: "city", stage: "broad", triggerFamilies: ["places"] },
  { id: "road", label: "road", familyId: "broad", kind: "scene", mappedTagId: "road", stage: "broad", triggerFamilies: ["places", "transport"] },
  { id: "transport", label: "vehicle", familyId: "broad", kind: "subject", mappedTagId: "transport", stage: "broad", triggerFamilies: ["transport"] },
  { id: "paper-document", label: "paper document", familyId: "broad", kind: "subject", mappedTagId: "paper-document", stage: "broad", triggerFamilies: ["documents"] },
  { id: "sign", label: "sign", familyId: "broad", kind: "subject", mappedTagId: "sign", stage: "broad", triggerFamilies: ["documents"] },
  { id: "technology", label: "technology", familyId: "broad", kind: "subject", mappedTagId: "technology", stage: "broad", triggerFamilies: ["objects"] },
  { id: "furniture", label: "furniture", familyId: "broad", kind: "subject", mappedTagId: "furniture", stage: "broad", triggerFamilies: ["objects"] },
  { id: "tool", label: "tool", familyId: "broad", kind: "subject", mappedTagId: "tool", stage: "broad", triggerFamilies: ["objects"] },
  { id: "weapon", label: "weapon", familyId: "broad", kind: "subject", mappedTagId: "weapon", stage: "broad", triggerFamilies: ["objects"] },
  { id: "clothing", label: "clothing", familyId: "broad", kind: "subject", mappedTagId: "clothing", stage: "broad", triggerFamilies: ["objects"] },
  { id: "bag", label: "bag", familyId: "broad", kind: "subject", mappedTagId: "bag", stage: "broad", triggerFamilies: ["objects"] },
  { id: "toy", label: "toy", familyId: "broad", kind: "subject", mappedTagId: "toy", stage: "broad", triggerFamilies: ["objects"] },
  { id: "artwork", label: "artwork", familyId: "broad", kind: "subject", mappedTagId: "artwork", stage: "broad", triggerFamilies: ["culture"] },
  { id: "music", label: "music", familyId: "broad", kind: "context", mappedTagId: "music", stage: "broad", triggerFamilies: ["culture"] },
  { id: "musical-instrument", label: "musical instrument", familyId: "broad", kind: "subject", mappedTagId: "musical-instrument", stage: "broad", triggerFamilies: ["culture"] },
  { id: "sport", label: "sport", familyId: "broad", kind: "context", mappedTagId: "sport", stage: "broad", triggerFamilies: ["culture"] },
  { id: "party", label: "party", familyId: "broad", kind: "context", mappedTagId: "party", stage: "broad", triggerFamilies: ["culture"] },
  { id: "ceremony", label: "ceremony", familyId: "broad", kind: "context", mappedTagId: "ceremony", stage: "broad", triggerFamilies: ["culture"] },
];

export const visionPromptFamilies: VisionPromptFamily[] = [
  {
    id: "animals",
    label: "Animals",
    prompts: [
      { id: "animal", label: "animal", familyId: "animals", kind: "subject", mappedTagId: "animal", stage: "family" },
      { id: "bird", label: "bird", familyId: "animals", kind: "subject", mappedTagId: "bird", stage: "family" },
      { id: "cat", label: "cat", familyId: "animals", kind: "subject", mappedTagId: "cat", stage: "family" },
      { id: "dog", label: "dog", familyId: "animals", kind: "subject", mappedTagId: "dog", stage: "family" },
      { id: "horse", label: "horse", familyId: "animals", kind: "subject", mappedTagId: "horse", stage: "family" },
      { id: "fish", label: "fish", familyId: "animals", kind: "subject", mappedTagId: "fish", stage: "family" },
      { id: "insect", label: "insect", familyId: "animals", kind: "subject", mappedTagId: "insect", stage: "family" },
      { id: "reptile", label: "reptile", familyId: "animals", kind: "subject", mappedTagId: "reptile", stage: "family" },
      { id: "butterfly", label: "butterfly", familyId: "animals", kind: "subject", mappedTagId: "insect", stage: "family" },
      { id: "bee", label: "bee", familyId: "animals", kind: "subject", mappedTagId: "insect", stage: "family" },
      { id: "snake", label: "snake", familyId: "animals", kind: "subject", mappedTagId: "reptile", stage: "family" },
      { id: "lizard", label: "lizard", familyId: "animals", kind: "subject", mappedTagId: "reptile", stage: "family" },
    ],
  },
  {
    id: "people",
    label: "People",
    prompts: [
      { id: "person", label: "person", familyId: "people", kind: "subject", mappedTagId: "person", stage: "family" },
      { id: "portrait", label: "portrait", familyId: "people", kind: "subject", mappedTagId: "person", stage: "family" },
      { id: "face", label: "face", familyId: "people", kind: "subject", mappedTagId: "person", stage: "family" },
      { id: "crowd", label: "crowd", familyId: "people", kind: "subject", mappedTagId: "crowd", stage: "family" },
      { id: "group of people", label: "group of people", familyId: "people", kind: "subject", mappedTagId: "crowd", stage: "family" },
    ],
  },
  {
    id: "food",
    label: "Food",
    prompts: [
      { id: "food", label: "food", familyId: "food", kind: "subject", mappedTagId: "food", stage: "family" },
      { id: "fruit", label: "fruit", familyId: "food", kind: "subject", mappedTagId: "fruit", stage: "family" },
      { id: "vegetable", label: "vegetable", familyId: "food", kind: "subject", mappedTagId: "vegetable", stage: "family" },
      { id: "dessert", label: "dessert", familyId: "food", kind: "subject", mappedTagId: "dessert", stage: "family" },
      { id: "bread", label: "bread", familyId: "food", kind: "subject", mappedTagId: "bread", stage: "family" },
      { id: "drink", label: "drink", familyId: "food", kind: "subject", mappedTagId: "drink", stage: "family" },
      { id: "apple", label: "apple", familyId: "food", kind: "subject", mappedTagId: "fruit", stage: "family" },
      { id: "orange-fruit", label: "orange fruit", familyId: "food", kind: "subject", mappedTagId: "fruit", stage: "family" },
      { id: "banana", label: "banana", familyId: "food", kind: "subject", mappedTagId: "fruit", stage: "family" },
      { id: "carrot", label: "carrot", familyId: "food", kind: "subject", mappedTagId: "vegetable", stage: "family" },
      { id: "salad", label: "salad", familyId: "food", kind: "subject", mappedTagId: "vegetable", stage: "family" },
      { id: "cake", label: "cake", familyId: "food", kind: "subject", mappedTagId: "dessert", stage: "family" },
      { id: "ice-cream", label: "ice cream", familyId: "food", kind: "subject", mappedTagId: "dessert", stage: "family" },
      { id: "coffee", label: "coffee", familyId: "food", kind: "subject", mappedTagId: "drink", stage: "family" },
      { id: "tea", label: "tea", familyId: "food", kind: "subject", mappedTagId: "drink", stage: "family" },
    ],
  },
  {
    id: "plants",
    label: "Plants",
    prompts: [
      { id: "flower", label: "flower", familyId: "plants", kind: "subject", mappedTagId: "flower", stage: "family" },
      { id: "tree", label: "tree", familyId: "plants", kind: "subject", mappedTagId: "tree", stage: "family" },
      { id: "grass", label: "grass", familyId: "plants", kind: "context", mappedTagId: "grass", stage: "family" },
      { id: "forest", label: "forest", familyId: "plants", kind: "scene", mappedTagId: "forest", stage: "family" },
      { id: "plant-life", label: "plant life", familyId: "plants", kind: "context", mappedTagId: "plant-life", stage: "family" },
      { id: "rose", label: "rose", familyId: "plants", kind: "subject", mappedTagId: "flower", stage: "family" },
      { id: "sunflower", label: "sunflower", familyId: "plants", kind: "subject", mappedTagId: "flower", stage: "family" },
      { id: "palm-tree", label: "palm tree", familyId: "plants", kind: "subject", mappedTagId: "tree", stage: "family" },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    prompts: [
      { id: "beach", label: "beach", familyId: "nature", kind: "scene", mappedTagId: "beach", stage: "family" },
      { id: "ocean", label: "ocean", familyId: "nature", kind: "scene", mappedTagId: "ocean", stage: "family" },
      { id: "river", label: "river", familyId: "nature", kind: "scene", mappedTagId: "river", stage: "family" },
      { id: "lake", label: "lake", familyId: "nature", kind: "scene", mappedTagId: "lake", stage: "family" },
      { id: "waterfall", label: "waterfall", familyId: "nature", kind: "scene", mappedTagId: "waterfall", stage: "family" },
      { id: "mountain", label: "mountain", familyId: "nature", kind: "scene", mappedTagId: "mountain", stage: "family" },
      { id: "hill", label: "hill", familyId: "nature", kind: "scene", mappedTagId: "hill", stage: "family" },
      { id: "hillside", label: "hillside", familyId: "nature", kind: "scene", mappedTagId: "hill", stage: "family" },
      { id: "desert", label: "desert", familyId: "nature", kind: "scene", mappedTagId: "desert", stage: "family" },
      { id: "snow", label: "snow", familyId: "nature", kind: "scene", mappedTagId: "snow", stage: "family" },
      { id: "rain", label: "rain", familyId: "nature", kind: "context", mappedTagId: "rain", stage: "family" },
      { id: "sky", label: "sky", familyId: "nature", kind: "scene", mappedTagId: "sky", stage: "family" },
      { id: "sunset", label: "sunset", familyId: "nature", kind: "scene", mappedTagId: "sunset", stage: "family" },
      { id: "sunrise", label: "sunrise", familyId: "nature", kind: "scene", mappedTagId: "sunrise", stage: "family" },
      { id: "outdoors", label: "outdoors", familyId: "nature", kind: "scene", mappedTagId: "outdoors", stage: "family" },
    ],
  },
  {
    id: "places",
    label: "Places",
    prompts: [
      { id: "indoors", label: "indoors", familyId: "places", kind: "scene", mappedTagId: "indoors", stage: "family" },
      { id: "room", label: "room", familyId: "places", kind: "scene", mappedTagId: "room", stage: "family" },
      { id: "shop", label: "shop", familyId: "places", kind: "scene", mappedTagId: "shop", stage: "family" },
      { id: "storage", label: "storage room", familyId: "places", kind: "scene", mappedTagId: "storage", stage: "family" },
      { id: "warehouse", label: "warehouse", familyId: "places", kind: "scene", mappedTagId: "warehouse", stage: "family" },
      { id: "building", label: "building", familyId: "places", kind: "scene", mappedTagId: "building", stage: "family" },
      { id: "house", label: "house", familyId: "places", kind: "scene", mappedTagId: "house", stage: "family" },
      { id: "apartment", label: "apartment building", familyId: "places", kind: "scene", mappedTagId: "apartment", stage: "family" },
      { id: "castle", label: "castle", familyId: "places", kind: "scene", mappedTagId: "castle", stage: "family" },
      { id: "bridge", label: "bridge", familyId: "places", kind: "scene", mappedTagId: "bridge", stage: "family" },
      { id: "road", label: "road", familyId: "places", kind: "scene", mappedTagId: "road", stage: "family" },
      { id: "street", label: "street", familyId: "places", kind: "scene", mappedTagId: "street", stage: "family" },
      { id: "path", label: "path", familyId: "places", kind: "scene", mappedTagId: "path", stage: "family" },
      { id: "city", label: "city", familyId: "places", kind: "scene", mappedTagId: "city", stage: "family" },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    prompts: [
      { id: "transport", label: "transport", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "car", label: "car", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "truck", label: "truck", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "bus", label: "bus", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "train", label: "train", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "airplane", label: "airplane", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "boat", label: "boat", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "bicycle", label: "bicycle", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "motorcycle", label: "motorcycle", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
      { id: "dirt-bike", label: "dirt bike", familyId: "transport", kind: "subject", mappedTagId: "transport", stage: "family" },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    prompts: [
      { id: "paper-document", label: "paper document", familyId: "documents", kind: "subject", mappedTagId: "paper-document", stage: "family" },
      { id: "book", label: "book", familyId: "documents", kind: "subject", mappedTagId: "book", stage: "family" },
      { id: "map", label: "map", familyId: "documents", kind: "subject", mappedTagId: "map", stage: "family" },
      { id: "letter", label: "letter", familyId: "documents", kind: "subject", mappedTagId: "letter", stage: "family" },
      { id: "sign", label: "sign", familyId: "documents", kind: "subject", mappedTagId: "sign", stage: "family" },
      { id: "logo", label: "logo", familyId: "documents", kind: "subject", mappedTagId: "logo", stage: "family" },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    prompts: [
      { id: "technology", label: "technology", familyId: "objects", kind: "subject", mappedTagId: "technology", stage: "family" },
      { id: "phone", label: "phone", familyId: "objects", kind: "subject", mappedTagId: "technology", stage: "family" },
      { id: "computer", label: "computer", familyId: "objects", kind: "subject", mappedTagId: "technology", stage: "family" },
      { id: "camera", label: "camera", familyId: "objects", kind: "subject", mappedTagId: "technology", stage: "family" },
      { id: "furniture", label: "furniture", familyId: "objects", kind: "subject", mappedTagId: "furniture", stage: "family" },
      { id: "chair", label: "chair", familyId: "objects", kind: "subject", mappedTagId: "furniture", stage: "family" },
      { id: "table", label: "table", familyId: "objects", kind: "subject", mappedTagId: "furniture", stage: "family" },
      { id: "tool", label: "tool", familyId: "objects", kind: "subject", mappedTagId: "tool", stage: "family" },
      { id: "hammer", label: "hammer", familyId: "objects", kind: "subject", mappedTagId: "tool", stage: "family" },
      { id: "weapon", label: "weapon", familyId: "objects", kind: "subject", mappedTagId: "weapon", stage: "family" },
      { id: "sword", label: "sword", familyId: "objects", kind: "subject", mappedTagId: "weapon", stage: "family" },
      { id: "clothing", label: "clothing", familyId: "objects", kind: "subject", mappedTagId: "clothing", stage: "family" },
      { id: "shirt", label: "shirt", familyId: "objects", kind: "subject", mappedTagId: "clothing", stage: "family" },
      { id: "bag", label: "bag", familyId: "objects", kind: "subject", mappedTagId: "bag", stage: "family" },
      { id: "backpack", label: "backpack", familyId: "objects", kind: "subject", mappedTagId: "bag", stage: "family" },
      { id: "toy", label: "toy", familyId: "objects", kind: "subject", mappedTagId: "toy", stage: "family" },
      { id: "teddy-bear", label: "teddy bear", familyId: "objects", kind: "subject", mappedTagId: "toy", stage: "family" },
    ],
  },
  {
    id: "culture",
    label: "Culture",
    prompts: [
      { id: "artwork", label: "artwork", familyId: "culture", kind: "subject", mappedTagId: "artwork", stage: "family" },
      { id: "painting", label: "painting", familyId: "culture", kind: "subject", mappedTagId: "artwork", stage: "family" },
      { id: "logo", label: "logo", familyId: "culture", kind: "subject", mappedTagId: "logo", stage: "family" },
      { id: "music", label: "music", familyId: "culture", kind: "context", mappedTagId: "music", stage: "family" },
      { id: "musical-instrument", label: "musical instrument", familyId: "culture", kind: "subject", mappedTagId: "musical-instrument", stage: "family" },
      { id: "guitar", label: "guitar", familyId: "culture", kind: "subject", mappedTagId: "musical-instrument", stage: "family" },
      { id: "piano", label: "piano", familyId: "culture", kind: "subject", mappedTagId: "musical-instrument", stage: "family" },
      { id: "party", label: "party", familyId: "culture", kind: "context", mappedTagId: "party", stage: "family" },
      { id: "birthday-party", label: "birthday party", familyId: "culture", kind: "context", mappedTagId: "party", stage: "family" },
      { id: "ceremony", label: "ceremony", familyId: "culture", kind: "context", mappedTagId: "ceremony", stage: "family" },
      { id: "wedding", label: "wedding", familyId: "culture", kind: "context", mappedTagId: "ceremony", stage: "family" },
      { id: "sport", label: "sport", familyId: "culture", kind: "context", mappedTagId: "sport", stage: "family" },
      { id: "soccer", label: "soccer", familyId: "culture", kind: "context", mappedTagId: "sport", stage: "family" },
      { id: "basketball", label: "basketball", familyId: "culture", kind: "context", mappedTagId: "sport", stage: "family" },
    ],
  },
];

export const broadVisionCandidateLabels = broadVisionConcepts.map((concept) => concept.label);

const visionPromptFamiliesById = new Map(visionPromptFamilies.map((family) => [family.id, family] as const));
const allVisionConceptDefinitions = [...broadVisionConcepts, ...visionPromptFamilies.flatMap((family) => family.prompts)];
const visionConceptDefinitionsByLabel = new Map(
  allVisionConceptDefinitions.map((definition) => [normalizeLibraryMatchText(definition.label), definition] as const),
);

export const imageClassifierConceptDefinitions = allVisionConceptDefinitions;
export const imageClassifierCandidateLabels = allVisionConceptDefinitions.map((definition) => definition.label);

export function getVisionPromptDefinition(label: string) {
  return visionConceptDefinitionsByLabel.get(normalizeLibraryMatchText(label)) ?? null;
}

export function getVisionPromptFamily(familyId: VisionSpecificPromptFamilyId) {
  return visionPromptFamiliesById.get(familyId) ?? null;
}

export function getVisionPromptFamilyCandidateLabels(familyId: VisionSpecificPromptFamilyId) {
  return getVisionPromptFamily(familyId)?.prompts.map((prompt) => prompt.label) ?? [];
}

export function getImageClassifierConceptDefinition(label: string) {
  return getVisionPromptDefinition(label);
}

export function selectVisionPromptFamilies(broadConcepts: ImageClassifierConcept[]) {
  const selectedFamilyIds: VisionSpecificPromptFamilyId[] = [];
  const seenFamilyIds = new Set<VisionSpecificPromptFamilyId>();
  const normalizedBroadConcepts = broadConcepts
    .map((concept) => {
      const definition = getVisionPromptDefinition(concept.label);
      return definition?.stage === "broad"
        ? {
            concept,
            definition,
          }
        : null;
    })
    .filter((value): value is { concept: ImageClassifierConcept; definition: VisionPromptDefinition } => value !== null)
    .sort((first, second) => second.concept.score - first.concept.score);

  const topScore = normalizedBroadConcepts[0]?.concept.score ?? 0;

  for (const { concept, definition } of normalizedBroadConcepts) {
    const passesAbsoluteThreshold = concept.score >= 0.15;
    const passesRelativeThreshold = concept.score >= Math.max(0.1, topScore * 0.62);

    if (!passesAbsoluteThreshold || !passesRelativeThreshold) {
      continue;
    }

    for (const familyId of definition.triggerFamilies ?? []) {
      if (seenFamilyIds.has(familyId)) {
        continue;
      }

      seenFamilyIds.add(familyId);
      selectedFamilyIds.push(familyId);
    }

    if (selectedFamilyIds.length >= 3) {
      break;
    }
  }

  if (selectedFamilyIds.length > 0) {
    return selectedFamilyIds;
  }

  const fallbackFamilyId = normalizedBroadConcepts[0]?.definition.triggerFamilies?.[0];
  return fallbackFamilyId ? [fallbackFamilyId] : [];
}

export function getVisionPromptFamilyId(value: string): VisionPromptFamilyId | null {
  if (value === "broad") {
    return value;
  }

  return visionPromptFamiliesById.has(value as VisionSpecificPromptFamilyId) ? (value as VisionSpecificPromptFamilyId) : null;
}
