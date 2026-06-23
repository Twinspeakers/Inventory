import { normalizeLibraryMatchText } from "../normalization";

export type ImageConceptKind = "context" | "scene" | "subject";

export type ImageClassifierConceptDefinition = {
  kind: ImageConceptKind;
  label: string;
  mappedTagId: string | null;
};

export const imageClassifierConceptDefinitions: ImageClassifierConceptDefinition[] = [
  { label: "animal", mappedTagId: "animal", kind: "subject" },
  { label: "bird", mappedTagId: "animal", kind: "subject" },
  { label: "cat", mappedTagId: "animal", kind: "subject" },
  { label: "dog", mappedTagId: "animal", kind: "subject" },
  { label: "duck", mappedTagId: "animal", kind: "subject" },
  { label: "monkey", mappedTagId: "animal", kind: "subject" },
  { label: "fruit", mappedTagId: "fruit", kind: "subject" },
  { label: "lemon", mappedTagId: "fruit", kind: "subject" },
  { label: "orange fruit", mappedTagId: "fruit", kind: "subject" },
  { label: "food", mappedTagId: "food", kind: "subject" },
  { label: "flower", mappedTagId: "flower", kind: "subject" },
  { label: "tree", mappedTagId: "tree", kind: "subject" },
  { label: "plant", mappedTagId: "plant-life", kind: "context" },
  { label: "grass", mappedTagId: "plant-life", kind: "context" },
  { label: "beach", mappedTagId: "beach", kind: "scene" },
  { label: "sand", mappedTagId: "beach", kind: "scene" },
  { label: "coast", mappedTagId: "beach", kind: "scene" },
  { label: "road", mappedTagId: "road", kind: "scene" },
  { label: "street", mappedTagId: "road", kind: "scene" },
  { label: "traffic sign", mappedTagId: null, kind: "context" },
  { label: "paper document", mappedTagId: "paper-document", kind: "subject" },
  { label: "book", mappedTagId: "paper-document", kind: "subject" },
  { label: "building", mappedTagId: "building", kind: "scene" },
  { label: "room", mappedTagId: "room", kind: "scene" },
  { label: "vehicle", mappedTagId: "vehicle", kind: "subject" },
  { label: "mountain", mappedTagId: "terrain", kind: "scene" },
  { label: "forest", mappedTagId: "terrain", kind: "scene" },
  { label: "field", mappedTagId: "terrain", kind: "scene" },
  { label: "river", mappedTagId: "terrain", kind: "scene" },
  { label: "lake", mappedTagId: "terrain", kind: "scene" },
  { label: "waterfall", mappedTagId: "terrain", kind: "scene" },
  { label: "terrain", mappedTagId: "terrain", kind: "scene" },
  { label: "water", mappedTagId: null, kind: "context" },
  { label: "sky", mappedTagId: null, kind: "context" },
  { label: "person", mappedTagId: null, kind: "subject" },
  { label: "indoor scene", mappedTagId: "room", kind: "scene" },
  { label: "outdoor scene", mappedTagId: "terrain", kind: "scene" },
];

const imageClassifierConceptDefinitionsByLabel = new Map(
  imageClassifierConceptDefinitions.map((definition) => [normalizeLibraryMatchText(definition.label), definition] as const),
);

export const imageClassifierCandidateLabels = imageClassifierConceptDefinitions.map((definition) => definition.label);

export function getImageClassifierConceptDefinition(label: string) {
  return imageClassifierConceptDefinitionsByLabel.get(normalizeLibraryMatchText(label)) ?? null;
}
