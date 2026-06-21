import { describe, expect, it } from "vitest";

import type { ScannedAsset, VirtualFolder } from "../../app/appTypes";
import { getAssetTagSuggestions } from "../../features/libraryTree/libraryTreeModel";
import { toAsset } from "./index";

function createScannedAsset(overrides: Partial<ScannedAsset> = {}): ScannedAsset {
  return {
    id: 1,
    name: "guide",
    path: "C:/library/guide.pdf",
    file_type: "Document",
    extension: "pdf",
    size_bytes: 1024,
    modified_unix: 1_700_000_000,
    ...overrides,
  };
}

describe("tag inference", () => {
  it("keeps automatic file tags inside the library vocabulary", () => {
    const asset = toAsset(
      createScannedAsset({
        name: "ui button click",
        path: "C:/library/ui-button-click.wav",
        file_type: "Audio",
        extension: "wav",
      }),
    );

    expect(asset.systemTags).toContain("audio");
    expect(asset.systemTags).not.toContain("wav");
    expect(asset.systemTags).not.toContain("sfx");
  });

  it("canonicalizes known aliases to library tag ids", () => {
    const asset = toAsset(createScannedAsset());

    expect(asset.systemTags).toContain("document");
    expect(asset.systemTags).not.toContain("pdf");
  });

  it("keeps model inspector style tags when they exist in the library", () => {
    const asset = toAsset(createScannedAsset({
      name: "crate",
      path: "C:/library/crate.glb",
      file_type: "3D",
      extension: "glb",
    }), {
      status: "ready",
      info: {
        boundsCenter: { x: 0, y: 0, z: 0 },
        dimensions: { x: 1, y: 1, z: 1 },
        materialCount: 1,
        meshCount: 1,
        nodeCount: 1,
        rootTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        triangleCount: 1_200,
        vertexCount: 3_600,
      },
    });

    expect(asset.systemTags).toContain("3d");
    expect(asset.systemTags).toContain("low poly");
  });

  it("does not explode a lamp post model into unrelated decor and material tags", () => {
    const asset = toAsset(createScannedAsset({
      name: "old-lamp-post",
      path: "C:/library/old-lamp-post.glb",
      file_type: "3D",
      extension: "glb",
    }), {
      status: "ready",
      info: {
        boundsCenter: { x: 0, y: 0, z: 0 },
        dimensions: { x: 1, y: 4, z: 1 },
        materialCount: 1,
        meshCount: 1,
        nodeCount: 1,
        rootTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        triangleCount: 2_000,
        vertexCount: 6_000,
      },
    });

    expect(asset.systemTags).toContain("3d");
    expect(asset.systemTags).toContain("low poly");
    expect(asset.systemTags).toContain("lighting");
    expect(asset.systemTags).toContain("prop");
    expect(asset.systemTags).not.toContain("candle");
    expect(asset.systemTags).not.toContain("curtain");
    expect(asset.systemTags).not.toContain("rug");
    expect(asset.systemTags).not.toContain("fireplace");
    expect(asset.systemTags).not.toContain("fabric");
    expect(asset.systemTags).not.toContain("material");
    expect(asset.systemTags).not.toContain("building");
    expect(asset.systemTags).not.toContain("architecture");
    expect(asset.systemTags).not.toContain("fire");
  });

  it("does not turn an anvil model into a person role chain", () => {
    const asset = toAsset(createScannedAsset({
      name: "anvil",
      path: "C:/library/anvil.glb",
      file_type: "3D",
      extension: "glb",
    }), {
      status: "ready",
      info: {
        boundsCenter: { x: 0, y: 0, z: 0 },
        dimensions: { x: 1, y: 1, z: 1 },
        materialCount: 1,
        meshCount: 1,
        nodeCount: 1,
        rootTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        triangleCount: 8_000,
        vertexCount: 24_000,
      },
    });

    expect(asset.systemTags).toContain("anvil");
    expect(asset.systemTags).toContain("metalworking");
    expect(asset.systemTags).toContain("prop");
    expect(asset.systemTags).not.toContain("role");
    expect(asset.systemTags).not.toContain("person");
  });

  it("keeps plain chicken assets on the animal side by default", () => {
    const asset = toAsset(createScannedAsset({
      name: "chicken",
      path: "C:/library/animals/chicken.glb",
      file_type: "3D",
      extension: "glb",
    }));

    expect(asset.systemTags).toContain("chicken");
    expect(asset.systemTags).toContain("bird");
    expect(asset.systemTags).toContain("animal");
    expect(asset.systemTags).not.toContain("chicken meat");
    expect(asset.systemTags).not.toContain("poultry");
    expect(asset.systemTags).not.toContain("food");
  });

  it("unlocks food-side chicken tags when there is cooking evidence", () => {
    const asset = toAsset(createScannedAsset({
      name: "roast-chicken",
      path: "C:/library/food/roast-chicken.glb",
      file_type: "3D",
      extension: "glb",
    }));

    expect(asset.systemTags).toContain("chicken meat");
    expect(asset.systemTags).toContain("poultry");
    expect(asset.systemTags).toContain("food");
    expect(asset.systemTags).not.toContain("bird");
  });

  it("keeps plain salmon assets on the fish side by default", () => {
    const asset = toAsset(createScannedAsset({
      name: "salmon",
      path: "C:/library/animals/salmon.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("freshwater fish");
    expect(asset.systemTags).toContain("fish");
    expect(asset.systemTags).not.toContain("salmon fillet");
    expect(asset.systemTags).not.toContain("seafood");
    expect(asset.systemTags).not.toContain("food");
  });

  it("treats orange shirt assets as color-first instead of fruit-first", () => {
    const asset = toAsset(createScannedAsset({
      name: "orange-shirt",
      path: "C:/library/clothing/orange-shirt.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("orange color");
    expect(asset.systemTags).not.toContain("orange");
    expect(asset.systemTags).not.toContain("fruit");
    expect(asset.systemTags).not.toContain("food");
  });

  it("keeps plain tuna assets on the fish side by default", () => {
    const asset = toAsset(createScannedAsset({
      name: "tuna",
      path: "C:/library/animals/tuna.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("ocean fish");
    expect(asset.systemTags).toContain("fish");
    expect(asset.systemTags).not.toContain("food");
  });

  it("treats gaming mouse assets as devices instead of rodents", () => {
    const asset = toAsset(createScannedAsset({
      name: "gaming-mouse",
      path: "C:/library/hardware/gaming-mouse.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("mouse device");
    expect(asset.systemTags).not.toContain("rodent");
    expect(asset.systemTags).not.toContain("animal");
  });

  it("treats blueprint sheets as documents instead of style-first", () => {
    const asset = toAsset(createScannedAsset({
      name: "house-blueprint-sheet",
      path: "C:/library/docs/house-blueprint-sheet.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("blueprint sheet");
    expect(asset.systemTags).not.toContain("blueprint");
  });

  it("treats pixel sprite assets as pixel art instead of fairies", () => {
    const asset = toAsset(createScannedAsset({
      name: "forest-sprite-sheet",
      path: "C:/library/sprites/forest-sprite-sheet.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("pixel art");
    expect(asset.systemTags).not.toContain("fairy");
  });

  it("recognizes common tool asset names that were missing from the catalog", () => {
    const asset = toAsset(createScannedAsset({
      name: "screwdriver-kit",
      path: "C:/library/props/tools/screwdriver-kit.glb",
      file_type: "3D",
      extension: "glb",
    }));

    expect(asset.systemTags).toContain("screwdriver");
    expect(asset.systemTags).toContain("tool");
  });

  it("recognizes common electronics naming like smartphone and gamepad", () => {
    const phoneAsset = toAsset(createScannedAsset({
      name: "smartphone",
      path: "C:/library/props/electronics/smartphone.png",
      file_type: "Image",
      extension: "png",
    }));
    const controllerAsset = toAsset(createScannedAsset({
      name: "gamepad",
      path: "C:/library/props/electronics/gamepad.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(phoneAsset.systemTags).toContain("phone");
    expect(phoneAsset.systemTags).toContain("electronic device");
    expect(controllerAsset.systemTags).toContain("gamepad");
    expect(controllerAsset.systemTags).toContain("electronic device");
  });

  it("recognizes ecosystem aliases from path context like bayou and shoreline", () => {
    const swampAsset = toAsset(createScannedAsset({
      name: "asset-01",
      path: "C:/library/biomes/bayou/asset-01.png",
      file_type: "Image",
      extension: "png",
    }));
    const coastalAsset = toAsset(createScannedAsset({
      name: "asset-02",
      path: "C:/library/regions/shoreline/asset-02.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(swampAsset.systemTags).toContain("swamp");
    expect(swampAsset.systemTags).toContain("wetland");
    expect(coastalAsset.systemTags).toContain("coastal");
  });

  it("recognizes building and room aliases like forge and stockroom", () => {
    const forgeAsset = toAsset(createScannedAsset({
      name: "asset-01",
      path: "C:/library/buildings/forge/asset-01.glb",
      file_type: "3D",
      extension: "glb",
    }));
    const stockroomAsset = toAsset(createScannedAsset({
      name: "asset-02",
      path: "C:/library/interiors/stockroom/asset-02.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(forgeAsset.systemTags).toContain("workshop");
    expect(stockroomAsset.systemTags).toContain("storage room");
  });

  it("uses nearby path segments to rescue vague filenames", () => {
    const asset = toAsset(createScannedAsset({
      name: "asset-01",
      path: "C:/library/animals/birds/asset-01.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("bird");
    expect(asset.systemTags).toContain("animal");
  });

  it("uses text document content clues to rescue vague internal notes", () => {
    const asset = toAsset(createScannedAsset({
      name: "notes",
      path: "C:/library/docs/notes.md",
      file_type: "Document",
      extension: "md",
      content_clues: ["forge", "anvil", "hammer", "workshop"],
    }));

    expect(asset.systemTags).toContain("anvil");
    expect(asset.systemTags).toContain("metalworking");
    expect(asset.systemTags).toContain("workshop");
  });

  it("infers event tags from occasion-heavy filenames like wedding invitations", () => {
    const asset = toAsset(createScannedAsset({
      name: "wedding-invitation",
      path: "C:/library/paper/wedding-invitation.pdf",
      file_type: "Document",
      extension: "pdf",
    }));

    expect(asset.systemTags).toContain("wedding event");
    expect(asset.systemTags).toContain("ceremony event");
    expect(asset.systemTags).toContain("celebration event");
    expect(asset.systemTags).toContain("gathering event");
    expect(asset.systemTags).toContain("document");
  });

  it("infers festival context from poster assets without inventing unrelated scene tags", () => {
    const asset = toAsset(createScannedAsset({
      name: "summer-festival-poster",
      path: "C:/library/posters/summer-festival-poster.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("festival event");
    expect(asset.systemTags).toContain("celebration event");
    expect(asset.systemTags).toContain("gathering event");
    expect(asset.systemTags).toContain("summer");
    expect(asset.systemTags).not.toContain("party event");
  });

  it("infers surface-finish traits from material-driven filenames", () => {
    const asset = toAsset(createScannedAsset({
      name: "polished-steel-panel",
      path: "C:/library/materials/polished-steel-panel.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("polished finish");
    expect(asset.systemTags).toContain("surface finish");
    expect(asset.systemTags).toContain("steel");
    expect(asset.systemTags).toContain("metal");
  });

  it("infers depiction and genre tags from character concept filenames", () => {
    const asset = toAsset(createScannedAsset({
      name: "cyberpunk-smiling-portrait",
      path: "C:/library/characters/cyberpunk-smiling-portrait.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toContain("cyberpunk");
    expect(asset.systemTags).toContain("science fiction");
    expect(asset.systemTags).toContain("smiling expression");
    expect(asset.systemTags).toContain("portrait framing");
    expect(asset.systemTags).toContain("character");
  });

  it("ignores low-signal path folders when inferring tags", () => {
    const asset = toAsset(createScannedAsset({
      name: "asset-01",
      path: "C:/library/assets/final/misc/asset-01.png",
      file_type: "Image",
      extension: "png",
    }));

    expect(asset.systemTags).toEqual(["image"]);
  });
});

describe("asset tag suggestions", () => {
  it("keeps inspector suggestions inside the library vocabulary", () => {
    const asset = toAsset(createScannedAsset({
      name: "street-lamp-post",
      path: "C:/library/props/street-lamp-post.glb",
      file_type: "3D",
      extension: "glb",
      tags: ["my-custom-tag"],
    }));
    const folders: VirtualFolder[] = [
      {
        id: "vf-custom",
        name: "Lighting",
        assetIds: [],
        children: [],
        tags: ["another-custom-tag"],
      },
    ];
    const suggestions = getAssetTagSuggestions(asset, [asset], folders);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).not.toContain("my-custom-tag");
    expect(suggestions).not.toContain("another-custom-tag");
    expect(suggestions).not.toContain("lighting");
  });

  it("does not let generic role ancestors leak into an anvil suggestion list", () => {
    const asset = toAsset(createScannedAsset({
      name: "anvil",
      path: "C:/library/forge/anvil.glb",
      file_type: "3D",
      extension: "glb",
    }));
    const suggestions = getAssetTagSuggestions(asset, [asset], []);

    expect(suggestions).not.toContain("role");
    expect(suggestions).not.toContain("person");
  });

  it("does not let noisy sibling tags invent unrelated place suggestions", () => {
    const asset = toAsset(createScannedAsset({
      id: 1,
      name: "hammer",
      path: "C:/library/tools/hammer.glb",
      file_type: "3D",
      extension: "glb",
    }));
    const sibling = toAsset(createScannedAsset({
      id: 2,
      name: "tongs",
      path: "C:/library/tools/tongs.glb",
      file_type: "3D",
      extension: "glb",
      tags: ["city-abu-dhabi"],
    }));

    const suggestions = getAssetTagSuggestions(asset, [asset, sibling], []);

    expect(suggestions).not.toContain("city-abu-dhabi");
  });
});
