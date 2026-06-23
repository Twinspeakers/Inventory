import { normalizedTextIncludesTerm, normalizeLibraryMatchText } from "../normalization";
import { imageClassifierConceptDefinitions } from "./modelConceptMap";
import type { ImageAnalysisCandidate } from "../tag-inference";

const directCaptionPromptBonusTerms: Record<string, string[]> = {
  hill: ["hillside"],
  mountain: ["mountainside", "mountain range"],
  forest: ["wooded", "woodland"],
  crowd: ["people", "audience"],
  "paper-document": ["document", "page", "paper"],
  "musical-instrument": ["instrument"],
  transport: ["vehicle"],
};

export function extractCaptionPromptCandidates(caption: string): ImageAnalysisCandidate[] {
  const normalizedCaption = normalizeLibraryMatchText(caption);

  if (!normalizedCaption) {
    return [];
  }

  const candidatesByTagId = new Map<string, ImageAnalysisCandidate>();

  for (const definition of imageClassifierConceptDefinitions) {
    const mappedTagId = definition.mappedTagId;

    if (!mappedTagId) {
      continue;
    }

    const matchedTerms = getMatchedCaptionTerms(normalizedCaption, definition.label, mappedTagId);

    if (matchedTerms.length === 0) {
      continue;
    }

    const score = matchedTerms.reduce((total, term) => total + (term === normalizeLibraryMatchText(definition.label) ? 28 : 22), 0);
    const existingCandidate = candidatesByTagId.get(mappedTagId);

    if (!existingCandidate || score > existingCandidate.score) {
      candidatesByTagId.set(mappedTagId, {
        matchedTerms,
        score,
        tagId: mappedTagId,
      });
    } else if (existingCandidate) {
      existingCandidate.matchedTerms = [...new Set([...existingCandidate.matchedTerms, ...matchedTerms])];
      existingCandidate.score = Math.max(existingCandidate.score, score);
    }
  }

  return [...candidatesByTagId.values()].sort((first, second) => second.score - first.score);
}

function getMatchedCaptionTerms(normalizedCaption: string, label: string, mappedTagId: string) {
  const matchedTerms: string[] = [];
  const normalizedLabel = normalizeLibraryMatchText(label);

  if (normalizedLabel && normalizedTextIncludesTerm(normalizedCaption, normalizedLabel)) {
    matchedTerms.push(normalizedLabel);
  }

  for (const term of directCaptionPromptBonusTerms[mappedTagId] ?? []) {
    const normalizedTerm = normalizeLibraryMatchText(term);

    if (normalizedTerm && normalizedTextIncludesTerm(normalizedCaption, normalizedTerm)) {
      matchedTerms.push(normalizedTerm);
    }
  }

  return [...new Set(matchedTerms)];
}
