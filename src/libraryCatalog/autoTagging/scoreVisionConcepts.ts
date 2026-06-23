import type { AnalysisEvidenceCandidate } from "../../app/appTypes";
import { getVisionPromptDefinition } from "./visionPromptSets";
import type { ImageClassifierConcept } from "./visionPromptTypes";
import {
  allowedImageAutoTagIds,
  DEFAULT_IMAGE_AUTO_TAG_MIN_SCORE,
  imageAutoTagMinScores,
  imageAutoTagSuppressions,
  IMAGE_AUTO_TAG_SECONDARY_RATIO,
  MAX_IMAGE_AUTO_TAGS,
} from "./policies";

type VisionEvidenceCandidate = {
  concept: ImageClassifierConcept;
  mappedTagId: string;
  regionRole: "background" | "primary" | "secondary";
};

type AggregatedVisionTagCandidate = {
  evidence: VisionEvidenceCandidate[];
  mappedTagId: string;
  regionRole: "background" | "primary" | "secondary";
  score: number;
  stageRank: number;
};

export function scoreVisionConcepts(classifierConcepts: ImageClassifierConcept[]) {
  const acceptedEvidence = collectAcceptedVisionEvidence(classifierConcepts);
  const aggregatedCandidates = aggregateVisionTagCandidates(acceptedEvidence);
  const finalTagIds = selectFinalVisionTagIds(aggregatedCandidates);

  const evidence = buildVisionEvidence(classifierConcepts, finalTagIds, acceptedEvidence);

  return {
    autoTags: finalTagIds,
    evidence,
  };
}

function collectAcceptedVisionEvidence(classifierConcepts: ImageClassifierConcept[]) {
  const conceptsByFamily = new Map<string, ImageClassifierConcept[]>();

  for (const concept of classifierConcepts) {
    const definition = getVisionPromptDefinition(concept.label);

    if (!definition?.mappedTagId || !allowedImageAutoTagIds.has(definition.mappedTagId)) {
      continue;
    }

    const familyKey = `${concept.stage ?? definition.stage}:${concept.familyId ?? definition.familyId}`;
    const familyConcepts = conceptsByFamily.get(familyKey) ?? [];
    familyConcepts.push({
      ...concept,
      familyId: concept.familyId ?? definition.familyId,
      stage: concept.stage ?? definition.stage,
    });
    conceptsByFamily.set(familyKey, familyConcepts);
  }

  const acceptedEvidence: VisionEvidenceCandidate[] = [];

  for (const familyConcepts of conceptsByFamily.values()) {
    familyConcepts.sort((first, second) => second.score - first.score);
    const topScore = familyConcepts[0]?.score ?? 0;

    familyConcepts.forEach((concept, index) => {
      const definition = getVisionPromptDefinition(concept.label);

      if (!definition?.mappedTagId) {
        return;
      }

      const minScore = imageAutoTagMinScores[definition.mappedTagId] ?? DEFAULT_IMAGE_AUTO_TAG_MIN_SCORE;
      const relativeThreshold = index === 0 ? minScore : Math.max(minScore, topScore * IMAGE_AUTO_TAG_SECONDARY_RATIO);

      if (concept.score < relativeThreshold) {
        return;
      }

      acceptedEvidence.push({
        concept,
        mappedTagId: definition.mappedTagId,
        regionRole: index === 0 ? "primary" : "secondary",
      });
    });
  }

  return acceptedEvidence;
}

function aggregateVisionTagCandidates(acceptedEvidence: VisionEvidenceCandidate[]) {
  const aggregatedCandidates = new Map<string, AggregatedVisionTagCandidate>();

  for (const evidence of acceptedEvidence) {
    const existingCandidate = aggregatedCandidates.get(evidence.mappedTagId);
    const stageRank = evidence.concept.stage === "family" ? 2 : 1;

    if (!existingCandidate) {
      aggregatedCandidates.set(evidence.mappedTagId, {
        evidence: [evidence],
        mappedTagId: evidence.mappedTagId,
        regionRole: evidence.regionRole,
        score: evidence.concept.score,
        stageRank,
      });
      continue;
    }

    existingCandidate.evidence.push(evidence);
    existingCandidate.score = Math.max(existingCandidate.score, evidence.concept.score);
    existingCandidate.stageRank = Math.max(existingCandidate.stageRank, stageRank);

    if (existingCandidate.regionRole !== "primary" && evidence.regionRole === "primary") {
      existingCandidate.regionRole = "primary";
    }
  }

  return [...aggregatedCandidates.values()].sort(
    (first, second) => second.stageRank - first.stageRank || second.score - first.score,
  );
}

function selectFinalVisionTagIds(aggregatedCandidates: AggregatedVisionTagCandidate[]) {
  const finalTagIds: string[] = [];

  for (const candidate of aggregatedCandidates) {
    if (candidate.regionRole === "background") {
      continue;
    }

    const suppressedTagIds = new Set(finalTagIds.flatMap((tagId) => imageAutoTagSuppressions[tagId] ?? []));

    if (suppressedTagIds.has(candidate.mappedTagId)) {
      continue;
    }

    const nextFinalTagIds = finalTagIds.filter((tagId) => !(imageAutoTagSuppressions[candidate.mappedTagId] ?? []).includes(tagId));

    if (nextFinalTagIds.length !== finalTagIds.length) {
      finalTagIds.splice(0, finalTagIds.length, ...nextFinalTagIds);
    }

    if (finalTagIds.includes(candidate.mappedTagId)) {
      continue;
    }

    if (finalTagIds.length >= MAX_IMAGE_AUTO_TAGS) {
      break;
    }

    finalTagIds.push(candidate.mappedTagId);
  }

  return finalTagIds;
}

function buildVisionEvidence(
  classifierConcepts: ImageClassifierConcept[],
  finalTagIds: string[],
  acceptedEvidence: VisionEvidenceCandidate[],
) {
  const acceptedEvidenceKeys = new Map(
    acceptedEvidence.map((evidence) => [getVisionEvidenceKey(evidence.concept.label, evidence.mappedTagId), evidence] as const),
  );

  return classifierConcepts
    .map<AnalysisEvidenceCandidate | null>((concept) => {
      const definition = getVisionPromptDefinition(concept.label);
      const mappedTagId = definition?.mappedTagId ?? null;

      if (!mappedTagId || !allowedImageAutoTagIds.has(mappedTagId)) {
        return null;
      }

      const acceptedEvidenceMatch = acceptedEvidenceKeys.get(getVisionEvidenceKey(concept.label, mappedTagId));

      return {
        accepted: finalTagIds.includes(mappedTagId) && acceptedEvidenceMatch !== undefined,
        mappedTagId,
        matchedTerms: [concept.label, concept.familyId ?? definition?.familyId ?? ""].filter(Boolean),
        rawTagId: concept.label,
        regionRole: acceptedEvidenceMatch?.regionRole ?? "background",
        score: concept.score,
        source: "classifier",
      };
    })
    .filter((candidate): candidate is AnalysisEvidenceCandidate => candidate !== null);
}

function getVisionEvidenceKey(label: string, mappedTagId: string) {
  return `${mappedTagId}::${label}`;
}
