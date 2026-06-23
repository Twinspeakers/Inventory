import type { AnalysisEvidenceCandidate } from "../../app/appTypes";
import type { PrioritizedImageConcept } from "./prioritizeConcepts";
import type { ImageClassifierConcept } from "./visionPromptTypes";

export type ImageAutoTagResult = {
  autoTags: string[];
  evidence: AnalysisEvidenceCandidate[];
};

export type ImageAnalysisInput = {
  caption: string;
  classifierConcepts?: ImageClassifierConcept[];
};

export type ImageClassifierEvidence = PrioritizedImageConcept;
