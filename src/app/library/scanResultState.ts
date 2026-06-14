import { mergeScannedAssets } from "../../features/libraryTree/libraryTreeModel";
import type { ScanResult, SourceFolder } from "../appTypes";

export function mergeAssetsIntoScanResult(
  currentScanResult: ScanResult | null,
  sourceFolders: SourceFolder[],
  assets: ScanResult["assets"],
): ScanResult {
  return {
    root_path: currentScanResult?.root_path ?? sourceFolders[0]?.path ?? "",
    assets: mergeScannedAssets(currentScanResult?.assets ?? [], assets),
    skipped_entries: currentScanResult?.skipped_entries ?? 0,
  };
}

export function updateAssetInScanResult(
  currentScanResult: ScanResult | null,
  assetId: number,
  update: (asset: ScanResult["assets"][number]) => ScanResult["assets"][number],
) {
  if (!currentScanResult) {
    return currentScanResult;
  }

  return {
    ...currentScanResult,
    assets: currentScanResult.assets.map((asset) => (asset.id === assetId ? update(asset) : asset)),
  };
}

