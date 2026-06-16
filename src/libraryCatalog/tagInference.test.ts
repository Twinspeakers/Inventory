import { describe, expect, it } from "vitest";

import type { ScannedAsset, VirtualFolder } from "../app/appTypes";
import { getAssetTagSuggestions } from "../features/libraryTree/libraryTreeModel";
import { toAsset } from "./tagInference";

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
