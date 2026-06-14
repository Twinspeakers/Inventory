import { describe, expect, it } from "vitest";

import { libraryTagDefinitions } from ".";

describe("library tag definitions", () => {
  it("has unique tag ids", () => {
    const ids = libraryTagDefinitions.map((tagDefinition) => tagDefinition.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every tag searchable by a label", () => {
    for (const tagDefinition of libraryTagDefinitions) {
      expect(tagDefinition.id.trim()).toBeTruthy();
      expect(tagDefinition.label.trim()).toBeTruthy();
    }
  });

  it("does not include empty relationship values", () => {
    for (const tagDefinition of libraryTagDefinitions) {
      for (const value of [
        ...(tagDefinition.aliases ?? []),
        ...(tagDefinition.parents ?? []),
        ...(tagDefinition.implies ?? []),
        ...(tagDefinition.related ?? []),
      ]) {
        expect(value.trim()).toBeTruthy();
      }
    }
  });
});
