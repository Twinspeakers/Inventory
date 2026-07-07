import { getNvdFontCssStack } from "../fonts";
import { getNvdFontSizeCssValue, getNvdFontSizePt } from "../primitives/nvdFontSize";
import {
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  isNvdTextRunBold,
  isNvdTextRunItalic,
} from "../core/nvdRichText";
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
  return (
    <div className={className ? `nvd-page-fragment-view ${className}` : "nvd-page-fragment-view"}>
      {page.paragraphFragments.map((fragment) => (
        <p
          className="nvd-page-fragment-paragraph"
          key={`${fragment.pageIndex}-${fragment.paragraphIndex}-${fragment.start}-${fragment.end}`}
          style={{
            minHeight: `${Math.max(1, fragment.heightPx)}px`,
            textAlign: fragment.textAlign,
            top: `${fragment.topPx}px`,
          }}
        >
          {fragment.runs.map((run, runIndex) => (
            <span
              key={`${runIndex}-${run.text.length}-${fragment.start}`}
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
        </p>
      ))}
    </div>
  );
}
