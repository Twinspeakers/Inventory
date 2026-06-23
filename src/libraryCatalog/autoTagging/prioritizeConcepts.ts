import { normalizeLibraryMatchText } from "../normalization";
import { getImageClassifierConceptDefinition, type ImageConceptKind } from "./modelConceptMap";

export type ImageClassifierConcept = {
  label: string;
  score: number;
};

export type PrioritizedImageConcept = {
  adjustedScore: number;
  kind: ImageConceptKind;
  label: string;
  mappedTagId: string | null;
  rawLabels: string[];
  regionRole: "background" | "primary" | "secondary";
  score: number;
};

type GroupedImageConcept = {
  kind: ImageConceptKind;
  mappedTagId: string | null;
  rawLabels: string[];
  score: number;
};

export function prioritizeImageClassifierConcepts(concepts: ImageClassifierConcept[]) {
  const groupedConcepts = groupImageClassifierConcepts(concepts);

  if (groupedConcepts.length === 0) {
    return [];
  }

  const prioritizedConcepts = groupedConcepts
    .map((concept) => ({
      adjustedScore: adjustImageConceptScore(concept),
      kind: concept.kind,
      label: concept.rawLabels[0] ?? concept.mappedTagId ?? "",
      mappedTagId: concept.mappedTagId,
      rawLabels: concept.rawLabels,
      score: concept.score,
    }))
    .sort((first, second) => second.adjustedScore - first.adjustedScore || second.score - first.score);

  const topAdjustedScore = prioritizedConcepts[0]?.adjustedScore ?? 0;

  return prioritizedConcepts.map((concept) => ({
    ...concept,
    regionRole: getImageConceptRegionRole(concept.adjustedScore, topAdjustedScore),
  }));
}

function groupImageClassifierConcepts(concepts: ImageClassifierConcept[]) {
  const groupedConcepts = new Map<string, GroupedImageConcept>();

  for (const concept of concepts) {
    const definition = getImageClassifierConceptDefinition(concept.label);

    if (!definition) {
      continue;
    }

    const groupKey = definition.mappedTagId ?? `raw:${normalizeLibraryMatchText(definition.label)}`;
    const existingGroup = groupedConcepts.get(groupKey);

    if (!existingGroup) {
      groupedConcepts.set(groupKey, {
        kind: definition.kind,
        mappedTagId: definition.mappedTagId,
        rawLabels: [definition.label],
        score: concept.score,
      });
      continue;
    }

    existingGroup.score = Math.max(existingGroup.score, concept.score);
    if (!existingGroup.rawLabels.includes(definition.label)) {
      existingGroup.rawLabels.push(definition.label);
    }

    if (compareImageConceptKinds(definition.kind, existingGroup.kind) < 0) {
      existingGroup.kind = definition.kind;
    }
  }

  return [...groupedConcepts.values()];
}

function adjustImageConceptScore(concept: GroupedImageConcept) {
  const supportBonus = Math.min(0.14, Math.max(0, concept.rawLabels.length - 1) * 0.06);
  const kindBonus = concept.kind === "scene" ? 0.04 : concept.kind === "subject" ? 0.03 : 0;
  return Math.min(1, concept.score + supportBonus + kindBonus);
}

function getImageConceptRegionRole(adjustedScore: number, topAdjustedScore: number): PrioritizedImageConcept["regionRole"] {
  if (adjustedScore >= Math.max(0.18, topAdjustedScore * 0.68)) {
    return "primary";
  }

  if (adjustedScore >= Math.max(0.1, topAdjustedScore * 0.45)) {
    return "secondary";
  }

  return "background";
}

function compareImageConceptKinds(first: ImageConceptKind, second: ImageConceptKind) {
  return getImageConceptKindRank(first) - getImageConceptKindRank(second);
}

function getImageConceptKindRank(kind: ImageConceptKind) {
  switch (kind) {
    case "scene":
      return 0;
    case "subject":
      return 1;
    case "context":
    default:
      return 2;
  }
}
