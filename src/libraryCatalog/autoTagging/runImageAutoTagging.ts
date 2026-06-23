import type { AnalysisEvidenceCandidate } from "../../app/appTypes";
import type { ImageAnalysisCandidate } from "../tag-inference";
import { inferImageAnalysisCandidatesFromCaption } from "../tag-inference";
import { mapCandidateToAllowedAutoTagId } from "./mapping";
import { allowedImageAutoTagIds, imageAutoTagMinScores, MAX_IMAGE_AUTO_TAGS } from "./policies";
import { prioritizeImageClassifierConcepts, type ImageClassifierConcept } from "./prioritizeConcepts";
import type { ImageAnalysisInput, ImageAutoTagResult } from "./types";

export function runImageAutoTagging(input: ImageAnalysisInput): ImageAutoTagResult {
  const classifierResult = runClassifierFirstAutoTagging(input.classifierConcepts ?? []);

  if (classifierResult.autoTags.length > 0) {
    return {
      autoTags: classifierResult.autoTags,
      evidence: [...classifierResult.evidence, ...buildCaptionEvidence(input.caption)],
    };
  }

  const captionFallback = runCaptionFallbackAutoTagging(input.caption);
  return {
    autoTags: captionFallback.autoTags,
    evidence: [...classifierResult.evidence, ...captionFallback.evidence],
  };
}

export function runImageAutoTaggingFromCandidates(candidates: ImageAnalysisCandidate[]): ImageAutoTagResult {
  const autoTags: string[] = [];
  const seenAutoTagIds = new Set<string>(autoTags);
  const evidence: AnalysisEvidenceCandidate[] = [];

  for (const candidate of candidates) {
    const mappedTagId = mapCandidateToAllowedAutoTagId(candidate.tagId, allowedImageAutoTagIds);
    const accepted = mappedTagId !== null && !seenAutoTagIds.has(mappedTagId) && autoTags.length < MAX_IMAGE_AUTO_TAGS;

    if (accepted && mappedTagId) {
      seenAutoTagIds.add(mappedTagId);
      autoTags.push(mappedTagId);
    }

    evidence.push({
      accepted,
      mappedTagId,
      matchedTerms: candidate.matchedTerms,
      rawTagId: candidate.tagId,
      score: candidate.score,
      source: "caption",
    });
  }

  return { autoTags, evidence };
}

function runClassifierFirstAutoTagging(classifierConcepts: ImageClassifierConcept[]): ImageAutoTagResult {
  const prioritizedConcepts = prioritizeImageClassifierConcepts(classifierConcepts);
  const autoTags: string[] = [];
  const seenAutoTagIds = new Set<string>();
  const evidence: AnalysisEvidenceCandidate[] = [];

  for (const concept of prioritizedConcepts) {
    const mappedTagId = concept.mappedTagId ? mapCandidateToAllowedAutoTagId(concept.mappedTagId, allowedImageAutoTagIds) : null;
    const minimumScore = mappedTagId ? imageAutoTagMinScores[mappedTagId] ?? 0.18 : Number.POSITIVE_INFINITY;
    const accepted =
      mappedTagId !== null &&
      concept.regionRole !== "background" &&
      concept.adjustedScore >= minimumScore &&
      !seenAutoTagIds.has(mappedTagId) &&
      autoTags.length < MAX_IMAGE_AUTO_TAGS;

    if (accepted && mappedTagId) {
      seenAutoTagIds.add(mappedTagId);
      autoTags.push(mappedTagId);
    }

    evidence.push({
      accepted,
      mappedTagId,
      matchedTerms: concept.rawLabels,
      rawTagId: concept.label,
      regionRole: concept.regionRole,
      score: concept.adjustedScore,
      source: "classifier",
    });
  }

  return { autoTags, evidence };
}

function runCaptionFallbackAutoTagging(caption: string) {
  return runImageAutoTaggingFromCandidates(inferImageAnalysisCandidatesFromCaption(caption));
}

function buildCaptionEvidence(caption: string) {
  return inferImageAnalysisCandidatesFromCaption(caption).map<AnalysisEvidenceCandidate>((candidate) => ({
    accepted: false,
    mappedTagId: mapCandidateToAllowedAutoTagId(candidate.tagId, allowedImageAutoTagIds),
    matchedTerms: candidate.matchedTerms,
    rawTagId: candidate.tagId,
    score: candidate.score,
    source: "caption",
  }));
}
