import { describe, expect, it } from "vitest";

import { runImageAutoTagging, runImageAutoTaggingFromCandidates } from "./runImageAutoTagging";

describe("runImageAutoTagging", () => {
  it("prefers classifier evidence for fruit-style subjects", () => {
    const result = runImageAutoTagging({
      caption: "a pile of oranges sitting on top of a counter",
      classifierConcepts: [
        { label: "fruit", score: 0.28 },
        { label: "lemon", score: 0.24 },
        { label: "food", score: 0.14 },
        { label: "room", score: 0.12 },
      ],
    });

    expect(result.autoTags).toContain("fruit");
    expect(result.autoTags).not.toContain("room");
  });

  it("promotes beach over generic terrain when the scene evidence stacks up", () => {
    const result = runImageAutoTagging({
      caption: "a beach with a bunch of animals on it",
      classifierConcepts: [
        { label: "beach", score: 0.24 },
        { label: "sand", score: 0.21 },
        { label: "coast", score: 0.18 },
        { label: "animal", score: 0.16 },
      ],
    });

    expect(result.autoTags).toContain("beach");
    expect(result.autoTags).not.toContain("terrain");
  });

  it("does not turn traffic sign evidence into paper documents", () => {
    const result = runImageAutoTagging({
      caption: "a road with a road sign on it",
      classifierConcepts: [
        { label: "road", score: 0.22 },
        { label: "traffic sign", score: 0.2 },
        { label: "paper document", score: 0.04 },
      ],
    });

    expect(result.autoTags).toContain("road");
    expect(result.autoTags).not.toContain("paper-document");
  });

  it("falls back to caption candidates when classifier evidence is absent", () => {
    const result = runImageAutoTagging({
      caption: "a stone castle beside a river",
      classifierConcepts: [],
    });

    expect(result.autoTags).toContain("building");
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
