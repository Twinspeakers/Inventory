import { describe, expect, it } from "vitest";

import { prioritizeImageClassifierConcepts } from "./prioritizeConcepts";

describe("prioritizeImageClassifierConcepts", () => {
  it("groups multiple building cues into a primary building concept", () => {
    const concepts = prioritizeImageClassifierConcepts([
      { label: "castle", score: 0.24 },
      { label: "house", score: 0.22 },
      { label: "bridge", score: 0.19 },
      { label: "animal", score: 0.14 },
    ]);

    expect(concepts[0]?.mappedTagId).toBe("castle");
    expect(concepts[0]?.regionRole).toBe("primary");
    expect(concepts.some((concept) => concept.mappedTagId === "house")).toBe(true);
    expect(concepts.some((concept) => concept.mappedTagId === "bridge")).toBe(true);
  });

  it("keeps strong specific subject evidence ahead of broader clutter", () => {
    const concepts = prioritizeImageClassifierConcepts([
      { label: "cat", score: 0.23 },
      { label: "animal", score: 0.21 },
      { label: "grass", score: 0.2 },
      { label: "plant", score: 0.18 },
    ]);

    expect(concepts[0]?.mappedTagId).toBe("cat");
    expect(concepts[0]?.regionRole).toBe("primary");
    expect(concepts.some((concept) => concept.mappedTagId === "animal")).toBe(true);
  });
});
