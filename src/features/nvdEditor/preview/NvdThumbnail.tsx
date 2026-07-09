import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { NvdDocument, OpenedNvdDocument } from "../../inventoryProject";
import { getNvdFontCssStack, getNvdFontFamily, useNvdFontsReady } from "../fonts";
import { getNvdFontSizePt, getNvdFontSizePx } from "../primitives/nvdFontSize";
import { getNvdPageLayout, getNvdPageLayoutPx } from "../layout/nvdPageLayout";
import { layoutNvdDocument } from "../layout/nvdLayout";
import { NvdPageFragmentView } from "../rendering/NvdPageFragmentView";
import { getNvdDocumentStyleDefinitions } from "../document/nvdStyles";
import { getNvdDocumentFontFamilies } from "../document/nvdRichText";

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
  const styleDefinitions = getNvdDocumentStyleDefinitions(document?.styles);
  const paragraphStyle = styleDefinitions.p;
  const fontFamily = document ? paragraphStyle.fontFamily : getNvdFontFamily(null);
  const fontSizePt = document ? paragraphStyle.fontSizePt : getNvdFontSizePt(null);
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
  const previewContent = useMemo(
    () => {
      if (!fontsReady || !document) {
        return {
          firstPage: null,
        };
      }

      const firstPage = layoutNvdDocument(document).pages[0] ?? null;

      return {
        firstPage,
      };
    },
    [document, fontsReady],
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
    <div className="nvd-thumbnail nvd-thumbnail-paged" style={{ aspectRatio: `${pageLayoutPx.widthPx} / ${pageLayoutPx.heightPx}` }}>
      <div
        className="nvd-thumbnail-page nvd-thumbnail-page-paged"
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
        ) : previewContent.firstPage ? (
          <NvdPageFragmentView
            className="nvd-thumbnail-fragment-view"
            defaultFontFamily={fontFamily}
            defaultFontSizePt={fontSizePt}
            page={previewContent.firstPage}
          />
        ) : null}
      </div>
    </div>
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
