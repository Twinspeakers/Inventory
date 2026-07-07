import { getNvdFontCssStack } from "../fonts";
import { getNvdFontSizeCssValue, getNvdFontSizePt } from "../primitives/nvdFontSize";
import {
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  sliceNvdTextRuns,
} from "../document/nvdRichText";
import type { NvdPageFragment } from "../layout/nvdPageLayoutEngine";

export function NvdPageFragmentView({
  className,
  defaultFontFamily,
  defaultFontSizePt,
  page,
}: {
  className?: string;
  defaultFontFamily: string;
  defaultFontSizePt: number;
  page: NvdPageFragment;
}) {
  const paragraphAlignments = new Map(
    page.paragraphFragments.map((fragment) => [fragment.paragraphIndex, fragment.textAlign] as const),
  );

  return (
    <div className={className ? `nvd-page-fragment-view ${className}` : "nvd-page-fragment-view"}>
      {page.lines.map((line) => {
        const localStart = line.start - page.start;
        const localEnd = line.end - page.start;
        const lineEndCharacter = page.text[localEnd - 1];
        const renderEnd = lineEndCharacter === "\n" ? Math.max(localStart, localEnd - 1) : localEnd;
        const runs = sliceNvdTextRuns(page.runs, localStart, renderEnd);

        return (
          <div
            className="nvd-page-fragment-line"
            key={`${line.pageIndex}-${line.index}-${line.start}-${line.end}`}
            style={{
              textAlign: paragraphAlignments.get(line.paragraphIndex) ?? "left",
              top: `${line.topPx + line.textTopOffsetPx}px`,
            }}
          >
            {runs.map((run, runIndex) => (
            <span
              key={`${runIndex}-${run.text.length}-${line.start}`}
              style={{
                fontFamily: getNvdFontCssStack(getNvdTextRunFontFamily(run, defaultFontFamily)),
                fontSize: getNvdFontSizeCssValue(getNvdTextRunFontSizePt(run, defaultFontSizePt)),
                fontStyle: isNvdTextRunItalic(run) ? "italic" : "normal",
                fontWeight: isNvdTextRunBold(run) ? 700 : 400,
                letterSpacing: `${getNvdTextRunCharacterSpacingPt(run)}pt`,
              }}
            >
              {run.text}
            </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
