import { useCallback, useState } from "react";
import type { Asset } from "../appTypes";
import { getAssetModelKey } from "../../features/libraryTree/libraryTreeModel";
import {
  cloneModelTransform,
  type ModelInfo,
  type ModelInspectorResult,
  type ModelTransform,
} from "../../sceneReaders/threeModelReader";

export function useModelInspection() {
  const [modelInspectorResults, setModelInspectorResults] = useState<Record<string, ModelInspectorResult>>({});
  const [modelTransformOverrides, setModelTransformOverrides] = useState<Record<string, ModelTransform>>({});

  const handleModelInspectorResult = useCallback((asset: Asset, result: ModelInspectorResult) => {
    const modelKey = getAssetModelKey(asset);
    setModelInspectorResults((results) => {
      const previousResult = results[modelKey];

      if (areModelInspectorResultsEqual(previousResult, result)) {
        return results;
      }

      return { ...results, [modelKey]: result };
    });
  }, []);

  const getSelectedModelState = useCallback((selectedAsset: Asset | null) => {
    const selectedModelKey = selectedAsset?.type === "3D" ? getAssetModelKey(selectedAsset) : null;

    return {
      selectedModelKey,
      selectedModelInspectorResult: selectedModelKey ? (modelInspectorResults[selectedModelKey] ?? null) : null,
      selectedModelTransformOverride: selectedModelKey ? modelTransformOverrides[selectedModelKey] : undefined,
    };
  }, [modelInspectorResults, modelTransformOverrides]);

  const updateSelectedModelTransform = useCallback((selectedModelKey: string | null, transform: ModelTransform) => {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => {
      const nextTransform = cloneModelTransform(transform);
      const previousTransform = overrides[selectedModelKey];

      if (previousTransform && areModelTransformsEqual(previousTransform, nextTransform)) {
        return overrides;
      }

      return { ...overrides, [selectedModelKey]: nextTransform };
    });
  }, []);

  const resetSelectedModelTransform = useCallback((selectedModelKey: string | null) => {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => {
      if (!(selectedModelKey in overrides)) {
        return overrides;
      }

      const nextOverrides = { ...overrides };
      delete nextOverrides[selectedModelKey];
      return nextOverrides;
    });
  }, []);

  return {
    getSelectedModelState,
    modelInspectorResults,
    modelTransformOverrides,
    handleModelInspectorResult,
    resetSelectedModelTransform,
    setModelInspectorResults,
    setModelTransformOverrides,
    updateSelectedModelTransform,
  };
}

function areModelInspectorResultsEqual(previousResult: ModelInspectorResult | undefined, nextResult: ModelInspectorResult) {
  if (!previousResult || previousResult.status !== nextResult.status) {
    return false;
  }

  if (nextResult.status === "loading") {
    return true;
  }

  if (nextResult.status === "error") {
    return previousResult.status === "error" && previousResult.message === nextResult.message;
  }

  if (previousResult.status !== "ready") {
    return false;
  }

  return areModelInfosEqual(previousResult.info, nextResult.info);
}

function areModelInfosEqual(previousInfo: ModelInfo, nextInfo: ModelInfo) {
  return (
    previousInfo.materialCount === nextInfo.materialCount &&
    previousInfo.meshCount === nextInfo.meshCount &&
    previousInfo.nodeCount === nextInfo.nodeCount &&
    previousInfo.triangleCount === nextInfo.triangleCount &&
    previousInfo.vertexCount === nextInfo.vertexCount &&
    areModelTransformsEqual(previousInfo.rootTransform, nextInfo.rootTransform) &&
    areModelVectorsEqual(previousInfo.boundsCenter, nextInfo.boundsCenter) &&
    areModelVectorsEqual(previousInfo.dimensions, nextInfo.dimensions)
  );
}

function areModelTransformsEqual(previousTransform: ModelTransform, nextTransform: ModelTransform) {
  return (
    areModelVectorsEqual(previousTransform.position, nextTransform.position) &&
    areModelVectorsEqual(previousTransform.rotation, nextTransform.rotation) &&
    areModelVectorsEqual(previousTransform.scale, nextTransform.scale)
  );
}

function areModelVectorsEqual(previousVector: ModelTransform["position"], nextVector: ModelTransform["position"]) {
  return previousVector.x === nextVector.x && previousVector.y === nextVector.y && previousVector.z === nextVector.z;
}

