import type { NvdPageObjectAsset } from "../../features/inventoryProject";
import { createNvdPageObjectAssetFromSource } from "../../features/nvdEditor";
import type { Asset } from "../appTypes";

export function canAssignWorkspaceAssetToNvdPageObject(asset: Pick<Asset, "type">) {
  return asset.type !== "Audio" && asset.type !== "Archive";
}

export function createNvdPageObjectAssetFromWorkspaceAsset(
  asset: Pick<Asset, "extension" | "id" | "name" | "path" | "type">,
): NvdPageObjectAsset {
  return createNvdPageObjectAssetFromSource({
    assetId: asset.id,
    assetKind: asset.type === "Image" ? "image" : asset.type.toLowerCase(),
    assetName: asset.name,
    assetPath: asset.path,
    sourceDocumentKind:
      asset.extension.toLowerCase() === "nvv"
        ? "nvv"
        : asset.extension.toLowerCase() === "nvd"
          ? "nvd"
          : undefined,
  });
}
