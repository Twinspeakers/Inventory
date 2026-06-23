import type { AnalysisEvidenceCandidate } from "../../app/appTypes";
import type { ImageAnalysisCandidate } from "../tag-inference";
import { inferImageAnalysisCandidatesFromCaption } from "../tag-inference";
import { extractCaptionPromptCandidates } from "./extractCaptionPromptCandidates";
import { mapCandidateToAllowedAutoTagId } from "./mapping";
import { allowedImageAutoTagIds, imageAutoTagSuppressions, MAX_IMAGE_AUTO_TAGS } from "./policies";
import { scoreVisionConcepts } from "./scoreVisionConcepts";
import type { ImageAnalysisInput, ImageAutoTagResult } from "./types";
import type { ImageClassifierConcept } from "./visionPromptTypes";

export function runImageAutoTagging(input: ImageAnalysisInput): ImageAutoTagResult {
  const captionResult = runCaptionPrimaryAutoTagging(input.caption);
  const classifierResult = runClassifierFirstAutoTagging(input.classifierConcepts ?? []);

  if (captionResult.autoTags.length === 0) {
    return {
      autoTags: classifierResult.autoTags,
      evidence: [...classifierResult.evidence, ...buildCaptionEvidence(input.caption, classifierResult.autoTags)],
    };
  }

  const autoTags = mergeCaptionAndClassifierAutoTags(captionResult.autoTags, classifierResult);
  return {
    autoTags,
    evidence: [
      ...buildAcceptedCaptionEvidence(captionResult.evidence, autoTags),
      ...buildAcceptedClassifierEvidence(classifierResult.evidence, autoTags),
    ],
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
  return scoreVisionConcepts(classifierConcepts);
}

function runCaptionPrimaryAutoTagging(caption: string) {
  return runImageAutoTaggingFromCandidates(mergeCaptionCandidates(caption));
}

function buildCaptionEvidence(caption: string, acceptedTagIds: string[]) {
  return mergeCaptionCandidates(caption).map<AnalysisEvidenceCandidate>((candidate) => ({
    accepted: acceptedTagIds.includes(mapCandidateToAllowedAutoTagId(candidate.tagId, allowedImageAutoTagIds) ?? ""),
    mappedTagId: mapCandidateToAllowedAutoTagId(candidate.tagId, allowedImageAutoTagIds),
    matchedTerms: candidate.matchedTerms,
    rawTagId: candidate.tagId,
    score: candidate.score,
    source: "caption",
  }));
}

function mergeCaptionAndClassifierAutoTags(captionAutoTags: string[], classifierResult: ImageAutoTagResult) {
  const mergedAutoTags = [...captionAutoTags];
  const seenTagIds = new Set(mergedAutoTags);

  for (const tagId of classifierResult.autoTags) {
    if (mergedAutoTags.length >= MAX_IMAGE_AUTO_TAGS || seenTagIds.has(tagId)) {
      continue;
    }

    if (isClassifierTagSuppressedByCaption(tagId, mergedAutoTags)) {
      continue;
    }

    if (!hasSpecificClassifierSupport(tagId, classifierResult.evidence)) {
      continue;
    }

    mergedAutoTags.push(tagId);
    seenTagIds.add(tagId);
  }

  return mergedAutoTags;
}

function isClassifierTagSuppressedByCaption(tagId: string, captionAutoTags: string[]) {
  const suppressedByCaptionTags = new Set(captionAutoTags.flatMap((captionTagId) => imageAutoTagSuppressions[captionTagId] ?? []));
  return suppressedByCaptionTags.has(tagId);
}

function buildAcceptedCaptionEvidence(evidence: AnalysisEvidenceCandidate[], acceptedTagIds: string[]) {
  return evidence.map((candidate) => ({
    ...candidate,
    accepted: candidate.mappedTagId !== null && acceptedTagIds.includes(candidate.mappedTagId),
  }));
}

function buildAcceptedClassifierEvidence(evidence: AnalysisEvidenceCandidate[], acceptedTagIds: string[]) {
  return evidence.map((candidate) => ({
    ...candidate,
    accepted: candidate.accepted && candidate.mappedTagId !== null && acceptedTagIds.includes(candidate.mappedTagId),
  }));
}

function hasSpecificClassifierSupport(tagId: string, evidence: AnalysisEvidenceCandidate[]) {
  return evidence.some(
    (candidate) =>
      candidate.source === "classifier" &&
      candidate.accepted &&
      candidate.mappedTagId === tagId &&
      !candidate.matchedTerms.includes("broad"),
  );
}

function mergeCaptionCandidates(caption: string) {
  const mergedCandidates = new Map<string, ImageAnalysisCandidate>();

  for (const candidate of [
    ...extractCaptionPromptCandidates(caption),
    ...inferImageAnalysisCandidatesFromCaption(caption),
  ]) {
    const existingCandidate = mergedCandidates.get(candidate.tagId);

    if (!existingCandidate) {
      mergedCandidates.set(candidate.tagId, {
        matchedTerms: [...candidate.matchedTerms],
        score: candidate.score,
        tagId: candidate.tagId,
      });
      continue;
    }

    existingCandidate.matchedTerms = [...new Set([...existingCandidate.matchedTerms, ...candidate.matchedTerms])];
    existingCandidate.score = Math.max(existingCandidate.score, candidate.score);
  }

  return [...mergedCandidates.values()].sort((first, second) => second.score - first.score);
}
