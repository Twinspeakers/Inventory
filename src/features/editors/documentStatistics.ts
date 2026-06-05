export type DocumentStatistics = {
  pages: number | null;
  scope: "document" | "selection";
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
};

const wordPattern = /[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu;

export function getDocumentStatistics(
  text: string,
  pages: number | null = null,
  scope: DocumentStatistics["scope"] = "document",
): DocumentStatistics {
  const words = text.match(wordPattern)?.length ?? 0;
  const characters = Array.from(text.replace(/[\r\n]/g, "")).length;
  const charactersWithoutSpaces = Array.from(text.replace(/\s/g, "")).length;

  return {
    pages,
    scope,
    words,
    characters,
    charactersWithoutSpaces,
  };
}
