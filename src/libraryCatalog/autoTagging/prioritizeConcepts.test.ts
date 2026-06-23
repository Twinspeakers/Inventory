import { describe, expect, it } from "vitest";

import { prioritizeImageClassifierConcepts } from "./prioritizeConcepts";

describe("prioritizeImageClassifierConcepts", () => {
  it("groups multiple beach-style cues into a primary beach concept", () => {
    const concepts = prioritizeImageClassifierConcepts([
      { label: "beach", score: 0.24 },
      { label: "sand", score: 0.22 },
      { label: "coast", score: 0.19 },
      { label: "animal", score: 0.14 },
    ]);

    expect(concepts[0]?.mappedTagId).toBe("beach");
    expect(concepts[0]?.regionRole).toBe("primary");
    expect(concepts[0]?.rawLabels).toEqual(expect.arrayContaining(["beach", "sand", "coast"]));
  });

  it("keeps strong subject evidence ahead of context clutter", () => {
    const concepts = prioritizeImageClassifierConcepts([
      { label: "cat", score: 0.23 },
      { label: "animal", score: 0.21 },
      { label: "grass", score: 0.2 },
      { label: "plant", score: 0.18 },
    ]);

    expect(concepts[0]?.mappedTagId).toBe("animal");
    expect(concepts[0]?.regionRole).toBe("primary");
    expect(concepts.some((concept) => concept.mappedTagId === "plant-life")).toBe(true);
  });
});
