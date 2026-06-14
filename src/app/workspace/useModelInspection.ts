import { useState } from "react";
import type { Asset } from "../appTypes";
import { getAssetModelKey } from "../../features/libraryTree/libraryTreeModel";
import {
  cloneModelTransform,
  type ModelInspectorResult,
  type ModelTransform,
} from "../../sceneReaders/threeModelReader";

export function useModelInspection() {
  const [modelInspectorResults, setModelInspectorResults] = useState<Record<string, ModelInspectorResult>>({});
  const [modelTransformOverrides, setModelTransformOverrides] = useState<Record<string, ModelTransform>>({});

  function handleModelInspectorResult(asset: Asset, result: ModelInspectorResult) {
    const modelKey = getAssetModelKey(asset);
    setModelInspectorResults((results) => ({ ...results, [modelKey]: result }));
  }

  function getSelectedModelState(selectedAsset: Asset | null) {
    const selectedModelKey = selectedAsset?.type === "3D" ? getAssetModelKey(selectedAsset) : null;

    return {
      selectedModelKey,
      selectedModelInspectorResult: selectedModelKey ? (modelInspectorResults[selectedModelKey] ?? null) : null,
      selectedModelTransformOverride: selectedModelKey ? modelTransformOverrides[selectedModelKey] : undefined,
    };
  }

  function updateSelectedModelTransform(selectedModelKey: string | null, transform: ModelTransform) {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => ({ ...overrides, [selectedModelKey]: cloneModelTransform(transform) }));
  }

  function resetSelectedModelTransform(selectedModelKey: string | null) {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => {
      const nextOverrides = { ...overrides };
      delete nextOverrides[selectedModelKey];
      return nextOverrides;
    });
  }

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

