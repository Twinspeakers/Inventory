import type { NvdPageLayout } from "../../inventoryProject";
import { NVD_PAGE_GAP_PX } from "../layout/nvdLayout";
import { getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import type { NvdPageFragment } from "../layout/nvdPageLayoutEngine";
import { NvdPageFragmentView } from "../rendering/NvdPageFragmentView";

export function NvdPagedTextLayer({
  defaultFontFamily,
  defaultFontSizePt,
  pageLayout,
  pages,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  pageLayout: NvdPageLayout;
  pages: readonly NvdPageFragment[];
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);

  return (
    <div className="nvd-paged-text-layer" aria-hidden="true">
      {pages.map((page) => (
        <div
          className="nvd-paged-text-page"
          key={page.index}
          style={{
            height: `${pageLayoutPx.contentHeightPx}px`,
            left: `${pageLayoutPx.marginLeftPx}px`,
            top: `${page.index * (pageLayoutPx.heightPx + NVD_PAGE_GAP_PX) + pageLayoutPx.marginTopPx}px`,
            width: `${pageLayoutPx.contentWidthPx}px`,
          }}
        >
          <NvdPageFragmentView
            className="nvd-paged-fragment-view"
            defaultFontFamily={defaultFontFamily}
            defaultFontSizePt={defaultFontSizePt}
            page={page}
          />
        </div>
      ))}
    </div>
  );
}
