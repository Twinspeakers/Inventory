import {
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  MAX_NVD_FONT_SIZE_PT,
  MIN_NVD_FONT_SIZE_PT,
  NVD_FONT_SIZE_PRESETS_PT,
  normalizeNvdFontSizePt,
} from "../primitives/nvdFontSize";

export function NvdFontSizeSelector({
  disabled = false,
  fontSizePt,
  onChange,
}: {
  disabled?: boolean;
  fontSizePt: number;
  onChange: (fontSizePt: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipNextBlurCommitRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(String(normalizeNvdFontSizePt(fontSizePt)));
  const normalizedFontSizePt = normalizeNvdFontSizePt(fontSizePt);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraftValue(String(normalizedFontSizePt));
    }
  }, [normalizedFontSizePt]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function commitDraftValue(fromBlur = false) {
    const nextFontSizePt = normalizeNvdFontSizePt(draftValue);
    setDraftValue(String(nextFontSizePt));

    if (!fromBlur && document.activeElement === inputRef.current) {
      skipNextBlurCommitRef.current = true;
    }

    onChange(nextFontSizePt);
  }

  function selectPreset(fontSizePresetPt: number) {
    setDraftValue(String(fontSizePresetPt));

    if (document.activeElement === inputRef.current) {
      skipNextBlurCommitRef.current = true;
    }

    onChange(fontSizePresetPt);
    setIsOpen(false);
  }

  function handleInputBlur() {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false;
      return;
    }

    commitDraftValue(true);
  }

  function handleInputFocus(event: ReactFocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraftValue();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftValue(String(normalizedFontSizePt));
      inputRef.current?.blur();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div className="nvd-font-size-selector" ref={rootRef}>
      <div className={`nvd-font-size-control ${isOpen ? "nvd-font-size-control-open" : ""}`}>
        <input
          aria-label={`Font size: ${normalizedFontSizePt} pt`}
          className="nvd-font-size-input"
          disabled={disabled}
          inputMode="numeric"
          maxLength={3}
          ref={inputRef}
          title={`Font size (${MIN_NVD_FONT_SIZE_PT}-${MAX_NVD_FONT_SIZE_PT} pt)`}
          value={draftValue}
          onBlur={handleInputBlur}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;

            if (/^\d{0,3}$/.test(nextValue)) {
              setDraftValue(nextValue);
            }
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
        />
        <button
          aria-label="Choose font size"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="nvd-font-size-menu-button"
          disabled={disabled}
          title="Choose font size"
          type="button"
          onClick={() => setIsOpen((open) => (disabled ? false : !open))}
          onMouseDown={preserveDocumentSelection}
        >
          <ChevronDown className={isOpen ? "rotate-180" : ""} size={12} aria-hidden="true" />
        </button>
      </div>
      {isOpen ? (
        <div aria-label="Font size presets" className="nvd-font-size-menu" role="listbox">
          {NVD_FONT_SIZE_PRESETS_PT.map((fontSizePresetPt) => {
            const isSelected = fontSizePresetPt === normalizedFontSizePt;

            return (
              <button
                aria-selected={isSelected}
                className={`nvd-font-size-menu-item ${isSelected ? "nvd-font-size-menu-item-selected" : ""}`}
                key={fontSizePresetPt}
                role="option"
                type="button"
                onClick={() => selectPreset(fontSizePresetPt)}
                onMouseDown={preserveDocumentSelection}
              >
                <Check className={isSelected ? "opacity-100" : "opacity-0"} size={12} aria-hidden="true" />
                <span>{fontSizePresetPt}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function preserveDocumentSelection(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}
