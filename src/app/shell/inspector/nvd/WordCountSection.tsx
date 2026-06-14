import type { DocumentStatistics } from "../../../../features/editors";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function WordCountSection({ statistics }: { statistics: DocumentStatistics }) {
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
      <button
        aria-expanded={isOpen}
        className="model-section-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
        <span>{title}</span>
      </button>
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
