import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import {
  defaultModelTransform,
  getLiveModelCenter,
  getLiveModelDimensions,
  getModelScaleSign,
  MODEL_NUMBER_EPSILON,
  modelAxes,
  sanitizeModelNumber,
  type ModelAxis,
  type ModelInspectorResult,
  type ModelTransform,
  type ModelTransformField,
  type ModelVector3,
} from "../../../../sceneReaders/threeModelReader";

export function ModelInspector({
  modelResult,
  onTransformChange,
  onTransformReset,
  transformOverride,
}: {
  modelResult: ModelInspectorResult | null;
  onTransformChange: (transform: ModelTransform) => void;
  onTransformReset: () => void;
  transformOverride?: ModelTransform;
}) {
  const importedTransform = modelResult?.status === "ready" ? modelResult.info.rootTransform : defaultModelTransform;
  const transform = transformOverride ?? importedTransform;
  const modelInfo = modelResult?.status === "ready" ? modelResult.info : null;
  const dimensions = modelInfo ? getLiveModelDimensions(modelInfo, transform) : defaultModelTransform.position;
  const center = modelInfo ? getLiveModelCenter(modelInfo, transform) : defaultModelTransform.position;
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(true);

  function updateVector(field: ModelTransformField, axis: ModelAxis, value: number) {
    onTransformChange({
      ...transform,
      [field]: {
        ...transform[field],
        [axis]: value,
      },
    });
  }

  function updateDimensions(axis: ModelAxis, value: number) {
    if (!modelInfo) {
      return;
    }

    const targetDimension = Math.max(0, value);
    const currentDimension = Math.abs(dimensions[axis]);
    const currentScale = transform.scale[axis];
    const importedScale = modelInfo.rootTransform.scale[axis];
    const importedDimension = Math.abs(modelInfo.dimensions[axis]);
    let nextScale = currentScale;

    if (currentDimension > MODEL_NUMBER_EPSILON) {
      nextScale = currentScale * (targetDimension / currentDimension);
    } else if (importedDimension > MODEL_NUMBER_EPSILON) {
      nextScale = getModelScaleSign(currentScale, importedScale) * Math.abs(importedScale || 1) * (targetDimension / importedDimension);
    }

    onTransformChange({
      ...transform,
      scale: {
        ...transform.scale,
        [axis]: sanitizeModelNumber(nextScale),
      },
    });
  }

  function updateCenter(axis: ModelAxis, value: number) {
    if (!modelInfo) {
      return;
    }

    const delta = value - center[axis];

    onTransformChange({
      ...transform,
      position: {
        ...transform.position,
        [axis]: sanitizeModelNumber(transform.position[axis] + delta),
      },
    });
  }

  return (
    <>
      <section className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-expanded={isTransformOpen}
            className="model-section-toggle"
            type="button"
            onClick={() => setIsTransformOpen((open) => !open)}
          >
            {isTransformOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
            <span>Transform</span>
          </button>
          <button
            className="dark-icon-button"
            disabled={!transformOverride}
            title="Reset transform"
            onClick={onTransformReset}
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>
        {isTransformOpen ? (
          <div className="model-transform-panel">
            <ModelVectorControl
              label="Position"
              onChange={(axis, value) => updateVector("position", axis, value)}
              step={0.1}
              value={transform.position}
            />
            <ModelVectorControl
              label="Rotation"
              onChange={(axis, value) => updateVector("rotation", axis, value)}
              step={1}
              value={transform.rotation}
            />
            <ModelVectorControl
              label="Scale"
              onChange={(axis, value) => updateVector("scale", axis, value)}
              step={0.01}
              value={transform.scale}
            />
          </div>
        ) : null}
      </section>

      {modelInfo ? (
        <section className="mt-2" aria-label="Model dimensions and center">
          <div className="model-transform-panel">
            <ModelVectorControl label="Dimensions" onChange={updateDimensions} step={0.1} value={dimensions} />
            <ModelVectorControl label="Center" onChange={updateCenter} step={0.1} value={center} />
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <button
          aria-expanded={isModelOpen}
          className="model-section-toggle"
          type="button"
          onClick={() => setIsModelOpen((open) => !open)}
        >
          {isModelOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <span>Model</span>
        </button>
        {isModelOpen ? <ModelStats modelResult={modelResult} /> : null}
      </section>
    </>
  );
}

function ModelVectorControl({
  label,
  onChange,
  step,
  value,
}: {
  label: string;
  onChange: (axis: ModelAxis, value: number) => void;
  step: number;
  value: ModelVector3;
}) {
  return (
    <div className="model-vector-row">
      <span className="truncate text-xs font-semibold text-muted">{label}</span>
      <div className="grid min-w-0 grid-cols-3 gap-1.5">
        {modelAxes.map((axis) => (
          <label className="model-axis-field" key={axis}>
            <span className={`model-axis-label ${getAxisClassName(axis)}`}>{axis.toUpperCase()}</span>
            <input
              aria-label={`${label} ${axis.toUpperCase()}`}
              className="model-axis-input"
              inputMode="decimal"
              step={step}
              type="number"
              value={formatModelNumber(value[axis])}
              onChange={(event) => {
                const nextValue = Number(event.currentTarget.value);

                if (Number.isFinite(nextValue)) {
                  onChange(axis, nextValue);
                }
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ModelStats({ modelResult }: { modelResult: ModelInspectorResult | null }) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  if (!modelResult || modelResult.status === "loading") {
    return <div className="mt-2 rounded-sm bg-surface p-3 text-sm text-muted">Loading model data...</div>;
  }

  if (modelResult.status === "error") {
    return <div className="mt-2 rounded-sm bg-surface p-3 text-sm text-muted">{modelResult.message}</div>;
  }

  const { info } = modelResult;

  return (
    <>
      <dl className="model-stat-list">
        <ModelStat label="Nodes" value={formatInteger(info.nodeCount)} />
        <ModelStat label="Meshes" value={formatInteger(info.meshCount)} />
        <ModelStat label="Materials" value={formatInteger(info.materialCount)} />
        <ModelStat label="Vertices" value={formatInteger(info.vertexCount)} />
        <ModelStat label="Triangles" value={formatInteger(info.triangleCount)} />
      </dl>
      <div className="model-import-section">
        <button
          aria-expanded={isImportOpen}
          className="model-import-toggle"
          type="button"
          onClick={() => setIsImportOpen((open) => !open)}
        >
          {isImportOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <span>Import</span>
        </button>
        {isImportOpen ? (
          <div className="model-readout-list mt-1">
            <ModelVectorReadout label="Position" value={info.rootTransform.position} />
            <ModelVectorReadout label="Scale" value={info.rootTransform.scale} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function ModelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="model-stat-row">
      <dt className="truncate text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="truncate text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function ModelVectorReadout({ label, value }: { label: string; value: ModelVector3 }) {
  return (
    <div className="model-vector-readout">
      <span className="truncate text-xs font-semibold text-muted">{label}</span>
      <span className="truncate text-right text-xs font-medium text-ink">{formatModelVector(value)}</span>
    </div>
  );
}

function getAxisClassName(axis: ModelAxis) {
  switch (axis) {
    case "x":
      return "text-copper";
    case "y":
      return "text-forest";
    case "z":
      return "text-steel";
  }
}

function formatModelNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return Number(normalized.toFixed(3)).toString();
}

function formatModelVector(value: ModelVector3) {
  return `X ${formatModelNumber(value.x)}  Y ${formatModelNumber(value.y)}  Z ${formatModelNumber(value.z)}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}
