import { describe, expect, it } from "vitest";

import { runImageAutoTagging, runImageAutoTaggingFromCandidates } from "./runImageAutoTagging";

describe("runImageAutoTagging", () => {
  it("keeps caption-led fruit tags and avoids broader classifier fallbacks", () => {
    const result = runImageAutoTagging({
      caption: "a pile of oranges sitting on top of a counter",
      classifierConcepts: [
        { label: "fruit", score: 0.28 },
        { label: "orange fruit", score: 0.24 },
        { label: "food", score: 0.14 },
        { label: "indoor scene", score: 0.12 },
      ],
    });

    expect(result.autoTags).toContain("fruit");
    expect(result.autoTags).not.toContain("food");
  });

  it("lets caption scene tags beat generic classifier scene drift", () => {
    const result = runImageAutoTagging({
      caption: "a beach with a distant river view",
      classifierConcepts: [
        { label: "beach", score: 0.24 },
        { label: "river", score: 0.18 },
        { label: "outdoor scene", score: 0.16 },
      ],
    });

    expect(result.autoTags).toContain("beach");
    expect(result.autoTags).toContain("river");
    expect(result.autoTags).not.toContain("outdoors");
  });

  it("does not turn traffic sign evidence into paper documents", () => {
    const result = runImageAutoTagging({
      caption: "a road with a road sign on it",
      classifierConcepts: [
        { label: "road", score: 0.22 },
        { label: "traffic sign", score: 0.2 },
        { label: "paper document", score: 0.12 },
      ],
    });

    expect(result.autoTags).toContain("road");
    expect(result.autoTags).not.toContain("paper-document");
  });

  it("suppresses broader food tags when fruit wins", () => {
    const result = runImageAutoTagging({
      caption: "an apple on a table",
      classifierConcepts: [
        { label: "fruit", score: 0.3, familyId: "broad", stage: "broad" },
        { label: "food", score: 0.26, familyId: "broad", stage: "broad" },
        { label: "apple", score: 0.27, familyId: "food", stage: "family" },
        { label: "bread", score: 0.11, familyId: "food", stage: "family" },
      ],
    });

    expect(result.autoTags).toContain("fruit");
    expect(result.autoTags).not.toContain("food");
  });

  it("allows classifier support to add a specific tag the caption missed", () => {
    const result = runImageAutoTagging({
      caption: "a rider going down a hill",
      classifierConcepts: [
        { label: "outdoor scene", score: 0.3, familyId: "broad", stage: "broad" },
        { label: "vehicle", score: 0.24, familyId: "broad", stage: "broad" },
        { label: "hill", score: 0.27, familyId: "nature", stage: "family" },
        { label: "dirt bike", score: 0.26, familyId: "transport", stage: "family" },
      ],
    });

    expect(result.autoTags).toContain("transport");
    expect(result.autoTags).toContain("hill");
  });

  it("prefers caption truth over wrong classifier guesses", () => {
    const result = runImageAutoTagging({
      caption: "a distant hillside with a valley view",
      classifierConcepts: [
        { label: "vehicle", score: 0.28, familyId: "broad", stage: "broad" },
        { label: "city", score: 0.26, familyId: "broad", stage: "broad" },
      ],
    });

    expect(result.autoTags).toContain("hill");
    expect(result.autoTags).not.toContain("transport");
    expect(result.autoTags).not.toContain("city");
  });

  it("falls back to classifier tags when the caption path has nothing useful", () => {
    const result = runImageAutoTagging({
      caption: "",
      classifierConcepts: [
        { label: "castle", score: 0.31, familyId: "places", stage: "family" },
        { label: "river", score: 0.28, familyId: "nature", stage: "family" },
      ],
    });

    expect(result.autoTags).toContain("castle");
  });
});

describe("runImageAutoTaggingFromCandidates", () => {
  it("keeps the caption fallback conservative", () => {
    const result = runImageAutoTaggingFromCandidates([
      { matchedTerms: ["croissant"], score: 24, tagId: "croissant" },
      { matchedTerms: ["plate"], score: 18, tagId: "plate" },
    ]);

    expect(result.autoTags).toContain("food");
    expect(result.autoTags).not.toContain("croissant");
  });
});
