export { customLibraryNodeTemplate } from "./customNode";
export {
  automaticCatalogTagIgnoredTerms,
  getBaseName,
  sourceFileExtensions,
  TAG_INFERENCE_VERSION,
  toAsset,
} from "./tag-inference";
export {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  getDefaultLibraryNodeTagsForName,
  isIgnoredLibraryMatchTerm,
  libraryNodeIgnoredMatchTerms,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  parseLibraryNodeTags,
} from "./normalization";
export { libraryTagDefinitions, libraryTagSourceSections } from "./tags";
export { allLibraryNodeTemplates, libraryNodeTemplates } from "./nodes";
export type {
  LibraryNodeFileType,
  LibraryNodeMatchField,
  LibraryNodeMatchRule,
  LibraryNodeTemplate,
  LibraryTagDefinition,
  LibraryTagKind,
} from "./types";
export type { LibraryTagSourceFile, LibraryTagSourceFolder, LibraryTagSourceSection } from "./tags";
