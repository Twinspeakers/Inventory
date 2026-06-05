import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { NvdDocument, NvdTextRun, OpenedNvdDocument } from "../inventoryProject";
import { getNvdFontCssStack, getNvdFontFamily, useNvdFontsReady } from "./fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "./nvdFontSize";
import { DEFAULT_NVD_LINE_HEIGHT } from "./nvdLineHeight";
import { DEFAULT_NVD_PARAGRAPH_SPACING_PT } from "./nvdParagraphSpacing";
import { getNvdLayoutMode, NVD_A4_PAGE_WIDTH_PX, paginateNvdTextRuns } from "./nvdLayout";
import { getNvdDocumentStyleDefinitions } from "./nvdStyles";
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
} from "./nvdRichText";

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
  const fontFamilies = useMemo(() => getNvdDocumentFontFamilies(document), [document]);
  const fontsReady = useNvdFontsReady(fontFamilies);
  const fontStyle = useMemo(
    () => ({
      fontFamily: getNvdFontCssStack(fontFamily),
      fontSize: getNvdThumbnailFontSizeCssValue(fontSizePt),
    }),
    [fontFamily, fontSizePt],
  );
  const layoutMode = getNvdLayoutMode(document?.layoutMode);
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
          runs: [],
        };
      }

      if (layoutMode !== "a4") {
        return {
          blockLayouts,
          runs,
        };
      }

      const firstPage = paginateNvdTextRuns(runs, fontFamily, fontSizePt, blockLayouts)[0];

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
        runs: firstPage?.runs ?? [],
      };
    },
    [blockLayouts, fontFamily, fontSizePt, fontsReady, layoutMode, runs],
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
    <div className={`nvd-thumbnail nvd-thumbnail-${layoutMode}`}>
      <div className={`nvd-thumbnail-page nvd-thumbnail-page-${layoutMode}`} style={fontStyle}>
        {isLoading || !fontsReady ? (
          <div className="space-y-1">
            <span className="block h-1 w-4/5 rounded-sm bg-surface-raised" />
            <span className="block h-1 w-full rounded-sm bg-surface-raised" />
            <span className="block h-1 w-11/12 rounded-sm bg-surface-raised" />
            <span className="block h-1 w-3/4 rounded-sm bg-surface-raised" />
          </div>
        ) : previewContent.runs.length > 0 ? (
          <NvdStyledTextPreview
            defaultFontFamily={fontFamily}
            defaultFontSizePt={fontSizePt}
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
  blockLayouts,
  runs,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
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
  runs,
}: {
  defaultFontFamily: string;
  defaultFontSizePt: number;
  runs: NvdTextRun[];
}) {
  return (
    <>
      {runs.map((run, runIndex) => (
        <span
          key={`${runIndex}-${run.text.length}`}
          style={{
            fontFamily: getNvdFontCssStack(getNvdTextRunFontFamily(run, defaultFontFamily)),
            fontSize: getNvdThumbnailFontSizeCssValue(getNvdTextRunFontSizePt(run, defaultFontSizePt)),
            fontStyle: isNvdTextRunItalic(run) ? "italic" : "normal",
            fontWeight: isNvdTextRunBold(run) ? 700 : 400,
            letterSpacing: getNvdThumbnailFontSizeCssValue(getNvdTextRunCharacterSpacingPt(run)),
          }}
        >
          {run.text}
        </span>
      ))}
    </>
  );
}

function getNvdThumbnailFontSizeCssValue(fontSizePt: number) {
  return `${(getNvdFontSizePx(fontSizePt) / NVD_A4_PAGE_WIDTH_PX) * 100}cqi`;
}

function pathsMatch(left: string, right: string) {
  const normalizedLeft = left.replace(/\\/g, "/");
  const normalizedRight = right.replace(/\\/g, "/");

  return normalizedLeft === normalizedRight || normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
}
