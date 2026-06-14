import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, RefreshCw } from "lucide-react";
import {
  getNvdFontCssStack,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "../../../../features/nvdEditor";

export function NvdStylesSection({
  activeStyleRole,
  onAcceptStyle,
  onApplyStyle,
  onResetStyle,
  onSelectStyle,
  styleDefinitions,
}: {
  activeStyleRole: NvdStyleRole | null;
  onAcceptStyle: () => void;
  onApplyStyle: (role: NvdStyleRole) => void;
  onResetStyle: (role: NvdStyleRole) => void;
  onSelectStyle: (role: NvdStyleRole) => void;
  styleDefinitions: Record<NvdStyleRole, NvdStyleDefinition>;
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
        <span>Styles</span>
      </button>
      {isOpen ? (
        <div className="mt-2 grid gap-1.5">
          {(["p", "h1", "h2", "h3"] as NvdStyleRole[]).map((role) => {
            const style = styleDefinitions[role];
            const isActive = role === activeStyleRole;

            return (
              <div className={`nvd-style-row ${isActive ? "nvd-style-row-active" : ""}`} key={role}>
                <button
                  className="nvd-style-preview"
                  title={`Apply ${style.label}`}
                  type="button"
                  onClick={() => onApplyStyle(role)}
                >
                  <span className="nvd-style-role">{role}</span>
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{
                      fontFamily: getNvdFontCssStack(style.fontFamily),
                      fontSize: `${Math.min(18, Math.max(11, style.fontSizePt * 0.55))}px`,
                      fontStyle: style.italic ? "italic" : "normal",
                      fontWeight: style.bold ? 700 : 400,
                      letterSpacing: `${style.characterSpacingPt}pt`,
                      textAlign: style.textAlign,
                    }}
                  >
                    {style.label}
                  </span>
                </button>
                <button
                  aria-label={`Reset ${style.label} to default`}
                  className="nvd-style-action"
                  title={`Reset ${style.label} to default`}
                  type="button"
                  onClick={() => onResetStyle(role)}
                >
                  <RefreshCw size={12} aria-hidden="true" />
                </button>
                <button
                  aria-label={isActive ? `Accept ${style.label} changes` : `Edit ${style.label}`}
                  className="nvd-style-action nvd-style-accept"
                  title={isActive ? `Accept ${style.label} changes` : `Edit ${style.label}`}
                  type="button"
                  onClick={isActive ? onAcceptStyle : () => onSelectStyle(role)}
                >
                  {isActive ? <Check size={13} aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
