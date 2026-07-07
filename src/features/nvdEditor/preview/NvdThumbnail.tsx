import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { NvdDocument, NvdTextRun, OpenedNvdDocument } from "../../inventoryProject";
import { getNvdFontCssStack, getNvdFontFamily, useNvdFontsReady } from "../fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "../primitives/nvdFontSize";
import { DEFAULT_NVD_LINE_HEIGHT } from "../primitives/nvdLineHeight";
import { getNvdPageLayout, getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import { DEFAULT_NVD_PARAGRAPH_SPACING_PT } from "../primitives/nvdParagraphSpacing";
import { getNvdLayoutMode, layoutNvdTextRuns } from "../layout/nvdLayout";
import { NvdPageFragmentView } from "../a4/NvdPageFragmentView";
import { getNvdDocumentStyleDefinitions } from "../core/nvdStyles";
import {
  getNvdDocumentFontFamilies,
  getNvdDocumentBlockLayouts,
  getNvdDocumentRuns,
  getNvdTextRunCharacterSpacingPt,
  getNvdTextRunFontFamily,
  getNvdTextRunFontSizePt,
  isNvdTextRunBold,
  isNvdTextRunItalic,
  splitNvdTextRunsIntoParagraphs,
  type NvdBlockLayout,
} from "../core/nvdRichText";

type NvdThumbnailAsset = {
  name: string;
  path: string;
};

export function NvdThumbnail({
  asset,
  fallback,
  openedDocument,
}: {
  asset: NvdThumbnailAsset;
  fallback: ReactNode;
  openedDocument?: OpenedNvdDocument | null;
}) {
  const liveDocument =
    openedDocument && pathsMatch(openedDocument.path, asset.path) ? openedDocument.document : null;
  const usesLiveDocument = liveDocument !== null;
  const [savedDocument, setSavedDocument] = useState<NvdDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!usesLiveDocument);
  const document = liveDocument ?? savedDocument;
  const paragraphStyle = getNvdDocumentStyleDefinitions(document?.styles).p;
  const fontFamily = document ? paragraphStyle.fontFamily : getNvdFontFamily(null);
  const fontSizePt = document ? paragraphStyle.fontSizePt : getNvdFontSizePt(null);
  const layoutMode = getNvdLayoutMode(document?.layoutMode);
  const pageLayout = getNvdPageLayout(document?.pageLayout);
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const fontFamilies = useMemo(() => getNvdDocumentFontFamilies(document), [document]);
  const fontsReady = useNvdFontsReady(fontFamilies);
  const fontStyle = useMemo(
    () => ({
      fontFamily: getNvdFontCssStack(fontFamily),
      fontSize: getNvdThumbnailFontSizeCssValue(fontSizePt, pageLayoutPx.widthPx),
    }),
    [fontFamily, fontSizePt, pageLayoutPx.widthPx],
  );
  const runs = useMemo(() => (document ? getNvdDocumentRuns(document) : []), [document]);
  const blockLayouts = useMemo(
    () => (document ? getNvdDocumentBlockLayouts(document) : []),
    [document],
  );
  const previewContent = useMemo(
    () => {
      if (!fontsReady) {
        return {
          blockLayouts: [],
          firstPage: null,
          runs: [],
        };
      }

      if (layoutMode !== "a4") {
        return {
          blockLayouts,
          firstPage: null,
          runs,
        };
      }

      const firstPage = layoutNvdTextRuns(runs, fontFamily, fontSizePt, blockLayouts, pageLayout).pages[0] ?? null;

      return {
        blockLayouts:
          firstPage?.paragraphIndexes.map(
            (paragraphIndex) =>
              blockLayouts[paragraphIndex] ?? {
                kind: "p",
                lineHeight: DEFAULT_NVD_LINE_HEIGHT,
                spaceAfterPt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
                spaceBeforePt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
                textAlign: "left",
              },
          ) ?? [],
        firstPage,
        runs: firstPage?.runs ?? [],
      };
    },
    [blockLayouts, fontFamily, fontSizePt, fontsReady, layoutMode, pageLayout, runs],
  );

  useEffect(() => {
    let cancelled = false;

    setErrorMessage(null);

    if (usesLiveDocument) {
      setSavedDocument(null);
      setIsLoading(false);
      return;
    }

    setSavedDocument(null);
    setIsLoading(true);

    async function loadDocument() {
      try {
        const opened = await invoke<OpenedNvdDocument>("open_nvd_document", { path: asset.path });

        if (!cancelled) {
          setSavedDocument(opened.document);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`Could not render NVD: ${String(error)}`);
          setIsLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [asset.path, usesLiveDocument]);

  if (errorMessage) {
    return fallback;
  }

  return (
    <div
      className={`nvd-thumbnail nvd-thumbnail-${layoutMode}`}
      style={{ aspectRatio: `${pageLayoutPx.widthPx} / ${pageLayoutPx.heightPx}` }}
    >
      <div
        className={`nvd-thumbnail-page nvd-thumbnail-page-${layoutMode}`}
        style={{
          ...fontStyle,
          paddingBottom: `${(pageLayoutPx.marginBottomPx / pageLayoutPx.widthPx) * 100}%`,
          paddingLeft: `${(pageLayoutPx.marginLeftPx / pageLayoutPx.widthPx) * 100}%`,
          paddingRight: `${(pageLayoutPx.marginRightPx / pageLayoutPx.widthPx) * 100}%`,
          paddingTop: `${(pageLayoutPx.marginTopPx / pageLayoutPx.widthPx) * 100}%`,
        }}
      >
        {isLoading || !fontsReady ? (
          <div className="space-y-1">
            <span className="block h-1 w-4/5 rounded-sm bg-surface-raised" />
            <span className="block h-1 w-full rounded-sm bg-surface-raised" />
            <span className="block h-1 w-11/12 rounded-sm bg-surface-raised" />
            <span className="block h-1 w-3/4 rounded-sm bg-surface-raised" />
          </div>
        ) : layoutMode === "a4" && previewContent.firstPage ? (
          <NvdPageFragmentView
            className="nvd-thumbnail-fragment-view"
            defaultFontFamily={fontFamily}
            defaultFontSizePt={fontSizePt}
            page={previewContent.firstPage}
          />
        ) : previewContent.runs.length > 0 ? (
          <NvdStyledTextPreview
            defaultFontFamily={fontFamily}
            defaultFontSizePt={fontSizePt}
            pageWidthPx={pageLayoutPx.widthPx}
            blockLayouts={previewContent.blockLayouts}
            runs={previewContent.runs}
          />
        ) : null}
      </div>
    </div>
  );
}

function NvdStyledTextPreview({
  defaultFontFamily,
  defaultFontSizePt,
  pageWidthPx,
  blockLayouts,
  runs,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  pageWidthPx: number;
  blockLayouts: NvdBlockLayout[];
  runs: NvdTextRun[];
}) {
  const paragraphs = splitNvdTextRunsIntoParagraphs(runs);

  return (
    <>
      {paragraphs.map((paragraphRuns, paragraphIndex) => {
        const layout = blockLayouts[paragraphIndex] ?? {
          kind: "p",
          lineHeight: DEFAULT_NVD_LINE_HEIGHT,
          spaceAfterPt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
          spaceBeforePt: DEFAULT_NVD_PARAGRAPH_SPACING_PT,
          textAlign: "left",
        };

        return (
          <p
            className="nvd-thumbnail-text"
            key={paragraphIndex}
            style={{
              lineHeight: layout.lineHeight,
              marginBottom: `${layout.spaceAfterPt}pt`,
              marginTop: `${layout.spaceBeforePt}pt`,
              textAlign: layout.textAlign,
            }}
          >
            <NvdStyledRuns
              defaultFontFamily={defaultFontFamily}
              defaultFontSizePt={defaultFontSizePt}
              pageWidthPx={pageWidthPx}
              runs={paragraphRuns}
            />
          </p>
        );
      })}
    </>
  );
}

function NvdStyledRuns({
  defaultFontFamily,
  defaultFontSizePt,
  pageWidthPx,
  runs,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  pageWidthPx: number;
  runs: NvdTextRun[];
}) {
  return (
    <>
      {runs.map((run, runIndex) => (
        <span
          key={`${runIndex}-${run.text.length}`}
          style={{
            fontFamily: getNvdFontCssStack(getNvdTextRunFontFamily(run, defaultFontFamily)),
            fontSize: getNvdThumbnailFontSizeCssValue(getNvdTextRunFontSizePt(run, defaultFontSizePt), pageWidthPx),
            fontStyle: isNvdTextRunItalic(run) ? "italic" : "normal",
            fontWeight: isNvdTextRunBold(run) ? 700 : 400,
            letterSpacing: getNvdThumbnailFontSizeCssValue(getNvdTextRunCharacterSpacingPt(run), pageWidthPx),
          }}
        >
          {run.text}
        </span>
      ))}
    </>
  );
}

function getNvdThumbnailFontSizeCssValue(fontSizePt: number, pageWidthPx: number) {
  return `${(getNvdFontSizePx(fontSizePt) / pageWidthPx) * 100}cqi`;
}

function pathsMatch(left: string, right: string) {
  const normalizedLeft = left.replace(/\\/g, "/");
  const normalizedRight = right.replace(/\\/g, "/");

  return normalizedLeft === normalizedRight || normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
}
