import { describe, expect, it } from "vitest";

import {
  broadVisionCandidateLabels,
  getImageClassifierConceptDefinition,
  getVisionPromptFamilyCandidateLabels,
  selectVisionPromptFamilies,
} from "./modelConceptMap";

describe("modelConceptMap", () => {
  it("uses the medium-granularity broad vocabulary", () => {
    expect(broadVisionCandidateLabels).toEqual(
      expect.arrayContaining(["animal", "person", "food", "forest", "city", "technology", "musical instrument", "sport"]),
    );
    expect(broadVisionCandidateLabels).not.toContain("castle");
  });

  it("maps concrete prompts to the intended medium-granularity tags", () => {
    expect(getImageClassifierConceptDefinition("castle")).toMatchObject({
      kind: "scene",
      mappedTagId: "castle",
    });
    expect(getImageClassifierConceptDefinition("orange fruit")).toMatchObject({
      kind: "subject",
      mappedTagId: "fruit",
    });
    expect(getImageClassifierConceptDefinition("bird")).toMatchObject({
      kind: "subject",
      mappedTagId: "bird",
    });
  });

  it("selects focused families from the broad pass", () => {
    expect(getVisionPromptFamilyCandidateLabels("transport")).toContain("dirt bike");

    expect(
      selectVisionPromptFamilies([
        { label: "outdoor scene", score: 0.26, familyId: "broad", stage: "broad" },
        { label: "vehicle", score: 0.22, familyId: "broad", stage: "broad" },
        { label: "person", score: 0.12, familyId: "broad", stage: "broad" },
      ]),
    ).toEqual(["nature", "places", "transport"]);
  });
});
