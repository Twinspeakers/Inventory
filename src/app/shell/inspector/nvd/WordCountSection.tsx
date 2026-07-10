import type { DocumentStatistics } from "../../../../features/editors";
import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export function WordCountSection({
  statistics,
  onClose,
}: {
  statistics: DocumentStatistics;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const title = statistics.scope === "selection" ? "Selection Count" : "Word Count";
  const rows = [
    ...(statistics.pages === null ? [] : [["Pages", statistics.pages] as const]),
    ["Words", statistics.words],
    ["Characters", statistics.characters],
    ["Characters without spaces", statistics.charactersWithoutSpaces],
  ] as const;

  return (
    <section className="mt-3">
      <div className="word-count-section-header">
        <button
          aria-expanded={isOpen}
          className="model-section-toggle min-w-0 flex-1"
          type="button"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <span>{title}</span>
        </button>
        <button
          aria-label={`Hide ${title}`}
          className="word-count-close-button"
          title={`Hide ${title}`}
          type="button"
          onClick={onClose}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
      {isOpen ? (
        <dl className="mt-1">
          {rows.map(([label, value]) => (
            <div className="word-count-row" key={label}>
              <dt className="truncate text-xs font-semibold text-muted">{label}</dt>
              <dd className="text-right text-xs font-medium tabular-nums text-ink">{formatInteger(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}
