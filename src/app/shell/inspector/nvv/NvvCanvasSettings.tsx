import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { NvvDocument } from "../../../../features/inventoryProject";

export function NvvCanvasSettings({ document, onChange }: { document: NvvDocument; onChange: (document: NvvDocument) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  function updateDimension(dimension: "canvasWidth" | "canvasHeight", value: number) {
    if (!Number.isFinite(value)) {
      return;
    }

    onChange({ ...document, [dimension]: Math.max(1, Math.round(value)) });
  }

  return (
    <section className="mt-4">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Canvas</span>
      </button>
      {isOpen ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <label className="nvv-canvas-field">
            <span>Width</span>
            <NvvCanvasNumberInput
              aria-label="Canvas width"
              onChange={(value) => updateDimension("canvasWidth", value)}
              value={document.canvasWidth}
            />
          </label>
          <label className="nvv-canvas-field">
            <span>Height</span>
            <NvvCanvasNumberInput
              aria-label="Canvas height"
              onChange={(value) => updateDimension("canvasHeight", value)}
              value={document.canvasHeight}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function NvvCanvasNumberInput({
  "aria-label": ariaLabel,
  onChange,
  value,
}: {
  "aria-label": string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(value.toString());

  useEffect(() => {
    setDraft(value.toString());
  }, [value]);

  function normalize(valueToNormalize: number | string) {
    const numberValue = Number(valueToNormalize);
    return Number.isFinite(numberValue) ? Math.max(1, Math.round(numberValue)) : value;
  }

  function commit() {
    if (!draft.trim()) {
      setDraft(value.toString());
      return;
    }

    const nextValue = normalize(draft);
    setDraft(nextValue.toString());
    onChange(nextValue);
  }

  function stepDraft(direction: -1 | 1) {
    const nextValue = normalize((Number(draft) || value) + direction);
    setDraft(nextValue.toString());
    onChange(nextValue);
  }

  return (
    <span className="paragraph-setting-field mt-1">
      <input
        aria-label={ariaLabel}
        className="paragraph-setting-select paragraph-setting-select-with-suffix nvv-canvas-number-input"
        inputMode="numeric"
        min="1"
        step="1"
        type="number"
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
      <span
        className="paragraph-setting-suffix normal-case"
        style={{ left: `calc(0.5rem + ${Math.max(draft.length, 1)}ch + 8px)` }}
        aria-hidden="true"
      >
        px
      </span>
      <span className="paragraph-setting-spinner">
        <button
          aria-label={`Increase ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronUp size={9} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
          className="paragraph-setting-spinner-button"
          tabIndex={-1}
          type="button"
          onClick={() => stepDraft(-1)}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ChevronDown size={9} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    </span>
  );
}
