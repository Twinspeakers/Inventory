export const libraryNodeIgnoredMatchTerms = new Set([
  "a",
  "all",
  "all asset",
  "and",
  "any",
  "asset",
  "assets",
  "custom",
  "everything",
  "file",
  "files",
  "folder",
  "folders",
  "for",
  "inventory",
  "library",
  "master",
  "new",
  "node",
  "of",
  "the",
  "to",
]);

export function parseLibraryNodeTags(value: string) {
  return normalizeLibraryNodeTagValues(value.split(/[,;\n]+/));
}

export function normalizeLibraryNodeTagValues(values: Iterable<string>) {
  const tags = new Set<string>();

  for (const value of values) {
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
  }

  return [...tags];
}

export function getDefaultLibraryNodeTagsForName(name: string) {
  return normalizeLibraryNodeTagValues(normalizeLibraryMatchText(name).split(" "));
}

export function addNormalizedLibraryMatchTerm(terms: Set<string>, term: string) {
  const canonicalTerm = canonicalizeLibraryTag(term);

  if (!canonicalTerm || isIgnoredLibraryMatchTerm(canonicalTerm)) {
    return;
  }

  terms.add(canonicalTerm);
}

export function isIgnoredLibraryMatchTerm(term: string) {
  return libraryNodeIgnoredMatchTerms.has(term) || term.split(" ").every((part) => libraryNodeIgnoredMatchTerms.has(part));
}

export function canonicalizeLibraryTag(term: string) {
  if (term.endsWith("ies") && term.length > 4) {
    return `${term.slice(0, -3)}y`;
  }

  if (term.endsWith("s") && !term.endsWith("ss") && term.length > 3) {
    return term.slice(0, -1);
  }

  return term;
}

export function normalizedTextIncludesTerm(text: string, term: string) {
  if (!text || !term) {
    return false;
  }

  const paddedText = ` ${text} `;

  return paddedText.includes(` ${term} `) || (term.length > 3 && paddedText.includes(` ${term}s `)) || normalizedTextIncludesNumberedTerm(text, term);
}

function normalizedTextIncludesNumberedTerm(text: string, term: string) {
  if (term.includes(" ")) {
    return false;
  }

  return text.split(" ").some((token) => {
    const withoutTrailingDigits = token.replace(/\d+$/, "");
    return withoutTrailingDigits === term || (term.length > 3 && withoutTrailingDigits === `${term}s`);
  });
}

export function normalizeLibraryMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
