import type { AnalysisEvidenceCandidate } from "../../app/appTypes";
import type { ImageClassifierConcept, PrioritizedImageConcept } from "./prioritizeConcepts";

export type ImageAutoTagResult = {
  autoTags: string[];
  evidence: AnalysisEvidenceCandidate[];
};

export type ImageAnalysisInput = {
  caption: string;
  classifierConcepts?: ImageClassifierConcept[];
};

export type ImageClassifierEvidence = PrioritizedImageConcept;
