import { describe, expect, it } from "vitest";

import { libraryNodeTemplates, type LibraryNodeTemplate } from "../../libraryCatalog";
import type { Asset, ScannedAsset, VirtualFolder } from "../../app/appTypes";
import {
  createDefaultTopLevelLibraryNodesForAssets,
  getAssetPlacementConfidence,
  getAssetPlacementSuggestions,
  getAddFolderSuggestions,
  getDirectAssetsForLibraryNodePath,
  getNewChildPlacementSuggestions,
  getNewAssetPlacementSuggestions,
  getPreferredNewAssetPlacementSuggestion,
  insertFolder,
  libraryNodeIncludesAsset,
  rankTemplateForParentSuggestion,
  scoreAssetPlacementTerms,
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
    analysisCaption: "",
    analysisError: "",
    analysisStatus: "idle",
    analysisSuggestedTags: [],
    analysisVersion: 0,
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

function createScannedAsset(overrides: Partial<ScannedAsset> = {}): ScannedAsset {
  return {
    id: 1,
    name: "mysterious-file",
    path: "C:\\test\\odd\\mysterious-file.bin",
    file_type: "Archive",
    extension: "bin",
    size_bytes: 1024,
    modified_unix: null,
    kept_tags: [],
    tags: [],
    notes: "",
    ...overrides,
  };
}

describe("library tree add-folder suggestions", () => {
  it("treats the Library root as a catch-all for every asset", () => {
    const libraryFolder = createFolder("library");

    expect(libraryNodeIncludesAsset(libraryFolder, createAsset())).toBe(true);
  });

  it("does not seed a legacy Library wrapper for new inventories", () => {
    const folders = createDefaultTopLevelLibraryNodesForAssets([
      createScannedAsset({
        name: "chicken",
        path: "C:\\test\\animals\\chicken.png",
        file_type: "Image",
        extension: "png",
        tags: ["chicken", "bird", "animal"],
      }),
    ]);

    expect(folders).toHaveLength(1);
    expect(folders[0]?.name).toBe("Animals");
    expect(folders[0]?.children.map((child) => child.name)).toContain("Birds");
  });

  it("groups multiple starter assets into stable top-level branches", () => {
    const folders = createDefaultTopLevelLibraryNodesForAssets([
      createScannedAsset({
        id: 1,
        name: "sparrow",
        path: "C:\\test\\animals\\birds\\sparrow.png",
        file_type: "Image",
        extension: "png",
        tags: ["sparrow", "bird", "animal"],
      }),
      createScannedAsset({
        id: 2,
        name: "oak-tree",
        path: "C:\\test\\nature\\trees\\oak-tree.png",
        file_type: "Image",
        extension: "png",
        tags: ["oak", "tree", "forest", "nature"],
      }),
      createScannedAsset({
        id: 3,
        name: "rose",
        path: "C:\\test\\nature\\flowers\\rose.png",
        file_type: "Image",
        extension: "png",
        tags: ["rose", "flower", "plant", "nature"],
      }),
    ]);

    expect(folders.map((folder) => folder.name)).toEqual(expect.arrayContaining(["Animals", "Natural World"]));
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

  it("does not rank an ancestor template as a child suggestion within its own branch", () => {
    const naturalMaterialsTemplate = getTemplate("tag:materials/natural-materials");
    const materialsTemplate = getTemplate("tag:materials");

    expect(rankTemplateForParentSuggestion(materialsTemplate, naturalMaterialsTemplate, "")).toBeGreaterThanOrEqual(600);
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

  it("prefers birds over food branches for a plain chicken inside animals", () => {
    const animalsFolder = createFolder("tag:animals");
    const suggestions = getNewChildPlacementSuggestions(
      animalsFolder,
      createAsset({
        name: "chicken",
        path: "C:\\test\\animals\\chicken.png",
        type: "Image",
        extension: "png",
        tags: ["chicken", "bird", "farm-animal", "animal"],
      }),
      [animalsFolder],
    );

    expect(suggestions.some((suggestion) => suggestion.path[suggestion.path.length - 1] === "Birds")).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.path.includes("Animal Products"))).toBe(false);
    const birdsIndex = suggestions.findIndex((suggestion) => suggestion.path[suggestion.path.length - 1] === "Birds");
    const mammalsIndex = suggestions.findIndex((suggestion) => suggestion.path[suggestion.path.length - 1] === "Mammals");
    const fishIndex = suggestions.findIndex((suggestion) => suggestion.path[suggestion.path.length - 1] === "Fish");

    expect(birdsIndex).toBe(0);
    expect(mammalsIndex === -1 || birdsIndex < mammalsIndex).toBe(true);
    expect(fishIndex === -1 || birdsIndex < fishIndex).toBe(true);
  });

  it("scores path evidence above generic tag-only placement clues", () => {
    const asset = createAsset({
      name: "asset-01",
      path: "C:\\test\\aviary\\birds\\asset-01.png",
      type: "Image",
      extension: "png",
      tags: ["animal"],
    });

    const pathScore = scoreAssetPlacementTerms(asset, [["bird", 28]], 1);
    const genericTagScore = scoreAssetPlacementTerms(asset, [["animal", 28]], 1);

    expect(pathScore?.score ?? 0).toBeGreaterThan(genericTagScore?.score ?? 0);
  });

  it("keeps generic tag-only matches below stronger same-branch suggestions", () => {
    const animalsFolder = createFolder("tag:animals");
    const suggestions = getNewChildPlacementSuggestions(
      animalsFolder,
      createAsset({
        name: "asset-01",
        path: "C:\\test\\animals\\birds\\asset-01.png",
        type: "Image",
        extension: "png",
        tags: ["animal"],
      }),
      [animalsFolder],
    );

    const birdsIndex = suggestions.findIndex((suggestion) => suggestion.path[suggestion.path.length - 1] === "Birds");
    const mammalsIndex = suggestions.findIndex((suggestion) => suggestion.path[suggestion.path.length - 1] === "Mammals");

    expect(birdsIndex).toBeGreaterThan(-1);
    expect(mammalsIndex === -1 || birdsIndex < mammalsIndex).toBe(true);
  });

  it("does not let document tags satisfy the Materials umbrella by substring alone", () => {
    const materialsFolder = createFolder("tag:materials");
    const asset = createAsset({
      name: "icon",
      path: "C:\\test\\ui\\icon.svg",
      type: "Image",
      extension: "svg",
      systemTags: ["image", "paper-document"],
      tags: ["image", "paper-document"],
    });

    expect(libraryNodeIncludesAsset(materialsFolder, asset)).toBe(false);
  });

  it("maps placement scores into readable confidence bands", () => {
    expect(getAssetPlacementConfidence(92)).toBe("high");
    expect(getAssetPlacementConfidence(56)).toBe("medium");
    expect(getAssetPlacementConfidence(34)).toBe("low");
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

  it("suggests new root nodes for assets when the library tree is still empty", () => {
    const asset = createAsset({
      name: "chicken",
      path: "C:\\test\\animals\\chicken.png",
      type: "Image",
      extension: "png",
      tags: ["chicken", "bird", "animal"],
    });

    const suggestions = getAssetPlacementSuggestions(asset, [], [asset]);

    expect(suggestions.some((suggestion) => suggestion.target === "new" && suggestion.parentFolderId === null)).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.path[0] === "Animals")).toBe(true);
  });

  it("prefers the strongest new-node placement for manual creation from an asset", () => {
    const asset = createAsset({
      name: "chicken",
      path: "C:\\test\\animals\\chicken.png",
      type: "Image",
      extension: "png",
      tags: ["chicken", "bird", "animal"],
    });

    const suggestions = getAssetPlacementSuggestions(asset, [], [asset]);
    const preferredSuggestion = getPreferredNewAssetPlacementSuggestion(suggestions);

    expect(preferredSuggestion?.target).toBe("new");
    expect(preferredSuggestion?.draft?.name).toBe("Animals");
  });

  it("keeps a small ordered set of new-node placements for asset-aware panel choices", () => {
    const asset = createAsset({
      name: "chicken",
      path: "C:\\test\\animals\\chicken.png",
      type: "Image",
      extension: "png",
      tags: ["chicken", "bird", "animal"],
    });

    const suggestions = getAssetPlacementSuggestions(asset, [], [asset]);
    const newSuggestions = getNewAssetPlacementSuggestions(suggestions, 3);

    expect(newSuggestions.length).toBeGreaterThan(0);
    expect(newSuggestions.every((suggestion) => suggestion.target === "new" && suggestion.draft)).toBe(true);
    expect(newSuggestions[0]?.draft?.name).toBe("Animals");
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

  it("lets exact custom node names inherit catalog tag implications", () => {
    const forestFolder: VirtualFolder = {
      id: "vf-custom-forest",
      name: "Forest",
      assetIds: [],
      children: [],
    };
    const treeAsset = createAsset({
      name: "oak-tree",
      path: "C:\\test\\nature\\oak-tree.png",
      type: "Image",
      extension: "png",
      tags: ["tree"],
    });

    expect(libraryNodeIncludesAsset(forestFolder, treeAsset)).toBe(true);
  });

  it("lets custom habitat nodes discover specific tags through safe matches", () => {
    const forestFolder: VirtualFolder = {
      id: "vf-custom-forest-specific",
      name: "Forest",
      assetIds: [],
      children: [],
    };
    const pineAsset = createAsset({
      name: "pine",
      path: "C:\\test\\nature\\pine.png",
      type: "Image",
      extension: "png",
      tags: ["pine-tree"],
    });

    expect(libraryNodeIncludesAsset(forestFolder, pineAsset)).toBe(true);
  });

  it("lets custom node names match source folder names without turning them into tags", () => {
    const radiantCityFolder: VirtualFolder = {
      id: "vf-custom-radiant-city",
      name: "Radiant City",
      assetIds: [],
      children: [],
    };
    const iconAsset = createAsset({
      name: "icon",
      path: "C:\\Users\\brigh\\Documents\\Radiant City\\ui\\icon.svg",
      type: "Image",
      extension: "svg",
      tags: ["image", "icon"],
      systemTags: ["image", "icon"],
    });

    expect(libraryNodeIncludesAsset(radiantCityFolder, iconAsset)).toBe(true);
  });

  it("refreshes stale custom node content rules from current semantics", () => {
    const forestFolder: VirtualFolder = {
      id: "vf-custom-forest-stale",
      name: "Forest",
      assetIds: [],
      children: [],
      rules: [{ field: "name", operator: "contains", value: "forest" }],
    };
    const treeAsset = createAsset({
      name: "oak-tree",
      path: "C:\\test\\nature\\oak-tree.png",
      type: "Image",
      extension: "png",
      tags: ["tree"],
    });

    expect(libraryNodeIncludesAsset(forestFolder, treeAsset)).toBe(true);
  });

  it("lets forest custom nodes recognize forest-biased tree species", () => {
    const forestFolder: VirtualFolder = {
      id: "vf-custom-forest-species",
      name: "Forest",
      assetIds: [],
      children: [],
    };
    const pineAsset = createAsset({
      name: "pine",
      path: "C:\\test\\nature\\pine.png",
      type: "Image",
      extension: "png",
      tags: ["pine-tree", "tree", "forest"],
    });

    expect(libraryNodeIncludesAsset(forestFolder, pineAsset)).toBe(true);
  });

  it("lets swamp custom nodes recognize mangrove trees", () => {
    const swampFolder: VirtualFolder = {
      id: "vf-custom-swamp",
      name: "Swamp",
      assetIds: [],
      children: [],
    };
    const mangroveAsset = createAsset({
      name: "mangrove",
      path: "C:\\test\\nature\\mangrove.png",
      type: "Image",
      extension: "png",
      tags: ["mangrove-tree", "tree", "swamp"],
    });

    expect(libraryNodeIncludesAsset(swampFolder, mangroveAsset)).toBe(true);
  });

  it("lets custom farm animal nodes discover specific livestock tags", () => {
    const farmAnimalFolder: VirtualFolder = {
      id: "vf-custom-farm-animal",
      name: "Farm Animal",
      assetIds: [],
      children: [],
    };
    const chickenAsset = createAsset({
      name: "chicken",
      path: "C:\\test\\animals\\chicken.png",
      type: "Image",
      extension: "png",
      tags: ["chicken"],
    });

    expect(libraryNodeIncludesAsset(farmAnimalFolder, chickenAsset)).toBe(true);
  });

  it("does not let broad implied environments leak through custom node matching", () => {
    const islandFolder: VirtualFolder = {
      id: "vf-custom-island",
      name: "Island",
      assetIds: [],
      children: [],
    };
    const waterAsset = createAsset({
      name: "water-bottle",
      path: "C:\\test\\objects\\water-bottle.png",
      type: "Image",
      extension: "png",
      tags: ["water"],
    });

    expect(libraryNodeIncludesAsset(islandFolder, waterAsset)).toBe(false);
  });

  it("assigns ambiguous assets to a single top-level sibling branch", () => {
    const forestFolder: VirtualFolder = {
      id: "vf-custom-forest-root",
      name: "Forest",
      assetIds: [],
      children: [],
    };
    const jungleFolder: VirtualFolder = {
      id: "vf-custom-jungle-root",
      name: "Jungle",
      assetIds: [],
      children: [],
    };
    const treeAsset = createAsset({
      id: 10,
      name: "tree",
      path: "C:\\test\\nature\\tree.png",
      type: "Image",
      extension: "png",
      tags: ["tree"],
    });

    const forestAssets = getDirectAssetsForLibraryNodePath([forestFolder, jungleFolder], forestFolder.id, [treeAsset]);
    const jungleAssets = getDirectAssetsForLibraryNodePath([forestFolder, jungleFolder], jungleFolder.id, [treeAsset]);

    expect(forestAssets.map((asset) => asset.id)).toContain(treeAsset.id);
    expect(jungleAssets.map((asset) => asset.id)).not.toContain(treeAsset.id);
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
