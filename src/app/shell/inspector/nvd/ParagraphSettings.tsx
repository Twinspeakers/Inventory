import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import {
  getNvdCharacterSpacingPt,
  getNvdLineHeight,
  getNvdParagraphSpacingPt,
  MAX_NVD_CHARACTER_SPACING_PT,
  MAX_NVD_LINE_HEIGHT,
  MAX_NVD_PARAGRAPH_SPACING_PT,
  MIN_NVD_CHARACTER_SPACING_PT,
  MIN_NVD_LINE_HEIGHT,
  MIN_NVD_PARAGRAPH_SPACING_PT,
} from "../../../../features/nvdEditor";

export function ParagraphSettings({
  characterSpacingPt,
  lineHeight,
  onCharacterSpacingPtChange,
  onLineHeightChange,
  onSpaceAfterPtChange,
  onSpaceBeforePtChange,
  spaceAfterPt,
  spaceBeforePt,
}: {
  characterSpacingPt: number | null;
  lineHeight: number | null;
  onCharacterSpacingPtChange: (characterSpacingPt: number, finalizeStyle?: boolean) => void;
  onLineHeightChange: (lineHeight: number, finalizeStyle?: boolean) => void;
  onSpaceAfterPtChange: (spaceAfterPt: number, finalizeStyle?: boolean) => void;
  onSpaceBeforePtChange: (spaceBeforePt: number, finalizeStyle?: boolean) => void;
  spaceAfterPt: number | null;
  spaceBeforePt: number | null;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="mt-3">
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>Paragraph</span>
      </button>
      {isOpen ? (
        <div className="paragraph-settings-mockup" aria-label="Paragraph settings">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="paragraph-setting-label">Space before</span>
              <ParagraphNumberInput
                aria-label="Space before"
                max={MAX_NVD_PARAGRAPH_SPACING_PT}
                min={MIN_NVD_PARAGRAPH_SPACING_PT}
                normalize={getNvdParagraphSpacingPt}
                onChange={onSpaceBeforePtChange}
                suffix="pt"
                step="1"
                value={spaceBeforePt}
              />
            </label>
            <label className="block">
              <span className="paragraph-setting-label">Space after</span>
              <ParagraphNumberInput
                aria-label="Space after"
                max={MAX_NVD_PARAGRAPH_SPACING_PT}
                min={MIN_NVD_PARAGRAPH_SPACING_PT}
                normalize={getNvdParagraphSpacingPt}
                onChange={onSpaceAfterPtChange}
                suffix="pt"
                step="1"
                value={spaceAfterPt}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="paragraph-setting-label">Line spacing</span>
              <ParagraphNumberInput
                aria-label="Line spacing"
                max={MAX_NVD_LINE_HEIGHT}
                min={MIN_NVD_LINE_HEIGHT}
                normalize={getNvdLineHeight}
                onChange={onLineHeightChange}
                step="0.05"
                value={lineHeight}
              />
            </label>
            <label className="block">
              <span className="paragraph-setting-label">Letter spacing</span>
              <ParagraphNumberInput
                aria-label="Letter spacing"
                max={MAX_NVD_CHARACTER_SPACING_PT}
                min={MIN_NVD_CHARACTER_SPACING_PT}
                normalize={getNvdCharacterSpacingPt}
                onChange={onCharacterSpacingPtChange}
                suffix="pt"
                step="0.1"
                value={characterSpacingPt}
              />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ParagraphNumberInput({
  "aria-label": ariaLabel,
  max,
  min,
  normalize,
  onChange,
  step,
  suffix,
  value,
}: {
  "aria-label": string;
  max: number;
  min: number;
  normalize: (value: number | string | null | undefined) => number;
  onChange: (value: number, finalizeStyle?: boolean) => void;
  step: string;
  suffix?: string;
  value: number | null;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? "");

  useEffect(() => {
    setDraft(value?.toString() ?? "");
  }, [value]);

  function commit(finalizeStyle = false) {
    if (!draft.trim()) {
      setDraft(value?.toString() ?? "");
      return;
    }

    const nextValue = normalize(draft);
    setDraft(nextValue.toString());
    onChange(nextValue, finalizeStyle);
  }

  function stepDraft(direction: -1 | 1) {
    const currentValue = Number(draft);
    const fallbackValue = value ?? min;
    const nextValue = normalize((Number.isFinite(currentValue) ? currentValue : fallbackValue) + Number(step) * direction);
    setDraft(nextValue.toString());
  }

  const input = (
    <input
      aria-label={ariaLabel}
      className={`paragraph-setting-select ${suffix ? "paragraph-setting-select-with-suffix" : "paragraph-setting-select-with-spinner"}`}
      inputMode="decimal"
      max={max}
      min={min}
      placeholder={value === null ? "Mixed" : undefined}
      step={step}
      type="number"
      value={draft}
      onBlur={() => commit()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(true);
        }
      }}
    />
  );

  return (
    <span className="paragraph-setting-field mt-1">
      {input}
      {suffix ? (
        <span
          className="paragraph-setting-suffix"
          style={{ left: `calc(0.5rem + ${Math.max(draft.length, 1)}ch + 6px)` }}
          aria-hidden="true"
        >
          {suffix}
        </span>
      ) : null}
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
