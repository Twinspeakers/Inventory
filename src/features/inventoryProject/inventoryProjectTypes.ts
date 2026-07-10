export type InventoryIdentity = {
  name: string;
  createdAtUnix: number;
  updatedAtUnix: number;
};

export type InventoryDocumentEntry = {
  id: string;
  assetId: number;
  kind: string;
  title: string;
  path: string;
  createdAtUnix: number;
  updatedAtUnix: number;
};

export type InventoryDocumentsState = {
  nvdDocuments: InventoryDocumentEntry[];
  nvvDocuments: InventoryDocumentEntry[];
};

export type InventoryExportSettings = {
  conflictStrategy: "rename" | "overwrite" | "skip" | string;
  preserveEmptyFolders: boolean;
  lastExportRoot: string | null;
};

export type InventoryManifest<TAsset, TSourceFolder, TLibraryTree, TWorkspaceState = unknown> = {
  schemaVersion: number;
  kind: string;
  readme: string;
  inventory: InventoryIdentity;
  rootPath: string | null;
  sourceFolders: TSourceFolder[];
  assets: TAsset[];
  libraryTree: TLibraryTree[];
  workspaceState: TWorkspaceState;
  documents: InventoryDocumentsState;
  exportSettings: InventoryExportSettings;
  projectTagGroups?: unknown[];
  recentUserTagIds?: string[];
};

export type OpenedInventory<TAsset, TSourceFolder, TLibraryTree, TWorkspaceState = unknown> = {
  manifestPath: string;
  rootPath: string;
  manifest: InventoryManifest<TAsset, TSourceFolder, TLibraryTree, TWorkspaceState>;
};

export type ActiveInventory = {
  createdAtUnix: number;
  manifestFileName: string;
  manifestPath: string;
  name: string;
  rootPath: string;
};

export type NvdTextAlignment = "left" | "center" | "right" | "justify";

export type NvdEmbedAlignment = "left" | "center" | "right";

export type NvdEmbedDisplayMode = "fit" | "actual" | "custom";

export type NvdPageObjectWrapMode = "none" | "rectangle";

export type NvdPageObjectZMode = "behind-text" | "in-front-of-text";

export type NvdAssetEmbed = {
  assetId: number;
  assetKind: "image" | string;
  assetName: string;
  assetPath: string;
  alignment?: NvdEmbedAlignment;
  caption?: string;
  displayMode?: NvdEmbedDisplayMode;
  heightPx?: number;
  sourceDocumentKind?: "nvv" | string;
  widthPx?: number;
};

export type NvdPageObjectAsset = {
  assetId: number;
  assetKind: "image" | string;
  assetName: string;
  assetPath: string;
  sourceDocumentKind?: "nvv" | string;
};

export type NvdAssetFrameObject = {
  id: string;
  kind: "asset-frame";
  pageIndex: number;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  rotationDeg?: number;
  wrapMode?: NvdPageObjectWrapMode;
  zMode?: NvdPageObjectZMode;
  wrapPaddingPx?: number;
  asset?: NvdPageObjectAsset | null;
};

export type NvdPageObject = NvdAssetFrameObject;

export type NvdTextBlock = {
  id: string;
  kind: "paragraph" | "heading" | string;
  keepLinesTogether?: boolean;
  keepWithNext?: boolean;
  lineHeight?: number;
  orphanLineCount?: number;
  spaceAfterPt?: number;
  spaceBeforePt?: number;
  text: string;
  runs?: NvdTextRun[];
  textAlign?: NvdTextAlignment;
  widowLineCount?: number;
};

export type NvdEmbedBlock = {
  id: string;
  kind: "embed";
  embed: NvdAssetEmbed;
};

export type NvdBlock = NvdTextBlock | NvdEmbedBlock;

export type NvdTextStyle = {
  bold?: boolean;
  characterSpacingPt?: number;
  fontFamily?: string;
  fontSize?: string;
  italic?: boolean;
};

export type NvdTextRun = {
  text: string;
  style?: NvdTextStyle;
};

export type NvdLayoutMode = "paged";

export type NvdPageSizePreset = "a4" | "custom";

export type NvdPageLayout = {
  pageSize: NvdPageSizePreset;
  widthPt: number;
  heightPt: number;
  marginTopPt: number;
  marginRightPt: number;
  marginBottomPt: number;
  marginLeftPt: number;
};

export type NvdDocumentStyleDefinition = {
  bold: boolean;
  characterSpacingPt?: number;
  fontFamily: string;
  fontSizePt: number;
  italic: boolean;
  keepLinesTogether?: boolean;
  keepWithNext?: boolean;
  label: string;
  lineHeight?: number;
  orphanLineCount?: number;
  spaceAfterPt?: number;
  spaceBeforePt?: number;
  role: string;
  textAlign: NvdTextAlignment;
  widowLineCount?: number;
};

export type NvdDocument = {
  schemaVersion: number;
  kind: string;
  title: string;
  createdAtUnix: number;
  updatedAtUnix: number;
  fontFamily: string;
  fontSize: string;
  layoutMode: NvdLayoutMode;
  pageLayout?: NvdPageLayout;
  blocks: NvdBlock[];
  pageObjects?: NvdPageObject[];
  styles?: Record<string, NvdDocumentStyleDefinition>;
};

export type OpenedNvdDocument<TAsset = unknown> = {
  path: string;
  document: NvdDocument;
  entry: InventoryDocumentEntry;
  asset: TAsset;
};

export type NvvDocument = {
  canvasHeight: number;
  canvasWidth: number;
  createdAtUnix: number;
  kind: string;
  paths?: NvvPath[];
  schemaVersion: number;
  title: string;
  updatedAtUnix: number;
};

export type NvvPoint = {
  x: number;
  y: number;
};

export type NvvAnchorPoint = NvvPoint & {
  handleMode?: "corner" | "smooth";
  handleIn?: NvvPoint | null;
  handleOut?: NvvPoint | null;
};

export type NvvPath = {
  anchors: NvvAnchorPoint[];
  closed?: boolean;
  closedToAnchorIndex?: number | null;
  id: string;
  stroke: string;
  strokeWidth: number;
};

export type NvvDocumentChangeOptions = {
  history?: {
    before: NvvDocument;
    label: string;
  };
};

export type OpenedNvvDocument<TAsset = unknown> = {
  asset: TAsset;
  document: NvvDocument;
  entry: InventoryDocumentEntry;
  path: string;
};

export function toActiveInventory<TAsset, TSourceFolder, TLibraryTree, TWorkspaceState>(
  openedInventory: OpenedInventory<TAsset, TSourceFolder, TLibraryTree, TWorkspaceState>,
): ActiveInventory {
  return {
    createdAtUnix: openedInventory.manifest.inventory.createdAtUnix,
    manifestFileName: getBaseName(openedInventory.manifestPath),
    manifestPath: openedInventory.manifestPath,
    name: openedInventory.manifest.inventory.name,
    rootPath: openedInventory.rootPath,
  };
}

function getBaseName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
