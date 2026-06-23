export type ImageConceptKind = "context" | "scene" | "subject";

export type VisionPromptStage = "broad" | "family";

export type VisionPromptFamilyId =
  | "broad"
  | "animals"
  | "people"
  | "food"
  | "plants"
  | "nature"
  | "places"
  | "transport"
  | "documents"
  | "objects"
  | "culture";

export type VisionSpecificPromptFamilyId = Exclude<VisionPromptFamilyId, "broad">;

export type VisionPromptDefinition = {
  familyId: VisionPromptFamilyId;
  id: string;
  kind: ImageConceptKind;
  label: string;
  mappedTagId: string | null;
  stage: VisionPromptStage;
  triggerFamilies?: VisionSpecificPromptFamilyId[];
};

export type VisionPromptFamily = {
  id: VisionSpecificPromptFamilyId;
  label: string;
  prompts: VisionPromptDefinition[];
};

export type ImageClassifierConcept = {
  familyId?: VisionPromptFamilyId;
  label: string;
  score: number;
  stage?: VisionPromptStage;
};
