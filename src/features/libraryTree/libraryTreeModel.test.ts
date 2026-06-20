import { describe, expect, it } from "vitest";

import { libraryNodeTemplates, type LibraryNodeTemplate } from "../../libraryCatalog";
import type { Asset, VirtualFolder } from "../../app/appTypes";
import {
  getAssetPlacementSuggestions,
  getAddFolderSuggestions,
  getNewChildPlacementSuggestions,
  insertFolder,
  libraryNodeIncludesAsset,
  rankTemplateForParentSuggestion,
  setFolderAssetAssignment,
  setFolderAssetExclusion,
} from "./libraryTreeModel";

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

function createAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    name: "mysterious-file",
    path: "C:\\test\\odd\\mysterious-file.bin",
    type: "Archive",
    extension: "bin",
    size: "1 KB",
    sizeBytes: 1024,
    modified: "",
    modifiedUnix: null,
    defaultKeptTags: [],
    keptTags: [],
    systemTags: [],
    tags: [],
    userTags: [],
    notes: "",
    color: "",
    ...overrides,
  };
}

describe("library tree add-folder suggestions", () => {
  it("treats the Library root as a catch-all for every asset", () => {
    const libraryFolder = createFolder("library");

    expect(libraryNodeIncludesAsset(libraryFolder, createAsset())).toBe(true);
  });

  it("prefers descendants from a taxonomy parent over unrelated branches", () => {
    const parentTemplate = getTemplate("tag:objects");
    const clothingTemplate = getTemplate("tag:objects/clothing");
    const animalsTemplate = getTemplate("tag:animals");

    expect(rankTemplateForParentSuggestion(clothingTemplate, parentTemplate, "")).toBeLessThan(
      rankTemplateForParentSuggestion(animalsTemplate, parentTemplate, ""),
    );
  });

  it("keeps generated same-branch templates ahead of generic fallback templates", () => {
    const parentTemplate = getTemplate("tag:natural-world");
    const treesTemplate = getTemplate("tag:natural-world/trees");
    const animalsTemplate = getTemplate("tag:animals");

    expect(rankTemplateForParentSuggestion(treesTemplate, parentTemplate, "")).toBeLessThan(
      rankTemplateForParentSuggestion(animalsTemplate, parentTemplate, ""),
    );
  });

  it("keeps earlier top-level taxonomy groups ahead of later ones in the add-folder panel", () => {
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, createParentFolder("library"), "");
    const peopleIndex = suggestions.findIndex((suggestion) => suggestion.name === "People");
    const animalsIndex = suggestions.findIndex((suggestion) => suggestion.name === "Animals");

    expect(peopleIndex).toBeGreaterThan(-1);
    expect(animalsIndex).toBeGreaterThan(-1);
    expect(peopleIndex).toBeLessThan(animalsIndex);
  });

  it("does not suggest a child folder that already exists under the selected parent", () => {
    const parentFolder = createFolder("library", [createFolder("tag:people")]);
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, parentFolder, "", [parentFolder]);

    expect(suggestions.some((suggestion) => suggestion.name === "People")).toBe(false);
  });

  it("surfaces branch descendants once that branch has been started under the current parent", () => {
    const parentFolder = createFolder("library", [createFolder("tag:objects")]);
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, parentFolder, "", [parentFolder]);
    const clothingIndex = suggestions.findIndex((suggestion) => suggestion.name === "Clothing");

    expect(clothingIndex).toBeGreaterThan(-1);
  });

  it("does not invent custom folder names from asset filenames in placement suggestions", () => {
    const suggestions = getNewChildPlacementSuggestions(
      createFolder("library"),
      createAsset({
        name: "bank_unequip_all",
        path: "C:\\test\\ui\\bank_unequip_all.png",
        type: "Image",
        extension: "png",
      }),
      [createFolder("library")],
    );

    expect(suggestions.some((suggestion) => suggestion.target === "new" && suggestion.path.join(" / ").includes("Bank Unequip"))).toBe(false);
  });

  it("does not suggest a root folder that already exists at the top level", () => {
    const rootFolders = [createFolder("tag:people")];
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, null, "", rootFolders);

    expect(suggestions.some((suggestion) => suggestion.name === "People")).toBe(false);
  });

  it("keeps deeper descendants out of the first root page until their umbrella exists", () => {
    const rootFolders: VirtualFolder[] = [];
    const suggestions = getAddFolderSuggestions(libraryNodeTemplates, null, "", rootFolders);
    const foodIndex = suggestions.findIndex((suggestion) => suggestion.name === "Food");

    expect(foodIndex).toBeGreaterThan(-1);
    expect(suggestions.some((suggestion) => suggestion.name === "Clothing")).toBe(false);
  });

  it("can insert a new child folder under a parent without mutating unrelated branches", () => {
    const parentFolder = createFolder("tag:objects");
    const siblingFolder = createFolder("tag:people");
    const newChild = createFolder("tag:objects/clothing");

    const nextFolders = insertFolder([parentFolder, siblingFolder], parentFolder.id, newChild);
    const updatedParent = nextFolders.find((folder) => folder.id === parentFolder.id);
    const untouchedSibling = nextFolders.find((folder) => folder.id === siblingFolder.id);

    expect(updatedParent?.children.map((child) => child.id)).toContain(newChild.id);
    expect(untouchedSibling).toEqual(siblingFolder);
  });

  it("can add and remove a manual asset assignment for undoable placement", () => {
    const folder = createFolder("tag:objects");
    const assetId = 42;

    const assignedFolders = setFolderAssetAssignment([folder], folder.id, assetId, true);
    const clearedFolders = setFolderAssetAssignment(assignedFolders, folder.id, assetId, false);

    expect(assignedFolders[0].assetIds).toContain(assetId);
    expect(clearedFolders[0].assetIds).not.toContain(assetId);
  });

  it("can exclude a rule-matched asset from a node", () => {
    const folder = createFolder("library");
    const asset = createAsset();
    const excludedFolders = setFolderAssetExclusion([folder], folder.id, asset.id, true);

    expect(libraryNodeIncludesAsset(excludedFolders[0], asset)).toBe(false);
  });

  it("keeps suggesting deeper children for assets already placed inside a nested node", () => {
    const clothingFolder = {
      ...createFolder("tag:objects/clothing"),
      assetIds: [1],
    };
    const objectsFolder = {
      ...createFolder("tag:objects", [clothingFolder]),
      assetIds: [1],
      children: [clothingFolder],
    };
    const asset = createAsset({
      name: "shirt",
      path: "C:\\test\\objects\\shirt.png",
      type: "Image",
      extension: "png",
    });

    const suggestions = getAssetPlacementSuggestions(asset, [objectsFolder], [asset]);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((suggestion) => suggestion.path.includes("Clothing") || suggestion.path.includes("Objects"))).toBe(true);
  });
});
