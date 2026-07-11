import type { NvdPageObjectAsset } from "../../inventoryProject";
import { createNvdPageObjectAsset } from "./nvdPageObjectModel";

export type NvdPageObjectAssetSourceDescriptor = {
  assetId: number;
  assetKind?: string;
  assetName: string;
  assetPath: string;
  sourceDocumentKind?: string;
};

export type NvdPageObjectAssetPointerDrag = {
  asset: NvdPageObjectAsset;
  clientX: number;
  clientY: number;
};

export type NvdPageObjectAssetPointerDragController = {
  getSnapshot: () => NvdPageObjectAssetPointerDrag | null;
  subscribe: (listener: () => void) => () => void;
};

export function createNvdPageObjectAssetFromSource(
  source: NvdPageObjectAssetSourceDescriptor,
) {
  return createNvdPageObjectAsset(source);
}
