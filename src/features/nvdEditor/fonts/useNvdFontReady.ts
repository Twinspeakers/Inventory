import { useEffect, useState } from "react";
import { getNvdFontFamily } from "./nvdFonts";

const nvdFontLoadSample = "Inventory document text 0123456789";

export function useNvdFontReady(fontFamily: string | null | undefined) {
  return useNvdFontsReady([getNvdFontFamily(fontFamily)]);
}

export function useNvdFontsReady(fontFamilies: Array<string | null | undefined>) {
  const normalizedFamilies = normalizeFontFamilies(fontFamilies);
  const fontFamiliesKey = normalizedFamilies.join("\u0000");
  const [readyFontFamiliesKey, setReadyFontFamiliesKey] = useState<string | null>(() =>
    areNvdFontsReady(normalizedFamilies) ? fontFamiliesKey : null,
  );

  useEffect(() => {
    let cancelled = false;

    if (areNvdFontsReady(normalizedFamilies)) {
      setReadyFontFamiliesKey(fontFamiliesKey);
      return;
    }

    setReadyFontFamiliesKey(null);

    if (typeof document === "undefined" || !document.fonts) {
      setReadyFontFamiliesKey(fontFamiliesKey);
      return;
    }

    Promise.all(
      normalizedFamilies.map((fontFamily) =>
        document.fonts.load(getNvdFontLoadDescriptor(fontFamily), nvdFontLoadSample).catch(() => {
          // The document's CSS fallback stack remains usable if a system font is unavailable.
        }),
      ),
    ).finally(() => {
        if (!cancelled) {
          setReadyFontFamiliesKey(fontFamiliesKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fontFamiliesKey]);

  return readyFontFamiliesKey === fontFamiliesKey;
}

function areNvdFontsReady(fontFamilies: string[]) {
  if (typeof document === "undefined" || !document.fonts) {
    return true;
  }

  return fontFamilies.every((fontFamily) => document.fonts.check(getNvdFontLoadDescriptor(fontFamily), nvdFontLoadSample));
}

function getNvdFontLoadDescriptor(fontFamily: string) {
  return `14px ${JSON.stringify(fontFamily)}`;
}

function normalizeFontFamilies(fontFamilies: Array<string | null | undefined>) {
  return [...new Set(fontFamilies.map((fontFamily) => getNvdFontFamily(fontFamily)))].sort((left, right) =>
    left.localeCompare(right),
  );
}
