import type { LucideIcon } from "lucide-react";
import type {
  AssetSortKey,
  AssetViewMode,
  DetailsColumnWidths,
  LibraryView,
  SortDirection,
} from "../features/assetShelf";
import type {
  InventoryManifest,
  OpenedInventory,
  OpenedNvdDocument,
  OpenedNvvDocument,
} from "../features/inventoryProject";
import type { NvdStyleRole } from "../features/nvdEditor";
import type { SceneMode } from "../features/sceneViewer";
import type {
  LibraryNodeFileType,
  LibraryNodeMatchField,
  LibraryNodeTemplate,
} from "../libraryCatalog";
import type { ModelTransform } from "../sceneReaders/threeModelReader";

export type AssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type NvdOutlineEntry = {
  blockIndex: number;
  depth: number;
  id: string;
  role: Exclude<NvdStyleRole, "p">;
  text: string;
};

export type NvdHistoryState = {
  canRedo: boolean;
  canUndo: boolean;
};

export type UndoContext = "library" | "nvd" | "nvv";

export type AssetAnalysisStatus = "idle" | "running" | "done" | "error";

export type AnalysisEvidenceCandidate = {
  accepted: boolean;
  mappedTagId: string | null;
  matchedTerms: string[];
  rawTagId: string;
  regionRole?: "background" | "primary" | "secondary";
  score: number;
  source: "caption" | "classifier";
};

export type ScannedAsset = {
  id: number;
  name: string;
  path: string;
  file_type: AssetType;
  extension: string;
  size_bytes: number;
  modified_unix: number | null;
  content_clues?: string[];
  analysis_caption?: string;
  analysis_evidence?: AnalysisEvidenceCandidate[];
  analysis_error?: string;
  analysis_file_signature?: string;
  analysis_status?: AssetAnalysisStatus;
  analysis_suggested_tags?: string[];
  analysis_version?: number;
  auto_tags?: string[];
  kept_tags?: string[];
  notes?: string;
  tags?: string[];
};

export type ScanResult = {
  root_path: string;
  assets: ScannedAsset[];
  skipped_entries: number;
};

export type SourceFolder = {
  id: string;
  path: string;
  name: string;
  assetIds: number[];
  skippedEntries: number;
  enabled: boolean;
};

export type ProjectTagDefinition = {
  id: string;
  label: string;
};

export type ProjectTagGroup = {
  id: string;
  label: string;
  tags: ProjectTagDefinition[];
};

export type PersistedLibraryState = {
  rootPath: string | null;
  assets: ScannedAsset[];
  sourceFolders?: SourceFolder[];
  projectTagGroups?: ProjectTagGroup[];
  recentUserTagIds?: string[];
  virtualFolders: VirtualFolder[];
};

export type PersistedWorkspaceState = {
  activeView: LibraryView;
  leftPaneView: LeftPaneView;
  sceneMode: SceneMode;
  selectedAssetId: number | null;
  selectedFolderId: string | null;
  hiddenDefaultLibraryViews?: LibraryView[];
  treeOpenNodeIds: string[];
  assetSortKey: AssetSortKey;
  assetSortDirection: SortDirection;
  assetViewMode: AssetViewMode;
  detailsColumnWidths: DetailsColumnWidths;
  assetSearchQuery: string;
  activeNvdDocumentPath: string | null;
  modelTransformOverrides: Record<string, ModelTransform>;
};

export type PersistedInventoryManifest = InventoryManifest<
  ScannedAsset,
  SourceFolder,
  VirtualFolder,
  PersistedWorkspaceState
>;

export type PersistedOpenedInventory = OpenedInventory<
  ScannedAsset,
  SourceFolder,
  VirtualFolder,
  PersistedWorkspaceState
>;

export type PersistedOpenedNvdDocument = OpenedNvdDocument<ScannedAsset>;

export type PersistedOpenedNvvDocument = OpenedNvvDocument<ScannedAsset>;

export type LeftPaneView = "library" | "nvd-navigation";

export type Asset = {
  id: number;
  name: string;
  path: string;
  type: AssetType;
  extension: string;
  size: string;
  sizeBytes: number;
  modified: string;
  modifiedUnix: number | null;
  analysisCaption: string;
  analysisEvidence: AnalysisEvidenceCandidate[];
  analysisError: string;
  analysisStatus: AssetAnalysisStatus;
  analysisSuggestedTags: string[];
  analysisVersion: number;
  autoTags: string[];
  defaultKeptTags: string[];
  keptTags: string[];
  systemTags: string[];
  tags: string[];
  userTags: string[];
  notes: string;
  color: string;
};

export type StructureNode = {
  id: string;
  label: string;
  assetId?: number;
  builtinView?: LibraryView;
  parentFolderId?: string | null;
  icon?: LucideIcon;
  canAddChild?: boolean;
  view?: LibraryView;
  folderId?: string;
  meta?: string;
  active?: boolean;
  descendantActive?: boolean;
  open?: boolean;
  children?: StructureNode[];
};

export type VirtualFolder = {
  id: string;
  name: string;
  assetIds: number[];
  excludedAssetIds?: number[];
  children: VirtualFolder[];
  diskPath?: string | null;
  isPlannedOnDisk?: boolean;
  pathSegment?: string;
  rules?: LibraryNodeRule[];
  suggestedTags?: string[];
  tags?: string[];
  templateId?: string | null;
  builtinView?: LibraryView;
};

export type LibraryNodeRuleOperator = "contains" | "equals";

export type LibraryNodeRule = {
  field: LibraryNodeMatchField;
  operator: LibraryNodeRuleOperator;
  value: string;
};

export type AddLibraryNodePanelState = {
  initialQuery: string;
  parentFolderId: string | null;
  parentLabel: string;
};

export type AddLibraryNodeDraft = {
  fileTypes: LibraryNodeFileType[];
  name: string;
  rules: LibraryNodeRule[];
  tags: string[];
  templateId: string | null;
};

export type AddLibraryNodeParentOption = {
  id: string | null;
  label: string;
};

export type AddFolderSuggestion = {
  category: string;
  description: string;
  fileTypes: LibraryNodeFileType[];
  icon: LucideIcon;
  id: string;
  name: string;
  source: "catalog" | "parent";
  tags: string[];
  template: LibraryNodeTemplate | null;
};

export type AssetPlacementSuggestion = {
  confidence: "high" | "low" | "medium";
  draft?: AddLibraryNodeDraft;
  folderId?: string;
  matchedTerms: string[];
  parentFolderId?: string | null;
  path: string[];
  reason: string;
  score: number;
  target: "existing" | "new";
};
