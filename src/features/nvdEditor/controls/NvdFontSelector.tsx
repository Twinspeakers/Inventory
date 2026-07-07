import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  getNvdFontCssStack,
  getNvdFontFamily,
  getNvdFontMenuGroups,
  readRecentNvdFontFamilies,
  rememberRecentNvdFontFamily,
  type NvdFontDefinition,
} from "../fonts";

export function NvdFontSelector({
  disabled = false,
  fontFamily,
  onChange,
}: {
  disabled?: boolean;
  fontFamily: string | null | undefined;
  onChange: (fontFamily: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [recentFontFamilies, setRecentFontFamilies] = useState(readRecentNvdFontFamilies);
  const selectedFontFamily = getNvdFontFamily(fontFamily);
  const groups = useMemo(() => getNvdFontMenuGroups(recentFontFamilies), [recentFontFamilies]);

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
        restoreSelectorFocusIfOwned();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectFont(font: NvdFontDefinition) {
    setRecentFontFamilies(rememberRecentNvdFontFamily(font.family));
    onChange(font.family);
    setIsOpen(false);
    restoreSelectorFocusIfOwned();
  }

  function restoreSelectorFocusIfOwned() {
    if (document.activeElement && rootRef.current?.contains(document.activeElement)) {
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="nvd-font-selector" ref={rootRef}>
      <button
        aria-label={`Document font: ${selectedFontFamily}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`nvd-font-selector-button ${isOpen ? "nvd-font-selector-button-open" : ""}`}
        disabled={disabled}
        ref={buttonRef}
        title="Document font"
        type="button"
        onClick={() => setIsOpen((open) => (disabled ? false : !open))}
        onMouseDown={preserveDocumentSelection}
      >
        <span
          className="min-w-0 flex-1 truncate text-left"
          style={{ fontFamily: getNvdFontCssStack(selectedFontFamily) }}
        >
          {selectedFontFamily}
        </span>
        <ChevronDown className={isOpen ? "rotate-180" : ""} size={13} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div aria-label="Document font" className="nvd-font-menu" role="listbox">
          {groups.recent.length > 0 ? (
            <NvdFontMenuGroup
              fonts={groups.recent}
              label="Recently Used"
              onSelect={selectFont}
              selectedFontFamily={selectedFontFamily}
            />
          ) : null}
          <NvdFontMenuGroup
            fonts={groups.available}
            label={groups.recent.length > 0 ? "All Fonts" : "Fonts"}
            onSelect={selectFont}
            selectedFontFamily={selectedFontFamily}
          />
        </div>
      ) : null}
    </div>
  );
}

function NvdFontMenuGroup({
  fonts,
  label,
  onSelect,
  selectedFontFamily,
}: {
  fonts: NvdFontDefinition[];
  label: string;
  onSelect: (font: NvdFontDefinition) => void;
  selectedFontFamily: string;
}) {
  return (
    <div className="nvd-font-menu-group">
      <div className="nvd-font-menu-label">{label}</div>
      {fonts.map((font) => {
        const isSelected = font.family === selectedFontFamily;

        return (
          <button
            aria-selected={isSelected}
            className={`nvd-font-menu-item ${isSelected ? "nvd-font-menu-item-selected" : ""}`}
            key={font.family}
            role="option"
            type="button"
            onClick={() => onSelect(font)}
            onMouseDown={preserveDocumentSelection}
          >
            <Check className={isSelected ? "opacity-100" : "opacity-0"} size={13} aria-hidden="true" />
            <span
              className="min-w-0 flex-1 truncate"
              style={{ fontFamily: getNvdFontCssStack(font.family) }}
            >
              {font.family}
            </span>
            {font.source === "system" ? <span className="nvd-font-menu-source">System</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function preserveDocumentSelection(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}
