import { describe, expect, it } from "vitest";

import { libraryNodeTemplates, type LibraryNodeTemplate } from "../../libraryCatalog";
import type { VirtualFolder } from "../../app/appTypes";
import { getAddFolderSuggestions, rankTemplateForParentSuggestion } from "./libraryTreeModel";

function getTemplate(templateId: string) {
  const template = libraryNodeTemplates.find((candidate) => candidate.id === templateId);

  expect(template, `Expected template ${templateId} to exist in the visible library node catalog.`).toBeTruthy();
  return template as LibraryNodeTemplate;
}

function createParentFolder(templateId: string): VirtualFolder {
  const template = getTemplate(templateId);

  return {
    id: `vf-${templateId}`,
    name: template.name,
    assetIds: [],
    children: [],
    templateId,
  };
}

function createFolder(templateId: string, children: VirtualFolder[] = []): VirtualFolder {
  const template = getTemplate(templateId);

  return {
    id: `vf-${templateId}-${children.length}`,
    name: template.name,
    assetIds: [],
    children,
    templateId,
  };
}

describe("library tree add-folder suggestions", () => {
  it("prefers descendants from a manual parent's explicit tag scopes", () => {
    const parentTemplate = getTemplate("3d-objects");
    const clothingTemplate = getTemplate("tag:objects/clothing");
    const imagesTemplate = getTemplate("images");

    expect(rankTemplateForParentSuggestion(clothingTemplate, parentTemplate, "")).toBeLessThan(
      rankTemplateForParentSuggestion(imagesTemplate, parentTemplate, ""),
    );
  });

  it("keeps generated same-branch templates ahead of generic fallback templates", () => {
    const parentTemplate = getTemplate("tag:natural-world");
    const treesTemplate = getTemplate("tag:natural-world/trees");
    const imagesTemplate = getTemplate("images");

    expect(rankTemplateForParentSuggestion(treesTemplate, parentTemplate, "")).toBeLessThan(
      rankTemplateForParentSuggestion(imagesTemplate, parentTemplate, ""),
    );
  });

  it("keeps earlier scoped descendant groups ahead of later ones in the add-folder panel", () => {
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, createParentFolder("3d-objects"), "");
    const ageGroupIndex = suggestions.findIndex((suggestion) => suggestion.name === "Age Groups");
    const amphibiansIndex = suggestions.findIndex((suggestion) => suggestion.name === "Amphibians");

    expect(ageGroupIndex).toBeGreaterThan(-1);
    expect(amphibiansIndex).toBeGreaterThan(-1);
    expect(ageGroupIndex).toBeLessThan(amphibiansIndex);
  });

  it("does not suggest a child folder that already exists under the selected parent", () => {
    const parentFolder = createFolder("3d-objects", [createFolder("tag:people")]);
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, parentFolder, "", [parentFolder]);

    expect(suggestions.some((suggestion) => suggestion.name === "People")).toBe(false);
  });

  it("surfaces branch descendants once that branch has been started under the current parent", () => {
    const parentFolder = createFolder("3d-objects", [createFolder("tag:objects")]);
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, parentFolder, "", [parentFolder]);
    const clothingIndex = suggestions.findIndex((suggestion) => suggestion.name === "Clothing");

    expect(clothingIndex).toBeGreaterThan(-1);
  });

  it("does not suggest a root folder that already exists at the top level", () => {
    const rootFolders = [createFolder("tag:people")];
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, null, "", rootFolders);

    expect(suggestions.some((suggestion) => suggestion.name === "People")).toBe(false);
  });

  it("keeps deeper descendants out of the first root page until their umbrella exists", () => {
    const rootFolders = [createFolder("tag:objects")];
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, null, "", rootFolders);
    const foodIndex = suggestions.findIndex((suggestion) => suggestion.name === "Food");

    expect(foodIndex).toBeGreaterThan(-1);
    expect(suggestions.some((suggestion) => suggestion.name === "Clothing")).toBe(false);
  });
});
