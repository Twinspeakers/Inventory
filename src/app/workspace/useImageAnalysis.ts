import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActiveInventory } from "../../features/inventoryProject";
import { runImageAutoTagging } from "../../libraryCatalog/autoTagging";
import type { VisionPromptFamilyId, VisionPromptStage } from "../../libraryCatalog/autoTagging";
import { IMAGE_ANALYSIS_VERSION } from "../../libraryCatalog/tag-inference";
import { getAssetFileUrl } from "../../sceneReaders/previewIo";
import type { ScanResult, ScannedAsset } from "../appTypes";

const analyzableImageExtensions = new Set(["avif", "jpeg", "jpg", "png", "webp"]);
const maxAnalyzableImageBytes = 20 * 1024 * 1024;

type WorkerRequestMessage = {
  fileUrl: string;
  requestId: number;
  type: "analyze-image";
};

type WorkerResponseMessage =
  | {
      caption: string;
      concepts: Array<{
        familyId?: VisionPromptFamilyId;
        label: string;
        score: number;
        stage?: VisionPromptStage;
      }>;
      requestId: number;
      type: "analysis-complete";
    }
  | {
      message: string;
      requestId: number;
      type: "analysis-error";
    };

type InFlightRequest = {
  assetId: number;
  requestId: number;
  signature: string;
};

export function useImageAnalysis({
  activeInventory,
  scanResult,
  setScanResult,
  setStatusMessage,
}: {
  activeInventory: ActiveInventory | null;
  scanResult: ScanResult | null;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setStatusMessage: (message: string) => void;
}) {
  const workerRef = useRef<Worker | null>(null);
  const nextRequestIdRef = useRef(1);
  const inFlightRequestRef = useRef<InFlightRequest | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("./imageAnalysisWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.addEventListener("message", (event: MessageEvent<WorkerResponseMessage>) => {
      const message = event.data;
      const inFlightRequest = inFlightRequestRef.current;

      if (!inFlightRequest || message.requestId !== inFlightRequest.requestId) {
        return;
      }

      inFlightRequestRef.current = null;

      if (message.type === "analysis-error") {
        setScanResult((currentScanResult) =>
          updateAssetAnalysis(currentScanResult, inFlightRequest.assetId, (asset) => {
            if (buildAssetAnalysisSignature(asset) !== inFlightRequest.signature) {
              return asset;
            }

            return {
              ...asset,
              analysis_error: message.message,
              analysis_status: "error",
            };
          }),
        );
        setStatusMessage(`Background image analysis failed for one asset: ${message.message}`);
        return;
      }

      const autoTagResult = runImageAutoTagging({
        caption: message.caption,
        classifierConcepts: message.concepts,
      });

      setScanResult((currentScanResult) =>
        updateAssetAnalysis(currentScanResult, inFlightRequest.assetId, (asset) => {
          if (buildAssetAnalysisSignature(asset) !== inFlightRequest.signature) {
            return asset;
          }

          return {
            ...asset,
            analysis_caption: message.caption,
            analysis_evidence: autoTagResult.evidence,
            analysis_error: "",
            analysis_file_signature: inFlightRequest.signature,
            analysis_status: "done",
            analysis_suggested_tags: autoTagResult.autoTags,
            analysis_version: IMAGE_ANALYSIS_VERSION,
            auto_tags: autoTagResult.autoTags,
          };
        }),
      );
    });

    return () => {
      inFlightRequestRef.current = null;
      worker.terminate();
      workerRef.current = null;
    };
  }, [setScanResult, setStatusMessage]);

  useEffect(() => {
    if (!activeInventory || !scanResult || inFlightRequestRef.current || !workerRef.current) {
      return;
    }

    const nextAsset = scanResult.assets.find(shouldAnalyzeAsset);

    if (!nextAsset) {
      return;
    }

    const requestId = nextRequestIdRef.current++;
    const signature = buildAssetAnalysisSignature(nextAsset);
    inFlightRequestRef.current = {
      assetId: nextAsset.id,
      requestId,
      signature,
    };

    setScanResult((currentScanResult) =>
      updateAssetAnalysis(currentScanResult, nextAsset.id, (asset) => ({
        ...asset,
        analysis_error: "",
        analysis_status: "running",
      })),
    );

    workerRef.current.postMessage({
      fileUrl: getAssetFileUrl(nextAsset.path),
      requestId,
      type: "analyze-image",
    } satisfies WorkerRequestMessage);
  }, [activeInventory, scanResult, setScanResult]);

  function requestAssetReanalysis(assetId: number) {
    setScanResult((currentScanResult) =>
        updateAssetAnalysis(currentScanResult, assetId, (asset) => ({
          ...asset,
          analysis_caption: "",
          analysis_evidence: [],
          analysis_error: "",
          analysis_file_signature: "",
          analysis_status: "idle",
          analysis_suggested_tags: [],
          analysis_version: 0,
          auto_tags: [],
        })),
      );
  }

  return {
    requestAssetReanalysis,
  };
}

function shouldAnalyzeAsset(asset: ScannedAsset) {
  return (
    asset.file_type === "Image" &&
    analyzableImageExtensions.has(asset.extension.toLowerCase()) &&
    asset.size_bytes <= maxAnalyzableImageBytes &&
    asset.analysis_status !== "running" &&
    !isAssetAnalysisCurrent(asset)
  );
}

function isAssetAnalysisCurrent(asset: ScannedAsset) {
  return (
    asset.analysis_version === IMAGE_ANALYSIS_VERSION &&
    asset.analysis_file_signature === buildAssetAnalysisSignature(asset) &&
    asset.analysis_status === "done"
  );
}

function buildAssetAnalysisSignature(asset: Pick<ScannedAsset, "extension" | "modified_unix" | "path" | "size_bytes">) {
  return [asset.path, asset.extension.toLowerCase(), asset.size_bytes, asset.modified_unix ?? 0].join("::");
}

function updateAssetAnalysis(
  currentScanResult: ScanResult | null,
  assetId: number,
  update: (asset: ScannedAsset) => ScannedAsset,
) {
  if (!currentScanResult) {
    return currentScanResult;
  }

  let hasChanges = false;
  const assets = currentScanResult.assets.map((asset) => {
    if (asset.id !== assetId) {
      return asset;
    }

    const nextAsset = update(asset);
    hasChanges ||= nextAsset !== asset;
    return nextAsset;
  });

  return hasChanges ? { ...currentScanResult, assets } : currentScanResult;
}
