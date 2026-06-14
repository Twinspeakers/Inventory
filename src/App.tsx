import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  addNormalizedLibraryMatchTerm,
  canonicalizeLibraryTag,
  customLibraryNodeTemplate,
  getDefaultLibraryNodeTagsForName,
  isIgnoredLibraryMatchTerm,
  libraryNodeIgnoredMatchTerms,
  libraryNodeTemplates,
  libraryTagDefinitions,
  libraryTagSourceSections,
  normalizeLibraryMatchText,
  normalizeLibraryNodeTagValues,
  normalizedTextIncludesTerm,
  type LibraryNodeFileType,
  type LibraryNodeMatchField,
  type LibraryNodeMatchRule,
  type LibraryNodeTemplate,
  type LibraryTagDefinition,
  type LibraryTagSourceFolder,
  type LibraryTagSourceSection,
} from "./libraryCatalog";
import {
  AssetShelf,
  COLLAPSED_ASSET_SHELF_HEIGHT,
  MIN_ASSET_SHELF_HEIGHT,
  MIN_PREVIEW_STAGE_HEIGHT,
  defaultDetailsColumnWidths,
  type AssetSortKey,
  type AssetViewMode,
  type DetailsColumnKey,
  type DetailsColumnWidths,
  type LibraryView,
  type SortDirection,
} from "./features/assetShelf";
import {
  COLLAPSED_SIDE_PANE_WIDTH,
  DEFAULT_LEFT_PANE_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  DEFAULT_SOURCE_SECTION_HEIGHT,
  MAX_LEFT_PANE_WIDTH,
  MAX_RIGHT_PANE_WIDTH,
  MAX_SOURCE_SECTION_HEIGHT,
  MIN_LEFT_PANE_WIDTH,
  MIN_MAIN_PANE_WIDTH,
  MIN_RIGHT_PANE_WIDTH,
  MIN_SOURCE_SECTION_HEIGHT,
  assetShelfStorageKeys,
  clamp,
  defaultTreeOpenNodeIds,
  getWorkspaceGridWidth,
  isAssetSortKey,
  isAssetViewMode,
  isLayoutResizeInProgress,
  isPrimaryPointer,
  layoutResizeEndEvent,
  layoutStorageKeys,
  normalizeDetailsColumnWidths,
  normalizeModelTransformOverrides,
  projectStorageKeys,
  readStoredAssetSortKey,
  readStoredAssetViewMode,
  readStoredBoolean,
  readStoredDetailsColumnWidths,
  readStoredNumber,
  readStoredOptionalNumber,
  readStoredSortDirection,
  readStoredString,
  readStoredStringSet,
  removeStoredNumber,
  removeStoredString,
  storeNumber,
  storeString,
  storeStringSet,
} from "./appLayout";
import {
  LibraryNodeContextMenu,
  SourceFolderContextMenu,
  type LibraryNodeContextMenuState,
  type SourceFolderContextMenuState,
} from "./ContextMenus";
import { MenuBar } from "./MenuBar";
import {
  toActiveInventory,
  type ActiveInventory,
  type InventoryDocumentEntry,
  type InventoryDocumentsState,
  type InventoryManifest,
  type NvdDocument,
  type NvvDocument,
  type NvvDocumentChangeOptions,
  type OpenedInventory,
  type OpenedNvdDocument,
  type OpenedNvvDocument,
} from "./features/inventoryProject";
import { Inspector } from "./features/inspector";
import {
  getNvdDocumentFontFamilies,
  getNvdDocumentStyleDefinitions,
  getNvdDocumentText,
  getNvdLayoutMode,
  getNvdStyleRole,
  paginateNvdDocument,
  useNvdFontsReady,
  type NvdEditorController,
  type NvdTextSelection,
  DEFAULT_NVD_STYLE_DEFINITIONS,
  type NvdStyleDefinition,
  type NvdStyleRole,
} from "./features/nvdEditor";
import {
  canSaveActiveEditorFile,
  EMPTY_SESSION_HISTORY,
  addSessionHistoryCommand,
  executeSaveFileCommand,
  getDocumentStatistics,
  isSaveFileShortcut,
  redoSessionHistory,
  undoSessionHistory,
  type ActiveEditorCommands,
  type EditorSaveState,
  type SessionHistory,
  type SessionHistoryCommand,
} from "./features/editors";
import {
  SettingsPanel,
  areThemeColorsEqual,
  isHexColor,
  premadeThemes,
  readCustomThemes,
  readNvdSaveReminderEnabled,
  readNvdStyleResetConfirmationEnabled,
  readStoredThemeColors,
  readStoredThemeEditorLayout,
  readStoredThemeId,
  readStoredThemeName,
  storeCustomThemes,
  storeNvdSaveReminderEnabled,
  storeNvdStyleResetConfirmationEnabled,
  storeSelectedThemeId,
  storeThemeEditorLayout,
  themeColorsToCssVariables,
  type ThemeColors,
  type ThemeDefinition,
  type ThemeEditorLayout,
} from "./features/settings";
import { PreviewStage, type SceneMode } from "./features/sceneViewer";
import { isPlayableAudioAsset, isWaveAudioAsset, playAssetAudioOnce } from "./sceneReaders/audioReader";
import {
  cloneModelTransform,
  type ModelInspectorResult,
  type ModelTransform,
} from "./sceneReaders/threeModelReader";
import {
  Archive,
  ArrowLeft,
  Backpack,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  ListTree,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

type AssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";
type NvdOutlineEntry = {
  blockIndex: number;
  depth: number;
  id: string;
  role: Exclude<NvdStyleRole, "p">;
  text: string;
};
type NvdHistoryState = {
  canRedo: boolean;
  canUndo: boolean;
};
type UndoContext = "library" | "nvd" | "nvv";

type ScannedAsset = {
  id: number;
  name: string;
  path: string;
  file_type: AssetType;
  extension: string;
  size_bytes: number;
  modified_unix: number | null;
  kept_tags?: string[];
  notes?: string;
  tags?: string[];
};

type ScanResult = {
  root_path: string;
  assets: ScannedAsset[];
  skipped_entries: number;
};

type SourceFolder = {
  id: string;
  path: string;
  name: string;
  assetIds: number[];
  skippedEntries: number;
  enabled: boolean;
};

type PersistedLibraryState = {
  rootPath: string | null;
  assets: ScannedAsset[];
  sourceFolders?: SourceFolder[];
  virtualFolders: VirtualFolder[];
};

type PersistedWorkspaceState = {
  activeView: LibraryView;
  leftPaneView: LeftPaneView;
  sceneMode: SceneMode;
  selectedAssetId: number | null;
  selectedFolderId: string | null;
  treeOpenNodeIds: string[];
  assetSortKey: AssetSortKey;
  assetSortDirection: SortDirection;
  assetViewMode: AssetViewMode;
  detailsColumnWidths: DetailsColumnWidths;
  assetSearchQuery: string;
  activeNvdDocumentPath: string | null;
  modelTransformOverrides: Record<string, ModelTransform>;
};

type PersistedInventoryManifest = InventoryManifest<ScannedAsset, SourceFolder, VirtualFolder, PersistedWorkspaceState>;

type PersistedOpenedInventory = OpenedInventory<ScannedAsset, SourceFolder, VirtualFolder, PersistedWorkspaceState>;

type PersistedOpenedNvdDocument = OpenedNvdDocument<ScannedAsset>;
type PersistedOpenedNvvDocument = OpenedNvvDocument<ScannedAsset>;

type LeftPaneView = "library" | "nvd-navigation";

type Asset = {
  id: number;
  name: string;
  path: string;
  type: AssetType;
  extension: string;
  size: string;
  sizeBytes: number;
  modified: string;
  modifiedUnix: number | null;
  defaultKeptTags: string[];
  keptTags: string[];
  systemTags: string[];
  tags: string[];
  userTags: string[];
  notes: string;
  color: string;
};

type StructureNode = {
  id: string;
  label: string;
  assetId?: number;
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

type VirtualFolder = {
  id: string;
  name: string;
  assetIds: number[];
  children: VirtualFolder[];
  diskPath?: string | null;
  isPlannedOnDisk?: boolean;
  pathSegment?: string;
  rules?: LibraryNodeRule[];
  suggestedTags?: string[];
  tags?: string[];
  templateId?: string | null;
};

type LibraryNodeRuleOperator = "contains" | "equals";

type LibraryNodeRule = {
  field: LibraryNodeMatchField;
  operator: LibraryNodeRuleOperator;
  value: string;
};

type AddLibraryNodePanelState = {
  initialQuery: string;
  parentFolderId: string | null;
  parentLabel: string;
};

type AddLibraryNodeDraft = {
  fileTypes: LibraryNodeFileType[];
  name: string;
  rules: LibraryNodeRule[];
  tags: string[];
  templateId: string | null;
};

type AddLibraryNodeParentOption = {
  id: string | null;
  label: string;
};

type AddFolderSuggestion = {
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

type AssetPlacementSuggestion = {
  draft?: AddLibraryNodeDraft;
  folderId?: string;
  matchedTerms: string[];
  parentFolderId?: string | null;
  path: string[];
  reason: string;
  score: number;
  target: "existing" | "new";
};

const initialVirtualFolders: VirtualFolder[] = [];
const starterLibraryNodeIds = new Set(["vf-tavern", "vf-tavern-props", "vf-tavern-lighting", "vf-fishing", "vf-icons"]);
const defaultTopLevelLibraryNodeTemplateIds: Record<AssetType, string> = {
  "3D": "3d-objects",
  Image: "images",
  Audio: "audio",
  Document: "documents",
  Archive: "archives",
};

const typeIcons: Record<AssetType, LucideIcon> = {
  Image: FileImage,
  "3D": Box,
  Audio: FileAudio,
  Document: FileText,
  Archive,
};

const typeColors: Record<AssetType, string> = {
  Image: "bg-surface-raised",
  "3D": "bg-surface-raised",
  Audio: "bg-copper",
  Document: "bg-violet",
  Archive: "bg-amber",
};

const sourceFileExtensions = new Set([
  "ai",
  "blend",
  "eps",
  "gd",
  "godot",
  "js",
  "json",
  "mat",
  "prefab",
  "psb",
  "psd",
  "py",
  "rs",
  "shader",
  "tres",
  "ts",
  "tscn",
  "tsx",
  "unity",
  "unitypackage",
]);

const fileTypeAutomaticTags: Record<AssetType, string[]> = {
  Archive: ["archive"],
  Audio: ["audio"],
  Document: ["document"],
  Image: ["image"],
  "3D": ["3d"],
};

const extensionAutomaticTags: Record<string, string[]> = {
  ai: ["illustrator", "vector"],
  blend: ["blender"],
  csv: ["data"],
  dds: ["texture"],
  eps: ["vector"],
  exr: ["hdr"],
  gd: ["godot", "code"],
  gif: ["animated"],
  hdr: ["hdr"],
  ico: ["icon"],
  js: ["code"],
  json: ["data"],
  license: ["license", "legal"],
  mat: ["unity", "material"],
  md: ["markdown", "note"],
  pdf: ["pdf"],
  prefab: ["unity"],
  psb: ["photoshop"],
  psd: ["photoshop"],
  py: ["code"],
  rs: ["code", "rust"],
  shader: ["shader", "code"],
  svg: ["svg", "vector"],
  tga: ["texture"],
  tres: ["godot"],
  ts: ["code", "typescript"],
  tscn: ["godot"],
  tsx: ["code", "typescript"],
  txt: ["text", "note"],
  unity: ["unity"],
  unitypackage: ["unity", "package"],
  usd: ["scene"],
  usdz: ["scene"],
  xml: ["data"],
  yaml: ["data"],
  yml: ["data"],
};

const TAG_INFERENCE_VERSION = 13;
const MAX_AUTOMATIC_REGISTRY_TAGS = 24;
const MAX_AUTOMATIC_CATALOG_TAGS = 18;
const MAX_CATALOG_EXPANSION_TAGS_PER_TEMPLATE = 4;

const automaticCatalogTagIgnoredTerms = new Set([
  ...libraryNodeIgnoredMatchTerms,
  "archive",
  "audio",
  "cities",
  "city",
  "document",
  "editable",
  "godot",
  "image",
  "mesh",
  "meshes",
  "model",
  "models",
  "package",
  "source",
  "sources",
  "visual",
]);

const assetPlacementNameNoiseTerms = new Set([
  ...automaticCatalogTagIgnoredTerms,
  "2d",
  "3d",
  "avif",
  "fbx",
  "flac",
  "glb",
  "gltf",
  "jpeg",
  "jpg",
  "mp3",
  "ogg",
  "obj",
  "pdf",
  "png",
  "stl",
  "svg",
  "texture",
  "wav",
  "webp",
]);

const audioSoundEffectTerms = [
  "sfx",
  "fx",
  "effect",
  "sound effect",
  "sound effects",
  "soundeffect",
  "soundeffects",
  "sound fx",
  "soundfx",
  "one shot",
  "one-shot",
  "oneshot",
  "foley",
  "ui",
  "button",
  "click",
  "tap",
  "pop",
  "beep",
  "confirm",
  "select",
  "hit",
  "impact",
  "step",
  "footstep",
  "whoosh",
  "pickup",
  "drop",
  "open",
  "close",
  "door",
  "chest",
  "coin",
  "jump",
  "land",
  "chop",
  "chopping",
  "axe",
  "swing",
  "slash",
  "punch",
  "explosion",
  "explode",
  "attack",
  "cast",
  "collect",
  "damage",
  "death",
  "equip",
  "error",
  "fail",
  "fireball",
  "gun",
  "hover",
  "hurt",
  "item",
  "laser",
  "lose",
  "magic",
  "menu",
  "reload",
  "shoot",
  "shot",
  "spawn",
  "spell",
  "success",
  "unequip",
  "weapon",
  "win",
];

const audioImpactTerms = [
  "impact",
  "anvil",
  "axe",
  "chop",
  "chopping",
  "chopped",
  "hit",
  "strike",
  "thud",
  "bang",
  "boom",
  "bump",
  "crack",
  "crash",
  "smash",
  "snap",
  "slam",
  "collide",
  "collision",
  "knock",
  "clank",
  "clang",
  "hammer",
  "metal",
  "wood",
  "stone",
  "punch",
  "kick",
  "drop",
  "land",
  "fall",
  "break",
  "breaks",
  "broken",
  "shatter",
];

const audioNonSoundEffectTerms = [
  "ambient",
  "ambience",
  "atmo",
  "dialogue",
  "loop",
  "music",
  "narration",
  "score",
  "song",
  "stem",
  "theme",
  "track",
  "voice",
  "voiceover",
  "vo",
];

const likelySoundEffectAudioExtensions = new Set(["aif", "aiff", "flac", "ogg", "wav"]);
const libraryTagDefinitionsByKey = createLibraryTagDefinitionLookup(libraryTagDefinitions);

const modelPolyTagThresholds = {
  low: 5_000,
  high: 50_000,
  veryHigh: 250_000,
};

export function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [sourceFolders, setSourceFolders] = useState<SourceFolder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<LibraryView>("all");
  const [leftPaneView, setLeftPaneView] = useState<LeftPaneView>("library");
  const [sceneMode, setSceneMode] = useState<SceneMode>("preview");
  const [activeNvdDocument, setActiveNvdDocument] = useState<PersistedOpenedNvdDocument | null>(null);
  const [activeNvdDocumentPath, setActiveNvdDocumentPath] = useState<string | null>(null);
  const [activeNvvDocument, setActiveNvvDocument] = useState<PersistedOpenedNvvDocument | null>(null);
  const [nvvSaveState, setNvvSaveState] = useState<EditorSaveState>("idle");
  const [activeNvdTextSelection, setActiveNvdTextSelection] = useState<NvdTextSelection | null>(null);
  const [nvdStyleDefinitions, setNvdStyleDefinitions] = useState(() => ({ ...DEFAULT_NVD_STYLE_DEFINITIONS }));
  const [activeNvdStyleRole, setActiveNvdStyleRole] = useState<NvdStyleRole | null>(null);
  const [nvdStyleDraft, setNvdStyleDraft] = useState<NvdStyleDefinition | null>(null);
  const [activeNvdCharacterSpacingPt, setActiveNvdCharacterSpacingPt] = useState<number | null>(null);
  const [activeNvdLineHeight, setActiveNvdLineHeight] = useState<number | null>(null);
  const [activeNvdSpaceAfterPt, setActiveNvdSpaceAfterPt] = useState<number | null>(null);
  const [activeNvdSpaceBeforePt, setActiveNvdSpaceBeforePt] = useState<number | null>(null);
  const [nvdSaveState, setNvdSaveState] = useState<EditorSaveState>("idle");
  const [nvdSaveReminderEnabled, setNvdSaveReminderEnabled] = useState(() => readNvdSaveReminderEnabled());
  const [nvdStyleResetConfirmationEnabled, setNvdStyleResetConfirmationEnabled] = useState(() =>
    readNvdStyleResetConfirmationEnabled(),
  );
  const [pendingNvdStyleResetRole, setPendingNvdStyleResetRole] = useState<NvdStyleRole | null>(null);
  const [hideFutureNvdStyleResetConfirmations, setHideFutureNvdStyleResetConfirmations] = useState(true);
  const [isNvdCloseConfirmationOpen, setIsNvdCloseConfirmationOpen] = useState(false);
  const hasUnsavedNvdChanges = nvdSaveState === "dirty" || nvdSaveState === "error";
  const [inventoryDocuments, setInventoryDocuments] = useState<InventoryDocumentsState>(() => ({ nvdDocuments: [], nvvDocuments: [] }));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>(initialVirtualFolders);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
  const [activeInventory, setActiveInventory] = useState<ActiveInventory | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(() =>
    readStoredNumber(layoutStorageKeys.leftPaneWidth, DEFAULT_LEFT_PANE_WIDTH, MIN_LEFT_PANE_WIDTH, MAX_LEFT_PANE_WIDTH),
  );
  const [rightPaneWidth, setRightPaneWidth] = useState(() =>
    readStoredNumber(layoutStorageKeys.rightPaneWidth, DEFAULT_RIGHT_PANE_WIDTH, MIN_RIGHT_PANE_WIDTH, MAX_RIGHT_PANE_WIDTH),
  );
  const [leftPaneCollapsed, setLeftPaneCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.leftPaneCollapsed, false));
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.rightPaneCollapsed, false));
  const [assetShelfHeight, setAssetShelfHeight] = useState(() => readStoredOptionalNumber(layoutStorageKeys.assetShelfHeight, MIN_ASSET_SHELF_HEIGHT));
  const [assetShelfCollapsed, setAssetShelfCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.assetShelfCollapsed, false));
  const [sourceSectionHeight, setSourceSectionHeight] = useState(() =>
    readStoredNumber(layoutStorageKeys.sourceSectionHeight, DEFAULT_SOURCE_SECTION_HEIGHT, MIN_SOURCE_SECTION_HEIGHT, MAX_SOURCE_SECTION_HEIGHT),
  );
  const [sourceSectionCollapsed, setSourceSectionCollapsed] = useState(() => readStoredBoolean(layoutStorageKeys.sourceSectionCollapsed, false));
  const [treeOpenNodeIds, setTreeOpenNodeIds] = useState(() => readStoredStringSet(layoutStorageKeys.treeOpenNodeIds, defaultTreeOpenNodeIds));
  const [assetSortKey, setAssetSortKey] = useState<AssetSortKey>(() => readStoredAssetSortKey());
  const [assetSortDirection, setAssetSortDirection] = useState<SortDirection>(() => readStoredSortDirection());
  const [assetViewMode, setAssetViewMode] = useState<AssetViewMode>(() => readStoredAssetViewMode());
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [detailsColumnWidths, setDetailsColumnWidths] = useState<DetailsColumnWidths>(() => readStoredDetailsColumnWidths());
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() => readCustomThemes());
  const [selectedThemeId, setSelectedThemeId] = useState(() => readStoredThemeId());
  const [themeColors, setThemeColors] = useState<ThemeColors>(() => readStoredThemeColors());
  const [themeName, setThemeName] = useState(() => readStoredThemeName());
  const [themeEditorLayout, setThemeEditorLayout] = useState<ThemeEditorLayout>(() => readStoredThemeEditorLayout());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTagBrowserOpen, setIsTagBrowserOpen] = useState(false);
  const [libraryNodeContextMenu, setLibraryNodeContextMenu] = useState<LibraryNodeContextMenuState | null>(null);
  const [sourceFolderContextMenu, setSourceFolderContextMenu] = useState<SourceFolderContextMenuState | null>(null);
  const [addLibraryNodePanel, setAddLibraryNodePanel] = useState<AddLibraryNodePanelState | null>(null);
  const [statusMessage, setStatusMessage] = useState("Create or open an Inventory to begin.");
  const [modelInspectorResults, setModelInspectorResults] = useState<Record<string, ModelInspectorResult>>({});
  const [modelTransformOverrides, setModelTransformOverrides] = useState<Record<string, ModelTransform>>({});
  const [nvdHistoryState, setNvdHistoryState] = useState<NvdHistoryState>({ canRedo: false, canUndo: false });
  const [libraryHistory, setLibraryHistory] = useState<SessionHistory>(EMPTY_SESSION_HISTORY);
  const [nvvHistory, setNvvHistory] = useState<SessionHistory>(EMPTY_SESSION_HISTORY);
  const [undoContext, setUndoContext] = useState<UndoContext>("library");
  const saveTimer = useRef<number | null>(null);
  const activeEditorCommandsRef = useRef<ActiveEditorCommands | null>(null);
  const nvdEditorControllerRef = useRef<NvdEditorController | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);

  const availableThemes = useMemo(() => [...premadeThemes, ...customThemes], [customThemes]);
  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === selectedThemeId) ?? premadeThemes[1],
    [availableThemes, selectedThemeId],
  );
  const selectedThemeIsBuiltin = Boolean(selectedTheme.builtin);
  const themeStyle = useMemo(() => themeColorsToCssVariables(themeColors), [themeColors]);
  const allAssets = useMemo(
    () => scanResult?.assets.map((asset) => toAsset(asset, modelInspectorResults[getScannedAssetModelKey(asset)])) ?? [],
    [modelInspectorResults, scanResult, TAG_INFERENCE_VERSION],
  );
  const inventoryDocumentPaths = useMemo(
    () => new Set([...inventoryDocuments.nvdDocuments, ...inventoryDocuments.nvvDocuments].map((document) => normalizePath(document.path))),
    [inventoryDocuments],
  );
  const inventoryDocumentAssetIds = useMemo(
    () => new Set([...inventoryDocuments.nvdDocuments, ...inventoryDocuments.nvvDocuments].map((document) => document.assetId)),
    [inventoryDocuments],
  );
  const assets = useMemo(
    () => filterAssetsByEnabledSources(allAssets, sourceFolders, inventoryDocumentPaths),
    [allAssets, inventoryDocumentPaths, sourceFolders],
  );
  const masterLibraryAssets = useMemo(
    () => assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path))),
    [assets, inventoryDocumentPaths],
  );
  const currentLibraryState = useMemo(
    () =>
      ({
        rootPath: sourceFolders[0]?.path ?? scanResult?.root_path ?? null,
        assets: scanResult?.assets ?? [],
        sourceFolders: sourceFolders.map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter((assetId) => !inventoryDocumentAssetIds.has(assetId)),
        })),
        virtualFolders: removeAssetIdsFromVirtualFolders(virtualFolders, inventoryDocumentAssetIds),
      }) satisfies PersistedLibraryState,
    [inventoryDocumentAssetIds, scanResult, sourceFolders, virtualFolders],
  );
  const sourceSummary = useMemo(() => getSourceSummary(sourceFolders), [sourceFolders]);
  const activeFolder = selectedFolderId ? findFolder(virtualFolders, selectedFolderId) : null;
  const assetTagSuggestions = useMemo(() => getAssetTagSuggestions(masterLibraryAssets, virtualFolders), [masterLibraryAssets, virtualFolders]);
  const visibleAssets = useMemo(
    () => filterAssets(activeView, assets, selectedFolderId, virtualFolders, inventoryDocumentPaths),
    [activeView, assets, inventoryDocumentPaths, selectedFolderId, virtualFolders],
  );
  const sortedVisibleAssets = useMemo(
    () => sortAssets(visibleAssets, assetSortKey, assetSortDirection),
    [assetSortDirection, assetSortKey, visibleAssets],
  );
  const searchFilteredVisibleAssets = useMemo(
    () => filterAssetsBySearchQuery(visibleAssets, assetSearchQuery),
    [assetSearchQuery, visibleAssets],
  );
  const sortedShelfAssets = useMemo(
    () => sortAssets(searchFilteredVisibleAssets, assetSortKey, assetSortDirection),
    [assetSortDirection, assetSortKey, searchFilteredVisibleAssets],
  );
  const selectedVisibleAsset = sortedVisibleAssets.find((asset) => asset.id === selectedId) ?? null;
  const selectedAsset =
    selectedId === null
      ? null
      : selectedFolderId
        ? selectedVisibleAsset ?? sortedVisibleAssets[0] ?? null
        : assets.find((asset) => asset.id === selectedId) ?? sortedVisibleAssets[0] ?? null;
  const currentWorkspaceState = useMemo(
    () =>
      ({
        activeView,
        leftPaneView,
        sceneMode,
        selectedAssetId: selectedAsset?.id ?? selectedId,
        selectedFolderId,
        treeOpenNodeIds: [...treeOpenNodeIds],
        assetSortKey,
        assetSortDirection,
        assetViewMode,
        detailsColumnWidths,
        assetSearchQuery,
        activeNvdDocumentPath,
        modelTransformOverrides,
      }) satisfies PersistedWorkspaceState,
    [
      activeNvdDocumentPath,
      activeView,
      assetSearchQuery,
      assetSortDirection,
      assetSortKey,
      assetViewMode,
      detailsColumnWidths,
      leftPaneView,
      modelTransformOverrides,
      sceneMode,
      selectedAsset?.id,
      selectedFolderId,
      selectedId,
      treeOpenNodeIds,
    ],
  );
  const assetPlacementSuggestions = useMemo(
    () =>
      selectedAsset && !inventoryDocumentPaths.has(normalizePath(selectedAsset.path))
        ? getAssetPlacementSuggestions(selectedAsset, virtualFolders, masterLibraryAssets)
        : [],
    [inventoryDocumentPaths, masterLibraryAssets, selectedAsset, virtualFolders],
  );
  const selectedModelKey = selectedAsset?.type === "3D" ? getAssetModelKey(selectedAsset) : null;
  const selectedModelInspectorResult = selectedModelKey ? (modelInspectorResults[selectedModelKey] ?? null) : null;
  const selectedModelTransformOverride = selectedModelKey ? modelTransformOverrides[selectedModelKey] : undefined;
  const selectedDocumentFontsReady = useNvdFontsReady(getNvdDocumentFontFamilies(activeNvdDocument?.document));
  const deferredActiveNvdDocument = useDeferredValue(activeNvdDocument);
  const deferredDocumentPageCount = useMemo(() => {
    if (
      !selectedAsset ||
      !deferredActiveNvdDocument ||
      normalizePath(selectedAsset.path) !== normalizePath(deferredActiveNvdDocument.path) ||
      getNvdLayoutMode(deferredActiveNvdDocument.document.layoutMode) !== "a4" ||
      !selectedDocumentFontsReady
    ) {
      return null;
    }

    return paginateNvdDocument(deferredActiveNvdDocument.document).length;
  }, [deferredActiveNvdDocument, selectedAsset, selectedDocumentFontsReady]);
  const selectedDocumentStatistics = useMemo(() => {
    if (
      !selectedAsset ||
      !activeNvdDocument ||
      normalizePath(selectedAsset.path) !== normalizePath(activeNvdDocument.path)
    ) {
      return null;
    }

    const document = activeNvdDocument.document;
    const text = getNvdDocumentText(document);
    const selectionStart = clamp(activeNvdTextSelection?.start ?? 0, 0, text.length);
    const selectionEnd = clamp(activeNvdTextSelection?.end ?? selectionStart, selectionStart, text.length);

    if (selectionEnd > selectionStart) {
      return getDocumentStatistics(text.slice(selectionStart, selectionEnd), null, "selection");
    }

    const pages = getNvdLayoutMode(document.layoutMode) === "a4" ? deferredDocumentPageCount : null;

    return getDocumentStatistics(text, pages);
  }, [activeNvdDocument, activeNvdTextSelection, deferredDocumentPageCount, selectedAsset]);
  const structure = useMemo(
    () =>
      buildStructure(
        activeView,
        assets,
        virtualFolders,
        selectedFolderId,
        selectedAsset?.id ?? null,
        treeOpenNodeIds,
        inventoryDocumentPaths,
      ),
    [activeView, assets, inventoryDocumentPaths, selectedAsset?.id, selectedFolderId, treeOpenNodeIds, virtualFolders],
  );
  const workspaceGridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: `${leftPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : leftPaneWidth}px minmax(${MIN_MAIN_PANE_WIDTH}px, 1fr) ${
          rightPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : rightPaneWidth
        }px`,
      }) satisfies CSSProperties,
    [leftPaneCollapsed, leftPaneWidth, rightPaneCollapsed, rightPaneWidth],
  );
  const activeEditorCommands: ActiveEditorCommands | null =
    sceneMode === "nvd-document"
      ? {
          editorId: "nvd-document",
          fileName: activeNvdDocument?.document.title ?? null,
          canSave: Boolean(activeNvdDocument),
          saveState: nvdSaveState,
          saveFile: async () => {
            await saveActiveNvdDocument();
          },
        }
      : sceneMode === "nvv-document"
        ? {
            editorId: "nvv-document",
            fileName: activeNvvDocument?.document.title ?? null,
            canSave: Boolean(activeNvvDocument),
            saveState: nvvSaveState,
            saveFile: async () => {
              await saveActiveNvvDocument();
            },
          }
        : null;
  const canSaveFile = canSaveActiveEditorFile(activeEditorCommands);
  const usesNvdHistory = undoContext === "nvd" && sceneMode === "nvd-document";
  const usesNvvHistory = undoContext === "nvv" && sceneMode === "nvv-document";
  const libraryUndoCommand = libraryHistory.undoStack[libraryHistory.undoStack.length - 1];
  const libraryRedoCommand = libraryHistory.redoStack[libraryHistory.redoStack.length - 1];
  const nvvUndoCommand = nvvHistory.undoStack[nvvHistory.undoStack.length - 1];
  const nvvRedoCommand = nvvHistory.redoStack[nvvHistory.redoStack.length - 1];
  const canUndo = usesNvdHistory ? nvdHistoryState.canUndo : usesNvvHistory ? Boolean(nvvUndoCommand) : Boolean(libraryUndoCommand);
  const canRedo = usesNvdHistory ? nvdHistoryState.canRedo : usesNvvHistory ? Boolean(nvvRedoCommand) : Boolean(libraryRedoCommand);
  const undoLabel = usesNvdHistory
    ? "Undo"
    : usesNvvHistory
      ? nvvUndoCommand
        ? `Undo ${nvvUndoCommand.label}`
        : "Undo"
      : libraryUndoCommand
        ? `Undo ${libraryUndoCommand.label}`
        : "Undo";
  const redoLabel = usesNvdHistory
    ? "Redo"
    : usesNvvHistory
      ? nvvRedoCommand
        ? `Redo ${nvvRedoCommand.label}`
        : "Redo"
      : libraryRedoCommand
        ? `Redo ${libraryRedoCommand.label}`
        : "Redo";
  activeEditorCommandsRef.current = activeEditorCommands;

  const handleModelInspectorResult = useCallback((asset: Asset, result: ModelInspectorResult) => {
    const modelKey = getAssetModelKey(asset);
    setModelInspectorResults((results) => ({ ...results, [modelKey]: result }));
  }, []);

  const handleNvdTextSelectionChange = useCallback((selection: NvdTextSelection | null) => {
    const nextSelection =
      selection && selection.end > selection.start
        ? {
            start: selection.start,
            end: selection.end,
          }
        : null;

    setActiveNvdTextSelection((currentSelection) =>
      currentSelection?.start === nextSelection?.start && currentSelection?.end === nextSelection?.end
        ? currentSelection
        : nextSelection,
    );
  }, []);

  function addLibraryHistoryCommand(command: SessionHistoryCommand) {
    setUndoContext("library");
    setLibraryHistory((history) => addSessionHistoryCommand(history, command));
  }

  function applyNvvDocumentFromHistory(document: NvvDocument) {
    setActiveNvvDocument((opened) => (opened ? { ...opened, document } : opened));
    setNvvSaveState("dirty");
    setUndoContext("nvv");
  }

  function addNvvHistoryCommand(command: SessionHistoryCommand) {
    setUndoContext("nvv");
    setNvvHistory((history) => addSessionHistoryCommand(history, command));
  }

  function undoActiveContext() {
    if (usesNvdHistory) {
      nvdEditorControllerRef.current?.undo();
      return;
    }

    if (usesNvvHistory) {
      nvvUndoCommand?.undo();
      setNvvHistory((history) => undoSessionHistory(history));
      return;
    }

    libraryUndoCommand?.undo();
    setLibraryHistory((history) => undoSessionHistory(history));
  }

  function redoActiveContext() {
    if (usesNvdHistory) {
      nvdEditorControllerRef.current?.redo();
      return;
    }

    if (usesNvvHistory) {
      nvvRedoCommand?.redo();
      setNvvHistory((history) => redoSessionHistory(history));
      return;
    }

    libraryRedoCommand?.redo();
    setLibraryHistory((history) => redoSessionHistory(history));
  }

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    if (isNvdAsset(selectedAsset)) {
      void openNvdDocumentFromAsset(selectedAsset);
    } else if (isNvvAsset(selectedAsset)) {
      void openNvvDocumentFromAsset(selectedAsset);
    }
  }, [selectedAsset?.id, selectedAsset?.path]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSaveFileShortcut(event)) {
        return;
      }

      event.preventDefault();
      handleSaveFileCommand();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (
        isEditableEventTarget(event.target) ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);

      if (!isUndo && !isRedo) {
        return;
      }

      event.preventDefault();
      isUndo ? undoActiveContext() : redoActiveContext();
    }

    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [libraryRedoCommand, libraryUndoCommand, nvvRedoCommand, nvvUndoCommand, usesNvdHistory, usesNvvHistory]);

  useEffect(() => {
    setLibraryHistory(EMPTY_SESSION_HISTORY);
    setNvvHistory(EMPTY_SESSION_HISTORY);
    setUndoContext("library");
  }, [activeInventory?.manifestPath]);

  useEffect(() => {
    if (!hasUnsavedNvdChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedNvdChanges]);

  useEffect(() => {
    storeNumber(layoutStorageKeys.leftPaneWidth, leftPaneWidth);
  }, [leftPaneWidth]);

  useEffect(() => {
    storeString(layoutStorageKeys.leftPaneCollapsed, leftPaneCollapsed ? "true" : "false");
  }, [leftPaneCollapsed]);

  useEffect(() => {
    storeNumber(layoutStorageKeys.rightPaneWidth, rightPaneWidth);
  }, [rightPaneWidth]);

  useEffect(() => {
    storeString(layoutStorageKeys.rightPaneCollapsed, rightPaneCollapsed ? "true" : "false");
  }, [rightPaneCollapsed]);

  useEffect(() => {
    storeNumber(layoutStorageKeys.sourceSectionHeight, sourceSectionHeight);
  }, [sourceSectionHeight]);

  useEffect(() => {
    storeString(layoutStorageKeys.sourceSectionCollapsed, sourceSectionCollapsed ? "true" : "false");
  }, [sourceSectionCollapsed]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeStringSet(layoutStorageKeys.treeOpenNodeIds, treeOpenNodeIds);
  }, [activeInventory, treeOpenNodeIds]);

  useEffect(() => {
    if (assetShelfHeight !== null) {
      storeNumber(layoutStorageKeys.assetShelfHeight, assetShelfHeight);
    }
  }, [assetShelfHeight]);

  useEffect(() => {
    storeString(layoutStorageKeys.assetShelfCollapsed, assetShelfCollapsed ? "true" : "false");
  }, [assetShelfCollapsed]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.sortKey, assetSortKey);
  }, [activeInventory, assetSortKey]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.sortDirection, assetSortDirection);
  }, [activeInventory, assetSortDirection]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.viewMode, assetViewMode);
  }, [activeInventory, assetViewMode]);

  useEffect(() => {
    if (activeInventory) {
      return;
    }

    storeString(assetShelfStorageKeys.detailsColumnWidths, JSON.stringify(detailsColumnWidths));
  }, [activeInventory, detailsColumnWidths]);

  useEffect(() => {
    storeSelectedThemeId(selectedThemeId);
  }, [selectedThemeId]);

  useEffect(() => {
    storeCustomThemes(customThemes);
  }, [customThemes]);

  useEffect(() => {
    storeThemeEditorLayout(themeEditorLayout);
  }, [themeEditorLayout]);

  useEffect(() => {
    if (selectedTheme.builtin && !areThemeColorsEqual(themeColors, selectedTheme.colors)) {
      setThemeColors(selectedTheme.colors);
    }
  }, [selectedTheme, themeColors]);

  useEffect(() => {
    if (activeInventory) {
      storeString(projectStorageKeys.activeInventoryManifestPath, activeInventory.manifestPath);
    }
  }, [activeInventory]);

  useEffect(() => {
    let isMounted = true;

    async function loadPersistedState() {
      let startupWarning: string | null = null;

      try {
        const activeInventoryManifestPath = readStoredString(projectStorageKeys.activeInventoryManifestPath);

        if (activeInventoryManifestPath) {
          try {
            const openedInventory = await invoke<PersistedOpenedInventory>("open_inventory", {
              path: activeInventoryManifestPath,
            });

            if (!isMounted) {
              return;
            }

            setActiveInventory(toActiveInventory(openedInventory));
            setInventoryDocuments(openedInventory.manifest.documents);
            applyLibraryStateToWorkspace(
              getPersistedLibraryStateFromManifest(openedInventory.manifest),
              `Opened Inventory "${openedInventory.manifest.inventory.name}".`,
              openedInventory.manifest.workspaceState,
            );
            return;
          } catch (error) {
            removeStoredString(projectStorageKeys.activeInventoryManifestPath);
            startupWarning = `Could not reopen last Inventory: ${String(error)}`;
          }
        }

        if (!isMounted) {
          return;
        }

        applyLibraryStateToWorkspace(
          createEmptyLibraryState(),
          startupWarning ?? "No Inventory open.",
          createDefaultWorkspaceState(),
        );
      } catch (error) {
        if (isMounted) {
          setStatusMessage(`Could not load saved library: ${String(error)}`);
        }
      } finally {
        if (isMounted) {
          setHasLoadedPersistedState(true);
        }
      }
    }

    loadPersistedState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState) {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      try {
        if (!activeInventory) {
          return;
        }

        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: currentWorkspaceState,
        });
      } catch (error) {
        setStatusMessage(`Could not save library: ${String(error)}`);
      }
    }, 300);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [activeInventory, currentLibraryState, currentWorkspaceState, hasLoadedPersistedState, inventoryDocuments]);

  function applyLibraryStateToWorkspace(state: PersistedLibraryState, message: string, workspaceState?: PersistedWorkspaceState) {
    const loadedSourceFolders =
      state.sourceFolders && state.sourceFolders.length > 0
        ? state.sourceFolders
        : state.rootPath
          ? [
              {
                id: getSourceFolderId(state.rootPath),
                path: state.rootPath,
                name: getBaseName(state.rootPath),
                assetIds: state.assets.map((asset) => asset.id),
                skippedEntries: 0,
                enabled: true,
              },
            ]
          : [];
    const nextVirtualFolders = pruneStarterLibraryNodes(state.virtualFolders);
    const nextSelectedFolderId =
      workspaceState?.selectedFolderId && findFolder(nextVirtualFolders, workspaceState.selectedFolderId) ? workspaceState.selectedFolderId : null;
    const nextSelectedAssetId = workspaceState
      ? workspaceState.selectedAssetId !== null && state.assets.some((asset) => asset.id === workspaceState.selectedAssetId)
        ? workspaceState.selectedAssetId
        : null
      : state.assets[0]?.id ?? null;

    setScanResult({
      root_path: state.rootPath ?? "",
      assets: state.assets,
      skipped_entries: 0,
    });
    setSourceFolders(loadedSourceFolders);
    setVirtualFolders(nextVirtualFolders);
    setSelectedId(nextSelectedAssetId);
    setSelectedFolderId(nextSelectedFolderId);
    setActiveView(isLibraryView(workspaceState?.activeView) ? workspaceState.activeView : "all");
    const nextSceneMode = isSceneMode(workspaceState?.sceneMode) ? workspaceState.sceneMode : "preview";
    setSceneMode(nextSceneMode);
    setLeftPaneView(
      nextSceneMode === "nvd-document"
        ? isLeftPaneView(workspaceState?.leftPaneView)
          ? workspaceState.leftPaneView
          : "library"
        : "library",
    );
    setAssetSearchQuery(workspaceState?.assetSearchQuery ?? "");
    setModelTransformOverrides(normalizeModelTransformOverrides(workspaceState?.modelTransformOverrides));
    setActiveNvdDocumentPath(workspaceState?.activeNvdDocumentPath ?? null);
    setActiveNvdDocument(null);
    setNvdSaveState("idle");

    if (workspaceState) {
      setTreeOpenNodeIds(
        new Set(
          workspaceState.treeOpenNodeIds.length > 0
            ? [...defaultTreeOpenNodeIds, ...workspaceState.treeOpenNodeIds]
            : defaultTreeOpenNodeIds,
        ),
      );
      setAssetSortKey(isAssetSortKey(workspaceState.assetSortKey) ? workspaceState.assetSortKey : "name");
      setAssetSortDirection(workspaceState.assetSortDirection === "desc" ? "desc" : "asc");
      setAssetViewMode(isAssetViewMode(workspaceState.assetViewMode) ? workspaceState.assetViewMode : "medium");
      setDetailsColumnWidths(normalizeDetailsColumnWidths(workspaceState.detailsColumnWidths));
    }

    setStatusMessage(message);

    if (workspaceState?.activeNvdDocumentPath) {
      void restoreNvdDocumentFromWorkspace(workspaceState.activeNvdDocumentPath);
    }
  }

  async function restoreNvdDocumentFromWorkspace(path: string) {
    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("open_nvd_document", { path });
      rememberOpenedNvdDocument(openedDocument);
      setNvdSaveState("idle");
    } catch (error) {
      setActiveNvdDocumentPath(null);
      setNvdSaveState("error");
      setStatusMessage(`Could not reopen the Inventory's active NVD document: ${String(error)}`);
    }
  }

  function selectView(view: LibraryView) {
    const viewAssets = sortAssets(
      filterAssets(view, assets, null, virtualFolders, inventoryDocumentPaths),
      assetSortKey,
      assetSortDirection,
    );
    const isNativeHub = view === "inventory-files" || view === "inventory-documents" || view === "inventory-vectors";
    const nextSelectedId = isNativeHub ? null : viewAssets.some((asset) => asset.id === selectedId) ? selectedId : viewAssets[0]?.id ?? null;

    setUndoContext("library");
    openTreeNodePath(getTreeNodePathForView(view));
    setActiveView(view);
    setSelectedFolderId(null);
    setSelectedId(nextSelectedId);
    if (isNativeHub) {
      changeSceneMode("preview");
    }
  }

  function selectFolder(folderId: string) {
    const folderAssets = sortAssets(
      filterAssets("all", assets, folderId, virtualFolders, inventoryDocumentPaths),
      assetSortKey,
      assetSortDirection,
    );
    const nextSelectedId = folderAssets.some((asset) => asset.id === selectedId) ? selectedId : folderAssets[0]?.id ?? null;

    setUndoContext("library");
    openTreeNodePath(["library", ...(findFolderPath(virtualFolders, folderId) ?? [])]);
    setSelectedFolderId(folderId);
    setActiveView("all");
    setSelectedId(nextSelectedId);
  }

  function selectAsset(assetId: number) {
    setActiveNvdStyleRole(null);
    setNvdStyleDraft(null);
    const asset = assets.find((candidate) => candidate.id === assetId);
    const isInventoryDocument = Boolean(asset && inventoryDocumentPaths.has(normalizePath(asset.path)));

    if (isInventoryDocument) {
      const nativeView = asset?.extension.toLowerCase() === "nvv" ? "inventory-vectors" : "inventory-documents";
      openTreeNodePath(getTreeNodePathForView(nativeView));
      setSelectedFolderId(null);
      setActiveView(nativeView);
      setSelectedId(assetId);
      return;
    } else if (activeView === "inventory-files" || activeView === "inventory-documents" || activeView === "inventory-vectors") {
      openTreeNodePath(["library"]);
      setSelectedFolderId(null);
      setActiveView("all");
    }

    if (selectedFolderId && !visibleAssets.some((asset) => asset.id === assetId)) {
      setSelectedFolderId(null);
      setActiveView("all");
    }

    setUndoContext("library");
    setSelectedId(assetId);
  }

  function activateNvdDocumentContext() {
    if (!activeNvdDocument) {
      return;
    }

    setUndoContext("nvd");
    selectAsset(activeNvdDocument.entry.assetId);
  }

  function changeSceneMode(mode: SceneMode) {
    setSceneMode(mode);

    if (mode === "preview") {
      setUndoContext("library");
      setLeftPaneView("library");
    }
  }

  function changeLeftPaneView(view: LeftPaneView) {
    if (view === "nvd-navigation" && sceneMode !== "nvd-document") {
      return;
    }

    setLeftPaneView(view);

    if (view !== "nvd-navigation") {
      setActiveNvdStyleRole(null);
      setNvdStyleDraft(null);
    }
  }

  function selectNvdStyle(role: NvdStyleRole) {
    setActiveNvdStyleRole(role);
    setNvdStyleDraft({ ...nvdStyleDefinitions[role] });
  }

  const handleNvdEditorControllerChange = useCallback((controller: NvdEditorController | null) => {
    nvdEditorControllerRef.current = controller;
    setActiveNvdCharacterSpacingPt(controller?.characterSpacingPt ?? null);
    setActiveNvdLineHeight(controller?.lineHeight ?? null);
    setActiveNvdSpaceAfterPt(controller?.spaceAfterPt ?? null);
    setActiveNvdSpaceBeforePt(controller?.spaceBeforePt ?? null);
    setNvdHistoryState((historyState) => {
      const nextHistoryState = {
        canRedo: controller?.canRedo ?? false,
        canUndo: controller?.canUndo ?? false,
      };

      return historyState.canRedo === nextHistoryState.canRedo && historyState.canUndo === nextHistoryState.canUndo
        ? historyState
        : nextHistoryState;
    });
  }, []);

  function applyNvdStyle(role: NvdStyleRole) {
    const controller = nvdEditorControllerRef.current;

    if (!controller) {
      setStatusMessage("Place the cursor in an NVD paragraph before applying a style.");
      return;
    }

    setActiveNvdStyleRole(null);
    setNvdStyleDraft(null);
    controller.applyStyle(nvdStyleDefinitions[role]);
    setStatusMessage(`Applied ${nvdStyleDefinitions[role].label}.`);
  }

  function navigateToNvdBlock(blockIndex: number) {
    nvdEditorControllerRef.current?.focusBlock(blockIndex);
  }

  function updateNvdStyleDraft(style: NvdStyleDefinition) {
    setNvdStyleDraft(style);
  }

  function changeNvdLineHeight(lineHeight: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, lineHeight };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setLineHeight(lineHeight);
  }

  function changeNvdCharacterSpacingPt(characterSpacingPt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, characterSpacingPt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setCharacterSpacingPt(characterSpacingPt);
  }

  function changeNvdSpaceAfterPt(spaceAfterPt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, spaceAfterPt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setSpaceAfterPt(spaceAfterPt);
  }

  function changeNvdSpaceBeforePt(spaceBeforePt: number, finalizeStyle = false) {
    if (nvdStyleDraft) {
      const nextStyleDraft = { ...nvdStyleDraft, spaceBeforePt };
      setNvdStyleDraft(nextStyleDraft);

      if (finalizeStyle) {
        acceptNvdStyleDefinition(nextStyleDraft);
      }
      return;
    }

    nvdEditorControllerRef.current?.setSpaceBeforePt(spaceBeforePt);
  }

  function acceptNvdStyleDraft() {
    if (!activeNvdStyleRole || !nvdStyleDraft) {
      return;
    }

    acceptNvdStyleDefinition(nvdStyleDraft);
  }

  function acceptNvdStyleDefinition(style: NvdStyleDefinition) {
    if (!activeNvdStyleRole) {
      return;
    }

    const nextStyleDefinitions = {
      ...nvdStyleDefinitions,
      [activeNvdStyleRole]: { ...style },
    };

    nvdEditorControllerRef.current?.updateStyle(
      style,
      nvdStyleDefinitions[activeNvdStyleRole],
      restoreNvdStyleFromHistory,
    );
    setNvdStyleDefinitions(nextStyleDefinitions);
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...openedDocument.document,
              styles: nextStyleDefinitions,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
    setStatusMessage(`Updated ${style.label} throughout the document.`);
  }

  function resetNvdStyle(role: NvdStyleRole) {
    if (nvdStyleResetConfirmationEnabled) {
      setHideFutureNvdStyleResetConfirmations(true);
      setPendingNvdStyleResetRole(role);
      return;
    }

    performNvdStyleReset(role);
  }

  function performNvdStyleReset(role: NvdStyleRole) {
    const previousStyle = nvdStyleDefinitions[role];
    const defaultStyle = { ...DEFAULT_NVD_STYLE_DEFINITIONS[role] };
    const nextStyleDefinitions = {
      ...nvdStyleDefinitions,
      [role]: defaultStyle,
    };

    nvdEditorControllerRef.current?.updateStyle(defaultStyle, previousStyle, restoreNvdStyleFromHistory);
    setNvdStyleDefinitions(nextStyleDefinitions);
    setActiveNvdStyleRole((activeRole) => (activeRole === role ? null : activeRole));
    setNvdStyleDraft((styleDraft) => (styleDraft?.role === role ? null : styleDraft));
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...openedDocument.document,
              styles: nextStyleDefinitions,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
    setStatusMessage(`Reset ${defaultStyle.label} to its default style.`);
  }

  function confirmNvdStyleReset() {
    if (!pendingNvdStyleResetRole) {
      return;
    }

    const role = pendingNvdStyleResetRole;
    setPendingNvdStyleResetRole(null);

    if (hideFutureNvdStyleResetConfirmations) {
      updateNvdStyleResetConfirmationEnabled(false);
    }

    performNvdStyleReset(role);
  }

  function restoreNvdStyleFromHistory(style: NvdStyleDefinition) {
    setNvdStyleDefinitions((styleDefinitions) => ({
      ...styleDefinitions,
      [style.role]: { ...style },
    }));
    setNvdStyleDraft((styleDraft) => (styleDraft?.role === style.role ? { ...style } : styleDraft));
    setActiveNvdDocument((openedDocument) => {
      if (!openedDocument) {
        return openedDocument;
      }

      return {
        ...openedDocument,
        document: {
          ...openedDocument.document,
          styles: {
            ...getNvdDocumentStyleDefinitions(openedDocument.document.styles),
            [style.role]: { ...style },
          },
        },
      };
    });
    setNvdSaveState("dirty");
    setStatusMessage(`Restored ${style.label} through document history.`);
  }

  async function openNvdDocumentFromAsset(asset: Asset) {
    if ((nvvSaveState === "dirty" || nvvSaveState === "error") && !window.confirm("Discard unsaved NVV changes and open this NVD document?")) {
      return;
    }
    if (activeNvdDocumentPath === asset.path) {
      changeSceneMode("nvd-document");
      return;
    }

    if (hasUnsavedNvdChanges && !window.confirm("Discard unsaved NVD changes and open another document?")) {
      return;
    }

    setStatusMessage(`Opening NVD document "${asset.name}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("open_nvd_document", { path: asset.path });
      rememberOpenedNvdDocument(openedDocument);
      setNvdSaveState("idle");
      changeSceneMode("nvd-document");
      setStatusMessage(`Opened NVD document "${openedDocument.document.title}".`);
    } catch (error) {
      setNvdSaveState("error");
      setStatusMessage(`Could not open NVD document: ${String(error)}`);
    }
  }

  function rememberOpenedNvdDocument(openedDocument: PersistedOpenedNvdDocument, registerEntry = false) {
    setActiveNvdDocumentPath(openedDocument.path);
    setActiveNvdDocument(openedDocument);
    setNvdStyleDefinitions(getNvdDocumentStyleDefinitions(openedDocument.document.styles));
    setActiveNvdStyleRole(null);
    setNvdStyleDraft(null);

    if (registerEntry) {
      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: upsertInventoryDocumentEntry(documents.nvdDocuments, openedDocument.entry),
      }));
    }

    setScanResult((currentScanResult) => ({
      root_path: currentScanResult?.root_path ?? sourceFolders[0]?.path ?? "",
      assets: mergeScannedAssets(currentScanResult?.assets ?? [], [openedDocument.asset]),
      skipped_entries: currentScanResult?.skipped_entries ?? 0,
    }));
  }

  async function openNvvDocumentFromAsset(asset: Asset) {
    if (hasUnsavedNvdChanges && !window.confirm("Discard unsaved NVD changes and open this NVV vector?")) {
      return;
    }
    setStatusMessage(`Opening NVV vector "${asset.name}"...`);
    try {
      const openedDocument = await invoke<PersistedOpenedNvvDocument>("open_nvv_document", { path: asset.path });
      rememberOpenedNvvDocument(openedDocument);
      setNvvSaveState("idle");
      setNvvHistory(EMPTY_SESSION_HISTORY);
      setUndoContext("nvv");
      changeSceneMode("nvv-document");
      setStatusMessage(`Opened NVV vector "${openedDocument.document.title}".`);
    } catch (error) {
      setNvvSaveState("error");
      setStatusMessage(`Could not open NVV vector: ${String(error)}`);
    }
  }

  function rememberOpenedNvvDocument(openedDocument: PersistedOpenedNvvDocument, registerEntry = false) {
    setActiveNvvDocument(openedDocument);
    if (registerEntry) {
      setInventoryDocuments((documents) => ({
        ...documents,
        nvvDocuments: upsertInventoryDocumentEntry(documents.nvvDocuments, openedDocument.entry),
      }));
    }
    setScanResult((currentScanResult) => ({
      root_path: currentScanResult?.root_path ?? sourceFolders[0]?.path ?? "",
      assets: mergeScannedAssets(currentScanResult?.assets ?? [], [openedDocument.asset]),
      skipped_entries: currentScanResult?.skipped_entries ?? 0,
    }));
  }

  function updateActiveNvvDocument(document: NvvDocument, options?: NvvDocumentChangeOptions) {
    setActiveNvvDocument((opened) => (opened ? { ...opened, document } : opened));
    setNvvSaveState("dirty");
    setUndoContext("nvv");

    if (options?.history) {
      const beforeDocument = options.history.before;
      const afterDocument = document;
      addNvvHistoryCommand({
        label: options.history.label,
        redo: () => applyNvvDocumentFromHistory(afterDocument),
        undo: () => applyNvvDocumentFromHistory(beforeDocument),
      });
    }
  }

  async function saveActiveNvvDocument() {
    if (!activeNvvDocument) return false;
    setNvvSaveState("saving");
    try {
      const opened = await invoke<PersistedOpenedNvvDocument>("save_nvv_document", {
        path: activeNvvDocument.path,
        document: activeNvvDocument.document,
        inventoryManifestPath: activeInventory?.manifestPath ?? null,
      });
      rememberOpenedNvvDocument(opened, true);
      setNvvSaveState("saved");
      setStatusMessage(`Saved NVV vector "${opened.document.title}".`);
      return true;
    } catch (error) {
      setNvvSaveState("error");
      setStatusMessage(`Could not save NVV vector: ${String(error)}`);
      return false;
    }
  }

  async function closeActiveNvvDocument() {
    if ((nvvSaveState === "dirty" || nvvSaveState === "error") && !window.confirm("Discard unsaved NVV changes?")) {
      return;
    }
    cancelPendingLibrarySave();
    if (activeInventory) {
      try {
        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: {
            ...currentWorkspaceState,
            sceneMode: "preview",
            selectedAssetId: null,
          },
        });
      } catch (error) {
        setStatusMessage(`Could not close NVV vector: ${String(error)}`);
        return;
      }
    }
    setActiveNvvDocument(null);
    setNvvSaveState("idle");
    setNvvHistory(EMPTY_SESSION_HISTORY);
    setSelectedId(null);
    changeSceneMode("preview");
    setStatusMessage("Closed NVV vector.");
  }

  function updateActiveNvdDocument(document: NvdDocument) {
    setActiveNvdDocument((openedDocument) =>
      openedDocument
        ? {
            ...openedDocument,
            document: {
              ...document,
              styles: document.styles ?? openedDocument.document.styles,
            },
          }
        : openedDocument,
    );
    setNvdSaveState("dirty");
  }

  async function saveActiveNvdDocument() {
    if (!activeNvdDocument) {
      setStatusMessage("No NVD document is open.");
      return false;
    }

    const document = {
      ...activeNvdDocument.document,
      title: activeNvdDocument.document.title.trim(),
    };

    if (!document.title) {
      setNvdSaveState("error");
      setStatusMessage("NVD document title cannot be empty.");
      return false;
    }

    setNvdSaveState("saving");
    setStatusMessage(`Saving NVD document "${document.title}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("save_nvd_document", {
        path: activeNvdDocument.path,
        document,
        inventoryManifestPath: activeInventory?.manifestPath ?? null,
      });

      rememberOpenedNvdDocument(openedDocument, isInventoryOwnedDocumentPath(openedDocument.path, activeInventory));
      setNvdSaveState("saved");
      setStatusMessage(`Saved NVD document "${document.title}".`);
      return true;
    } catch (error) {
      setNvdSaveState("error");
      setStatusMessage(`Could not save NVD document: ${String(error)}`);
      return false;
    }
  }

  function requestCloseActiveNvdDocument() {
    if (!activeNvdDocument) {
      return;
    }

    if (hasUnsavedNvdChanges) {
      setIsNvdCloseConfirmationOpen(true);
      return;
    }

    void closeActiveNvdDocument();
  }

  async function closeActiveNvdDocument() {
    const title = activeNvdDocument?.document.title;
    const closedWorkspaceState: PersistedWorkspaceState = {
      ...currentWorkspaceState,
      activeNvdDocumentPath: null,
      leftPaneView: "library",
      sceneMode: "preview",
      selectedAssetId: null,
    };

    cancelPendingLibrarySave();
    setStatusMessage(title ? `Closing NVD document "${title}"...` : "Closing NVD document...");

    if (activeInventory) {
      try {
        await invoke("save_inventory", {
          path: activeInventory.manifestPath,
          state: currentLibraryState,
          workspaceState: closedWorkspaceState,
        });
      } catch (error) {
        setStatusMessage(`Could not close NVD document: ${String(error)}`);
        return;
      }
    }

    setIsNvdCloseConfirmationOpen(false);
    setActiveNvdDocument(null);
    setActiveNvdDocumentPath(null);
    setSelectedId(null);
    setActiveNvdTextSelection(null);
    setActiveNvdStyleRole(null);
    setNvdStyleDraft(null);
    handleNvdEditorControllerChange(null);
    setNvdSaveState("idle");
    changeSceneMode("preview");
    setStatusMessage(title ? `Closed NVD document "${title}".` : "Closed NVD document.");
  }

  async function saveAndCloseActiveNvdDocument() {
    if (await saveActiveNvdDocument()) {
      await closeActiveNvdDocument();
    }
  }

  function handleSaveFileCommand() {
    executeSaveFileCommand(activeEditorCommandsRef.current);
  }

  function toggleTreeNode(nodeId: string) {
    setTreeOpenNodeIds((openIds) => {
      const nextOpenIds = new Set(openIds);

      if (nextOpenIds.has(nodeId)) {
        nextOpenIds.delete(nodeId);
      } else {
        nextOpenIds.add(nodeId);
      }

      return nextOpenIds;
    });
  }

  function openTreeNodePath(nodeIds: string[]) {
    setTreeOpenNodeIds((openIds) => {
      let changed = false;
      const nextOpenIds = new Set(openIds);

      for (const nodeId of nodeIds) {
        if (!nextOpenIds.has(nodeId)) {
          nextOpenIds.add(nodeId);
          changed = true;
        }
      }

      return changed ? nextOpenIds : openIds;
    });
  }

  function createFolder() {
    if (!activeInventory) {
      setStatusMessage("Create or open an Inventory before adding library nodes.");
      return;
    }

    const parentFolder = selectedFolderId ? findFolder(virtualFolders, selectedFolderId) : null;
    openAddLibraryNodePanel(selectedFolderId, parentFolder?.name ?? "Master Library");
  }

  function openLibraryNodeContextMenu(node: StructureNode, event: ReactMouseEvent<HTMLElement>) {
    const isAssetNode = typeof node.assetId === "number";

    if (!node.canAddChild && !isAssetNode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setUndoContext("library");
    setSourceFolderContextMenu(null);

    if (isAssetNode) {
      const asset = assets.find((candidate) => candidate.id === node.assetId);
      setLibraryNodeContextMenu({
        assetId: node.assetId,
        isInventoryDocument: Boolean(asset && findInventoryNvdDocumentForAsset(asset, inventoryDocuments)),
        label: node.label,
        target: "asset",
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    setLibraryNodeContextMenu({
      folderId: node.folderId ?? null,
      label: node.label,
      target: "folder",
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openAssetContextMenu(asset: Asset, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setSourceFolderContextMenu(null);
    setLibraryNodeContextMenu({
      assetId: asset.id,
      isInventoryDocument: Boolean(findInventoryNvdDocumentForAsset(asset, inventoryDocuments)),
      label: asset.name,
      target: "asset",
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openSourceFolderContextMenu(folder: SourceFolder, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setLibraryNodeContextMenu(null);
    setSourceFolderContextMenu({
      label: folder.name,
      path: folder.path,
      sourceId: folder.id,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openAddLibraryNodePanel(parentFolderId: string | null, parentLabel: string, initialQuery = "") {
    if (!activeInventory) {
      setLibraryNodeContextMenu(null);
      setStatusMessage("Create or open an Inventory before adding library nodes.");
      return;
    }

    setLibraryNodeContextMenu(null);
    setSourceFolderContextMenu(null);
    setAddLibraryNodePanel({
      initialQuery,
      parentFolderId,
      parentLabel,
    });
  }

  function addLibraryNodeFromDraft(draft: AddLibraryNodeDraft, parentFolderId: string | null) {
    if (!addLibraryNodePanel) {
      return;
    }

    const trimmedName = draft.name.trim();

    if (!trimmedName) {
      setStatusMessage("Name the folder before creating it.");
      return;
    }

    const folder = createVirtualFolderFromDraft({ ...draft, name: trimmedName });
    const matchedAssetCount = getAssetsForLibraryNode(folder, masterLibraryAssets).length;
    const parentFolder = parentFolderId ? findFolder(virtualFolders, parentFolderId) : null;

    if (parentFolderId && !parentFolder) {
      setStatusMessage("That parent folder no longer exists.");
      return;
    }

    const parentPath = parentFolderId ? findFolderPath(virtualFolders, parentFolderId) ?? [] : [];
    const parentLabel = parentFolder?.name ?? "Master Library";

    setVirtualFolders((folders) =>
      parentFolderId
        ? updateFolder(folders, parentFolderId, (parent) => ({ ...parent, children: [...parent.children, folder] }))
        : [...folders, folder],
    );
    openTreeNodePath(["library", ...parentPath, folder.id]);
    setSelectedFolderId(folder.id);
    setActiveView("all");
    setAddLibraryNodePanel(null);
    setStatusMessage(
      `Added folder "${folder.name}" under "${parentLabel}". ${
        matchedAssetCount > 0
          ? `${matchedAssetCount} loaded asset${matchedAssetCount === 1 ? "" : "s"} currently match its rules.`
          : "No loaded assets match its rules yet."
      }`,
    );
  }

  function renameLibraryNode(folderId: string) {
    const folder = findFolder(virtualFolders, folderId);

    if (!folder) {
      setStatusMessage("That library node could not be found.");
      return;
    }

    const name = window.prompt("Rename library node", folder.name);

    const trimmedName = name?.trim();

    if (!trimmedName || trimmedName === folder.name) {
      return;
    }

    setLibraryNodeName(folder.id, trimmedName);
    addLibraryHistoryCommand({
      label: "Rename",
      redo: () => {
        setLibraryNodeName(folder.id, trimmedName);
        setStatusMessage(`Redid rename to "${trimmedName}".`);
      },
      undo: () => {
        setLibraryNodeName(folder.id, folder.name);
        setStatusMessage(`Undid rename to "${folder.name}".`);
      },
    });
    setStatusMessage(`Renamed library node to "${trimmedName}".`);
  }

  function setLibraryNodeName(folderId: string, name: string) {
    setVirtualFolders((folders) =>
      updateFolder(folders, folderId, (currentFolder) => ({ ...currentFolder, name })),
    );
    setSelectedFolderId(folderId);
    setActiveView("all");
  }

  function renameAssetDisplayName(assetId: number) {
    const asset = assets.find((candidate) => candidate.id === assetId);

    if (!asset) {
      setStatusMessage("That asset could not be found.");
      return;
    }

    const name = window.prompt("Rename asset in Inventory", asset.name);
    const trimmedName = name?.trim();

    if (!trimmedName || trimmedName === asset.name) {
      return;
    }

    setAssetDisplayName(assetId, trimmedName);
    addLibraryHistoryCommand({
      label: "Rename",
      redo: () => {
        setAssetDisplayName(assetId, trimmedName);
        setStatusMessage(`Redid Inventory rename to "${trimmedName}".`);
      },
      undo: () => {
        setAssetDisplayName(assetId, asset.name);
        setStatusMessage(`Undid Inventory rename to "${asset.name}".`);
      },
    });
    setStatusMessage(`Renamed "${asset.name}" to "${trimmedName}" inside Inventory. The disk file was not renamed.`);
  }

  function setAssetDisplayName(assetId: number, name: string) {
    setScanResult((currentScanResult) => {
      if (!currentScanResult) {
        return currentScanResult;
      }

      return {
        ...currentScanResult,
        assets: currentScanResult.assets.map((currentAsset) =>
          currentAsset.id === assetId ? { ...currentAsset, name } : currentAsset,
        ),
      };
    });
    setSelectedId(assetId);
  }

  async function renameInventoryNvdDocument(assetId: number) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const entry = asset ? findInventoryNvdDocumentForAsset(asset, inventoryDocuments) : null;

    if (!activeInventory || !asset || !entry) {
      setStatusMessage("That Inventory-owned NVD document could not be found.");
      return;
    }

    const title = window.prompt("Rename NVD document", entry.title);
    const trimmedTitle = title?.trim();

    if (!trimmedTitle) {
      return;
    }

    const isActiveDocument = activeNvdDocumentPath !== null && normalizePath(activeNvdDocumentPath) === normalizePath(entry.path);
    cancelPendingLibrarySave();
    setStatusMessage(`Renaming NVD document "${entry.title}"...`);

    if (isActiveDocument) {
      setNvdSaveState("saving");
    }

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("rename_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        path: entry.path,
        title: trimmedTitle,
        document: isActiveDocument ? activeNvdDocument?.document ?? null : null,
      });

      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: upsertInventoryDocumentEntry(
          removeInventoryDocumentEntry(documents.nvdDocuments, entry),
          openedDocument.entry,
        ),
      }));
      setScanResult((currentScanResult) => ({
        root_path: currentScanResult?.root_path ?? sourceFolders[0]?.path ?? "",
        assets: mergeScannedAssets(
          (currentScanResult?.assets ?? []).filter(
            (currentAsset) => currentAsset.id !== entry.assetId && normalizePath(currentAsset.path) !== normalizePath(entry.path),
          ),
          [openedDocument.asset],
        ),
        skipped_entries: currentScanResult?.skipped_entries ?? 0,
      }));
      setVirtualFolders((folders) =>
        removeAssetIdsFromVirtualFolders(folders, new Set([entry.assetId, openedDocument.entry.assetId])),
      );
      setSourceFolders((folders) =>
        folders.map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter(
            (candidate) => candidate !== entry.assetId && candidate !== openedDocument.entry.assetId,
          ),
        })),
      );
      setSelectedId((selectedAssetId) => (selectedAssetId === entry.assetId ? openedDocument.entry.assetId : selectedAssetId));

      if (isActiveDocument) {
        setActiveNvdDocumentPath(openedDocument.path);
        setActiveNvdDocument(openedDocument);
        setNvdSaveState("saved");
      }

      setStatusMessage(`Renamed NVD document "${entry.title}" to "${openedDocument.document.title}".`);
    } catch (error) {
      if (isActiveDocument) {
        setNvdSaveState("error");
      }
      setStatusMessage(`Could not rename NVD document: ${String(error)}`);
    }
  }

  async function deleteInventoryNvdDocument(assetId: number) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const entry = asset ? findInventoryNvdDocumentForAsset(asset, inventoryDocuments) : null;

    if (!activeInventory || !asset || !entry) {
      setStatusMessage("That Inventory-owned NVD document could not be found.");
      return;
    }

    const isActiveDocument = activeNvdDocumentPath !== null && normalizePath(activeNvdDocumentPath) === normalizePath(entry.path);
    const unsavedWarning = isActiveDocument && hasUnsavedNvdChanges ? " Unsaved changes will be lost." : "";
    const message = `Permanently delete "${entry.title}" from this Inventory? This deletes the Inventory-owned .nvd file from disk and cannot be undone.${unsavedWarning}`;

    if (!window.confirm(message)) {
      return;
    }

    cancelPendingLibrarySave();
    setStatusMessage(`Deleting NVD document "${entry.title}"...`);

    try {
      const deletedEntry = await invoke<InventoryDocumentEntry>("delete_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        path: entry.path,
      });
      const nextSelectedAssetId =
        visibleAssets.find((candidate) => candidate.id !== deletedEntry.assetId)?.id ??
        assets.find((candidate) => candidate.id !== deletedEntry.assetId)?.id ??
        null;

      setInventoryDocuments((documents) => ({
        ...documents,
        nvdDocuments: removeInventoryDocumentEntry(documents.nvdDocuments, deletedEntry),
      }));
      setScanResult((currentScanResult) =>
        currentScanResult
          ? {
              ...currentScanResult,
              assets: currentScanResult.assets.filter(
                (currentAsset) =>
                  currentAsset.id !== deletedEntry.assetId &&
                  normalizePath(currentAsset.path) !== normalizePath(deletedEntry.path),
              ),
            }
          : currentScanResult,
      );
      setVirtualFolders((folders) => removeAssetIdsFromVirtualFolders(folders, new Set([deletedEntry.assetId])));
      setSourceFolders((folders) =>
        folders.map((folder) => ({
          ...folder,
          assetIds: folder.assetIds.filter((candidate) => candidate !== deletedEntry.assetId),
        })),
      );
      setSelectedId((selectedAssetId) => (selectedAssetId === deletedEntry.assetId ? nextSelectedAssetId : selectedAssetId));

      if (isActiveDocument) {
        setActiveNvdDocumentPath(null);
        setActiveNvdDocument(null);
        setNvdSaveState("idle");
        changeSceneMode("preview");
      }

      setStatusMessage(`Deleted Inventory-owned NVD document "${entry.title}".`);
    } catch (error) {
      setStatusMessage(`Could not delete NVD document: ${String(error)}`);
    }
  }

  function cancelPendingLibrarySave() {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }

  function deleteLibraryNode(folderId: string) {
    const folder = findFolder(virtualFolders, folderId);

    if (!folder) {
      setStatusMessage("That library node could not be found.");
      return;
    }

    const assetCount = countFolderAssets(folder, masterLibraryAssets);
    const selectedNodeWillBeDeleted = selectedFolderId ? folderContainsId(folder, selectedFolderId) : false;
    const message =
      assetCount > 0
        ? `Delete "${folder.name}"? ${assetCount} visible asset${assetCount === 1 ? "" : "s"} will no longer appear through this node. No disk files will be touched.`
        : `Delete "${folder.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    setVirtualFolders((folders) => removeFolder(folders, folder.id));
    openTreeNodePath(["library"]);
    if (selectedNodeWillBeDeleted) {
      setSelectedFolderId(null);
      setActiveView("all");
    }
    setStatusMessage(`Deleted library node "${folder.name}". No disk files were touched.`);
  }

  function acceptAssetPlacementSuggestion(suggestion: AssetPlacementSuggestion) {
    if (!selectedAsset) {
      setStatusMessage("Select an asset before accepting a placement suggestion.");
      return;
    }

    if (suggestion.target === "new" && suggestion.draft) {
      const parentFolderId = suggestion.parentFolderId ?? null;
      const parentPath = parentFolderId ? findFolderPath(virtualFolders, parentFolderId) ?? [] : [];
      const folder = {
        ...createVirtualFolderFromDraft(suggestion.draft),
        assetIds: [selectedAsset.id],
      };

      setVirtualFolders((folders) =>
        parentFolderId
          ? updateFolder(folders, parentFolderId, (parent) => ({ ...parent, children: [...parent.children, folder] }))
          : [...folders, folder],
      );
      openTreeNodePath(["library", ...parentPath, folder.id]);
      setSelectedFolderId(folder.id);
      setActiveView("all");
      setSelectedId(selectedAsset.id);
      setStatusMessage(`Created "${folder.name}" and placed "${selectedAsset.name}" there inside Inventory.`);
      return;
    }

    if (!suggestion.folderId) {
      setStatusMessage("That suggested folder no longer exists.");
      return;
    }

    const folder = findFolder(virtualFolders, suggestion.folderId);

    if (!folder) {
      setStatusMessage("That suggested folder no longer exists.");
      return;
    }

    if (!libraryNodeIncludesAsset(folder, selectedAsset)) {
      setVirtualFolders((folders) =>
        updateFolder(folders, folder.id, (currentFolder) =>
          currentFolder.assetIds.includes(selectedAsset.id)
            ? currentFolder
            : { ...currentFolder, assetIds: [...currentFolder.assetIds, selectedAsset.id] },
        ),
      );
    }

    openTreeNodePath(["library", ...(findFolderPath(virtualFolders, folder.id) ?? [])]);
    setSelectedFolderId(folder.id);
    setActiveView("all");
    setSelectedId(selectedAsset.id);
    setStatusMessage(`Placed "${selectedAsset.name}" in "${suggestion.path.join(" > ")}" inside Inventory.`);
  }

  function updateAssetNotes(assetId: number, notes: string) {
    setScanResult((currentScanResult) => {
      if (!currentScanResult) {
        return currentScanResult;
      }

      return {
        ...currentScanResult,
        assets: currentScanResult.assets.map((asset) => (asset.id === assetId ? { ...asset, notes } : asset)),
      };
    });
  }

  function updateAssetTags(assetId: number, tags: string[]) {
    const normalizedTags = normalizeLibraryNodeTagValues(tags);

    setScanResult((currentScanResult) => {
      if (!currentScanResult) {
        return currentScanResult;
      }

      return {
        ...currentScanResult,
        assets: currentScanResult.assets.map((asset) => (asset.id === assetId ? { ...asset, tags: normalizedTags } : asset)),
      };
    });
  }

  function updateAssetKeptTags(assetId: number, tags: string[]) {
    const normalizedTags = normalizeLibraryNodeTagValues(tags);

    setScanResult((currentScanResult) => {
      if (!currentScanResult) {
        return currentScanResult;
      }

      return {
        ...currentScanResult,
        assets: currentScanResult.assets.map((asset) => (asset.id === assetId ? { ...asset, kept_tags: normalizedTags } : asset)),
      };
    });
  }

  function removeSourceFolder(sourceId: string) {
    const folder = sourceFolders.find((candidate) => candidate.id === sourceId);

    if (!folder) {
      setStatusMessage("That source folder is no longer loaded.");
      return;
    }

    const remainingSourceFolders = sourceFolders.filter((candidate) => candidate.id !== sourceId);
    const remainingAssetIds = new Set([
      ...remainingSourceFolders.flatMap((candidate) => candidate.assetIds),
      ...inventoryDocuments.nvdDocuments.map((document) => document.assetId),
      ...inventoryDocuments.nvvDocuments.map((document) => document.assetId),
    ]);
    const currentAssets = scanResult?.assets ?? [];
    const nextAssets = currentAssets.filter((asset) => remainingAssetIds.has(asset.id));
    const removedAssetCount = currentAssets.length - nextAssets.length;

    const message =
      removedAssetCount > 0
        ? `Remove "${folder.name}" from Source Folders? ${removedAssetCount} asset${
            removedAssetCount === 1 ? "" : "s"
          } only loaded from this folder will leave the current library. No disk files will be touched.`
        : `Remove "${folder.name}" from Source Folders? No disk files will be touched.`;

    if (!window.confirm(message)) {
      return;
    }

    setSourceFolders(remainingSourceFolders);
    setScanResult({
      root_path: remainingSourceFolders[0]?.path ?? "",
      assets: nextAssets,
      skipped_entries: remainingSourceFolders.reduce((total, candidate) => total + candidate.skippedEntries, 0),
    });

    if (!selectedId || !remainingAssetIds.has(selectedId)) {
      setSelectedFolderId(null);
      setActiveView("all");
      setSelectedId(nextAssets[0]?.id ?? null);
    }

    setStatusMessage(
      `Removed source folder "${folder.name}" from Inventory. ${
        removedAssetCount > 0 ? `${removedAssetCount} asset${removedAssetCount === 1 ? "" : "s"} left the current library. ` : ""
      }No disk files were touched.`,
    );
  }

  async function refreshSourceFolder(sourceId: string) {
    const folder = sourceFolders.find((candidate) => candidate.id === sourceId);

    if (!folder) {
      setStatusMessage("That source folder is no longer loaded.");
      return;
    }

    setIsScanning(true);
    setStatusMessage(`Refreshing "${folder.name}"...`);

    try {
      const result = await invoke<ScanResult>("scan_folder", { path: folder.path });
      const refreshedAssetIds = result.assets.map((asset) => asset.id);
      const refreshedAssetIdSet = new Set(refreshedAssetIds);
      const previousAssetIdSet = new Set(folder.assetIds);
      const addedCount = refreshedAssetIds.filter((assetId) => !previousAssetIdSet.has(assetId)).length;
      const removedCount = folder.assetIds.filter((assetId) => !refreshedAssetIdSet.has(assetId)).length;
      const nextSourceFolders = sourceFolders.map((candidate) =>
        candidate.id === sourceId
          ? {
              ...candidate,
              assetIds: refreshedAssetIds,
              name: getBaseName(result.root_path),
              path: result.root_path,
              skippedEntries: result.skipped_entries,
            }
          : candidate,
      );
      const referencedAssetIds = new Set([
        ...nextSourceFolders.flatMap((candidate) => candidate.assetIds),
        ...inventoryDocuments.nvdDocuments.map((document) => document.assetId),
        ...inventoryDocuments.nvvDocuments.map((document) => document.assetId),
      ]);
      const mergedAssets = mergeScannedAssets(scanResult?.assets ?? [], result.assets);
      const nextAssets = mergedAssets.filter((asset) => referencedAssetIds.has(asset.id));

      setSourceFolders(nextSourceFolders);
      setScanResult({
        root_path: nextSourceFolders[0]?.path ?? "",
        assets: nextAssets,
        skipped_entries: nextSourceFolders.reduce((total, candidate) => total + candidate.skippedEntries, 0),
      });

      if (!selectedId || !referencedAssetIds.has(selectedId)) {
        setSelectedFolderId(null);
        setActiveView("all");
        setSelectedId(nextAssets[0]?.id ?? null);
      }

      setStatusMessage(
        `Refreshed "${folder.name}". ${result.assets.length} supported asset${result.assets.length === 1 ? "" : "s"} found.${
          addedCount > 0 ? ` ${addedCount} new.` : ""
        }${removedCount > 0 ? ` ${removedCount} removed.` : ""}${
          result.skipped_entries > 0 ? ` ${result.skipped_entries} unreadable entr${result.skipped_entries === 1 ? "y" : "ies"} skipped.` : ""
        }`,
      );
    } catch (error) {
      setStatusMessage(`Could not refresh "${folder.name}": ${String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleOpenFolder() {
    if (!activeInventory) {
      setStatusMessage("Create or open an Inventory before adding source folders.");
      return;
    }

    setIsScanning(true);
    setStatusMessage("Waiting for folder selection...");

    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: "Select an asset folder",
      });

      if (!selected) {
        setStatusMessage("Folder selection cancelled.");
        return;
      }

      const selectedPaths = Array.isArray(selected) ? selected : [selected];
      const newPaths = selectedPaths.filter((path) => !sourceFolders.some((folder) => normalizePath(folder.path) === normalizePath(path)));

      if (newPaths.length === 0) {
        setStatusMessage("Those source folders are already loaded.");
        return;
      }

      setStatusMessage(`Scanning ${newPaths.length} source folder${newPaths.length === 1 ? "" : "s"}...`);
      const results = await Promise.all(newPaths.map((path) => invoke<ScanResult>("scan_folder", { path })));
      const newlyScannedAssets = results.flatMap((result) => result.assets);
      const nextAssets = mergeScannedAssets(scanResult?.assets ?? [], newlyScannedAssets);
      const newSourceFolders = results.map((result) => ({
        id: getSourceFolderId(result.root_path),
        path: result.root_path,
        name: getBaseName(result.root_path),
        assetIds: result.assets.map((asset) => asset.id),
        skippedEntries: result.skipped_entries,
        enabled: true,
      }));
      const nextSourceFolders = [...sourceFolders, ...newSourceFolders];
      const defaultLibraryNodes =
        sourceFolders.length === 0 && virtualFolders.length === 0
          ? createDefaultTopLevelLibraryNodesForAssets(newlyScannedAssets)
          : [];

      setScanResult({
        root_path: nextSourceFolders[0]?.path ?? "",
        assets: nextAssets,
        skipped_entries: nextSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0),
      });
      setSourceFolders(nextSourceFolders);
      if (defaultLibraryNodes.length > 0) {
        setVirtualFolders((folders) => (folders.length === 0 ? defaultLibraryNodes : folders));
      }
      selectView("all");
      setSelectedId((currentId) => currentId ?? results[0]?.assets[0]?.id ?? null);
      setStatusMessage(
        `${results.reduce((total, result) => total + result.assets.length, 0)} supported asset${
          results.reduce((total, result) => total + result.assets.length, 0) === 1 ? "" : "s"
        } added from ${newSourceFolders.length} source folder${newSourceFolders.length === 1 ? "" : "s"}. ${
          newSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0) > 0
            ? `${newSourceFolders.reduce((total, folder) => total + folder.skippedEntries, 0)} unreadable entries skipped.`
            : ""
        }${defaultLibraryNodes.length > 0 ? ` Created ${defaultLibraryNodes.length} top-level library folder${defaultLibraryNodes.length === 1 ? "" : "s"}.` : ""}`,
      );
    } catch (error) {
      setStatusMessage(`Could not scan folder: ${String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleNewInventory() {
    const name = window.prompt("Name this Inventory", activeInventory?.name ?? "My Inventory");

    if (name === null) {
      setStatusMessage("New Inventory cancelled.");
      return;
    }

    if (!name.trim()) {
      setStatusMessage("Inventory name cannot be empty.");
      return;
    }

    setStatusMessage(`Creating Inventory "${name.trim()}"...`);

    try {
      const openedInventory = await invoke<PersistedOpenedInventory>("create_inventory", {
        name,
      });

      setActiveInventory(toActiveInventory(openedInventory));
      setInventoryDocuments(openedInventory.manifest.documents);
      storeString(projectStorageKeys.activeInventoryManifestPath, openedInventory.manifestPath);
      applyLibraryStateToWorkspace(
        getPersistedLibraryStateFromManifest(openedInventory.manifest),
        `Created Inventory "${openedInventory.manifest.inventory.name}" at ${openedInventory.rootPath}.`,
        openedInventory.manifest.workspaceState,
      );
    } catch (error) {
      setStatusMessage(`Could not create Inventory: ${String(error)}`);
    }
  }

  async function handleNewNvdDocument() {
    if (!activeInventory) {
      setStatusMessage("Open or create an Inventory before creating an NVD document.");
      return;
    }

    const title = window.prompt("Name this NVD document", "Untitled Document");

    if (title === null) {
      setStatusMessage("New NVD document cancelled.");
      return;
    }

    if (!title.trim()) {
      setStatusMessage("NVD document title cannot be empty.");
      return;
    }

    setStatusMessage(`Creating NVD document "${title.trim()}"...`);

    try {
      const openedDocument = await invoke<PersistedOpenedNvdDocument>("create_nvd_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        title,
      });

      rememberOpenedNvdDocument(openedDocument, true);
      openTreeNodePath(["inventory-files", "inventory-documents"]);
      setSelectedFolderId(null);
      setActiveView("inventory-documents");
      setSelectedId(openedDocument.asset.id);
      setNvdSaveState("idle");
      changeSceneMode("nvd-document");
      setStatusMessage(`Created NVD document "${openedDocument.document.title}" at ${openedDocument.path}.`);
    } catch (error) {
      setStatusMessage(`Could not create NVD document: ${String(error)}`);
    }
  }

  async function handleNewNvvDocument() {
    if (!activeInventory) {
      setStatusMessage("Open or create an Inventory before creating an NVV vector.");
      return;
    }
    const title = window.prompt("Name this NVV vector", "Untitled Vector");
    if (!title?.trim()) return;
    try {
      const opened = await invoke<PersistedOpenedNvvDocument>("create_nvv_document", {
        inventoryManifestPath: activeInventory.manifestPath,
        title,
      });
      rememberOpenedNvvDocument(opened, true);
      openTreeNodePath(["inventory-files", "inventory-vectors"]);
      setSelectedFolderId(null);
      setActiveView("inventory-vectors");
      setSelectedId(opened.asset.id);
      setNvvSaveState("idle");
      changeSceneMode("nvv-document");
      setStatusMessage(`Created NVV vector "${opened.document.title}".`);
    } catch (error) {
      setStatusMessage(`Could not create NVV vector: ${String(error)}`);
    }
  }

  async function handleOpenInventory() {
    setStatusMessage("Waiting for Inventory selection...");

    try {
      const selected = await open({
        directory: false,
        filters: [{ name: "Inventory", extensions: ["nvi"] }],
        multiple: false,
        title: "Open Inventory",
      });

      if (!selected || Array.isArray(selected)) {
        setStatusMessage("Open Inventory cancelled.");
        return;
      }

      const openedInventory = await invoke<PersistedOpenedInventory>("open_inventory", { path: selected });
      setActiveInventory(toActiveInventory(openedInventory));
      setInventoryDocuments(openedInventory.manifest.documents);
      setActiveNvdDocumentPath(null);
      setActiveNvdDocument(null);
      setNvdSaveState("idle");
      storeString(projectStorageKeys.activeInventoryManifestPath, openedInventory.manifestPath);
      applyLibraryStateToWorkspace(
        getPersistedLibraryStateFromManifest(openedInventory.manifest),
        `Opened Inventory "${openedInventory.manifest.inventory.name}".`,
        openedInventory.manifest.workspaceState,
      );
    } catch (error) {
      setStatusMessage(`Could not open Inventory: ${String(error)}`);
    }
  }

  async function handleCloseInventory() {
    if (!activeInventory) {
      return;
    }

    const closedInventoryName = activeInventory.name;
    const emptyLibraryState = createEmptyLibraryState();

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    setStatusMessage(`Closing Inventory "${closedInventoryName}"...`);

    try {
      await invoke("save_inventory", {
        path: activeInventory.manifestPath,
        state: currentLibraryState,
        workspaceState: currentWorkspaceState,
      });
    } catch (error) {
      setStatusMessage(`Could not close Inventory "${closedInventoryName}": ${String(error)}`);
      return;
    }

    removeStoredString(projectStorageKeys.activeInventoryManifestPath);
    setActiveInventory(null);
    setInventoryDocuments({ nvdDocuments: [], nvvDocuments: [] });
    setModelInspectorResults({});
    setLibraryNodeContextMenu(null);
    setSourceFolderContextMenu(null);
    setAddLibraryNodePanel(null);
    applyLibraryStateToWorkspace(
      emptyLibraryState,
      `Closed Inventory "${closedInventoryName}".`,
      createDefaultWorkspaceState(),
    );
  }

  function startLeftPaneResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    if (leftPaneCollapsed) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = leftPaneWidth;
    const workspaceWidth = getWorkspaceGridWidth(workspaceGridRef.current);
    const rightGridWidth = rightPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : rightPaneWidth;
    const maxWidth = Math.max(
      MIN_LEFT_PANE_WIDTH,
      Math.min(MAX_LEFT_PANE_WIDTH, workspaceWidth - rightGridWidth - MIN_MAIN_PANE_WIDTH),
    );

    document.body.classList.add("is-resizing-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLeftPaneWidth(clamp(startWidth + moveEvent.clientX - startX, MIN_LEFT_PANE_WIDTH, maxWidth));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-pane");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function startRightPaneResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    if (rightPaneCollapsed) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = rightPaneWidth;
    const workspaceWidth = getWorkspaceGridWidth(workspaceGridRef.current);
    const leftGridWidth = leftPaneCollapsed ? COLLAPSED_SIDE_PANE_WIDTH : leftPaneWidth;
    const maxWidth = Math.max(
      MIN_RIGHT_PANE_WIDTH,
      Math.min(MAX_RIGHT_PANE_WIDTH, workspaceWidth - leftGridWidth - MIN_MAIN_PANE_WIDTH),
    );

    document.body.classList.add("is-resizing-pane");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setRightPaneWidth(clamp(startWidth - (moveEvent.clientX - startX), MIN_RIGHT_PANE_WIDTH, maxWidth));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-pane");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function startAssetShelfResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    if (assetShelfCollapsed) {
      return;
    }

    event.preventDefault();

    const shelfElement = event.currentTarget.closest("section");
    const workspaceElement = shelfElement?.parentElement;
    const workspaceHeight = workspaceElement?.getBoundingClientRect().height ?? window.innerHeight;
    const startY = event.clientY;
    const startHeight = shelfElement?.getBoundingClientRect().height ?? assetShelfHeight ?? 320;
    const maxHeight = Math.max(MIN_ASSET_SHELF_HEIGHT, workspaceHeight - MIN_PREVIEW_STAGE_HEIGHT);

    document.body.classList.add("is-resizing-row");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setAssetShelfHeight(clamp(startHeight - (moveEvent.clientY - startY), MIN_ASSET_SHELF_HEIGHT, maxHeight));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-row");
      window.dispatchEvent(new Event(layoutResizeEndEvent));
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function resetAssetShelfHeight() {
    setAssetShelfHeight(null);
    removeStoredNumber(layoutStorageKeys.assetShelfHeight);
  }

  function toggleAssetShelfCollapsed() {
    setAssetShelfCollapsed((collapsed) => !collapsed);
  }

  function playAudioAsset(asset: Asset) {
    if (!isPlayableAudioAsset(asset)) {
      setStatusMessage("That audio format cannot be played here yet.");
      return;
    }

    setStatusMessage(`Playing "${asset.name}".`);
    void playAssetAudioOnce(asset).catch((error) => {
      setStatusMessage(`Could not play "${asset.name}": ${String(error)}`);
    });
  }

  function toggleSourceFolder(sourceId: string) {
    setSourceFolders((folders) => folders.map((folder) => (folder.id === sourceId ? { ...folder, enabled: !folder.enabled } : folder)));
  }

  function updateSelectedModelTransform(transform: ModelTransform) {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => ({ ...overrides, [selectedModelKey]: cloneModelTransform(transform) }));
  }

  function resetSelectedModelTransform() {
    if (!selectedModelKey) {
      return;
    }

    setModelTransformOverrides((overrides) => {
      const nextOverrides = { ...overrides };
      delete nextOverrides[selectedModelKey];
      return nextOverrides;
    });
  }

  function startSourceSectionResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();

    const startY = event.clientY;
    const startHeight = sourceSectionHeight;
    document.body.classList.add("is-resizing-row");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSourceSectionHeight(clamp(startHeight - (moveEvent.clientY - startY), MIN_SOURCE_SECTION_HEIGHT, MAX_SOURCE_SECTION_HEIGHT));
    };

    const stopResize = () => {
      document.body.classList.remove("is-resizing-row");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function selectTheme(themeId: string) {
    const theme = availableThemes.find((candidate) => candidate.id === themeId) ?? premadeThemes[1];
    setSelectedThemeId(theme.id);
    setThemeColors({ ...theme.colors });
    setThemeName(theme.builtin ? "" : theme.name);
  }

  function updateThemeColor(key: keyof ThemeColors, value: string) {
    if (selectedThemeIsBuiltin || !isHexColor(value)) {
      return;
    }

    setThemeColors((colors) => ({ ...colors, [key]: value }));
  }

  function saveTheme() {
    const name = themeName.trim() || (selectedTheme.builtin ? `${selectedTheme.name} Copy` : "Custom Theme");
    const existingCustomTheme = customThemes.find((theme) => theme.id === selectedThemeId);
    const themeId = existingCustomTheme?.id ?? `custom-${Date.now()}`;
    const savedTheme: ThemeDefinition = {
      id: themeId,
      name,
      colors: themeColors,
    };

    setCustomThemes((themes) =>
      themes.some((theme) => theme.id === themeId)
        ? themes.map((theme) => (theme.id === themeId ? savedTheme : theme))
        : [...themes, savedTheme],
    );
    setSelectedThemeId(themeId);
    setThemeName(name);
    setStatusMessage(`Saved theme "${name}".`);
  }

  function deleteSelectedTheme() {
    const theme = customThemes.find((candidate) => candidate.id === selectedThemeId);

    if (!theme) {
      return;
    }

    setCustomThemes((themes) => themes.filter((candidate) => candidate.id !== theme.id));
    selectTheme("dark");
    setStatusMessage(`Deleted theme "${theme.name}".`);
  }

  function updateNvdSaveReminderEnabled(enabled: boolean) {
    setNvdSaveReminderEnabled(enabled);
    storeNvdSaveReminderEnabled(enabled);
  }

  function updateNvdStyleResetConfirmationEnabled(enabled: boolean) {
    setNvdStyleResetConfirmationEnabled(enabled);
    storeNvdStyleResetConfirmationEnabled(enabled);
  }

  function dismissNvdSaveReminder() {
    if (window.confirm("Do you want to turn off this reminder? You can enable it again in Settings.")) {
      updateNvdSaveReminderEnabled(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-app text-ink" style={themeStyle}>
      <div className="flex h-full flex-col">
        <MenuBar
          activeInventoryName={activeInventory?.name ?? null}
          canRedo={canRedo}
          canUndo={canUndo}
          canOpenFolder={Boolean(activeInventory)}
          canSaveFile={canSaveFile}
          onCloseInventory={handleCloseInventory}
          onNewInventory={handleNewInventory}
          onNewNvdDocument={handleNewNvdDocument}
          onNewNvvDocument={handleNewNvvDocument}
          onOpenFolder={handleOpenFolder}
          onOpenInventory={handleOpenInventory}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRedo={redoActiveContext}
          onSaveFile={handleSaveFileCommand}
          onUndo={undoActiveContext}
          redoLabel={redoLabel}
          undoLabel={undoLabel}
        />
        <div className="grid min-h-0 flex-1 overflow-hidden" ref={workspaceGridRef} style={workspaceGridStyle}>
          <LibraryStructure
            activeView={activeView}
            activeNvdOutline={getNvdOutline(activeNvdDocument?.document ?? null)}
            canCreateFolder={Boolean(activeInventory)}
            canShowNvdNavigation={Boolean(activeInventory) && sceneMode === "nvd-document"}
            collapsed={leftPaneCollapsed}
            paneView={leftPaneView}
            nodes={structure}
            onCreateFolder={createFolder}
            onOpenTagBrowser={() => setIsTagBrowserOpen(true)}
            onPaneViewChange={changeLeftPaneView}
            onNavigateNvdBlock={navigateToNvdBlock}
            onResizeStart={startLeftPaneResize}
            onResetWidth={() => setLeftPaneWidth(DEFAULT_LEFT_PANE_WIDTH)}
            onSelectFolder={selectFolder}
            onSelectView={selectView}
            onSelectAsset={selectAsset}
            onSourceResizeStart={startSourceSectionResize}
            onToggleCollapsed={() => setLeftPaneCollapsed((collapsed) => !collapsed)}
            onToggleSourceCollapsed={() => setSourceSectionCollapsed((collapsed) => !collapsed)}
            onToggleSourceFolder={toggleSourceFolder}
            onOpenSourceFolderContextMenu={openSourceFolderContextMenu}
            onToggleTreeNode={toggleTreeNode}
            onOpenNodeContextMenu={openLibraryNodeContextMenu}
            selectedAssetId={selectedAsset?.id ?? null}
            sourceSectionCollapsed={sourceSectionCollapsed}
            sourceFolders={sourceFolders}
            sourceSectionHeight={sourceSectionHeight}
          />
          <MainWorkspace
            activeInventory={activeInventory}
            assets={sortedShelfAssets}
            activeView={activeView}
            activeFolderName={activeFolder?.name ?? null}
            assetSortDirection={assetSortDirection}
            assetSortKey={assetSortKey}
            canOpenFolder={Boolean(activeInventory)}
            isScanning={isScanning}
            detailsColumnWidths={detailsColumnWidths}
            selectedAsset={selectedAsset}
            statusMessage={statusMessage}
            assetShelfCollapsed={assetShelfCollapsed}
            assetShelfHeight={assetShelfHeight}
            assetSearchQuery={assetSearchQuery}
            onAssetShelfResizeStart={startAssetShelfResize}
            onAssetSearchQueryChange={setAssetSearchQuery}
            onAssetSortDirectionChange={setAssetSortDirection}
            onAssetSortKeyChange={setAssetSortKey}
            onAssetViewModeChange={setAssetViewMode}
            onDetailsColumnWidthChange={(columnKey, width) => {
              setDetailsColumnWidths((widths) => ({ ...widths, [columnKey]: width }));
            }}
            modelTransformOverride={selectedModelTransformOverride}
            nvdDocument={activeNvdDocument}
            nvvDocument={activeNvvDocument}
            nvdStyleDraft={nvdStyleDraft}
            nvdSaveReminderVisible={
              sceneMode === "nvd-document" && Boolean(activeNvdDocument) && hasUnsavedNvdChanges && nvdSaveReminderEnabled
            }
            onModelInspectorResult={handleModelInspectorResult}
            onNvdDocumentActivate={activateNvdDocumentContext}
            onCloseNvdDocument={requestCloseActiveNvdDocument}
            onCloseNvvDocument={() => void closeActiveNvvDocument()}
            onNvdDocumentChange={updateActiveNvdDocument}
            onNvvDocumentChange={updateActiveNvvDocument}
            onNvdEditorControllerChange={handleNvdEditorControllerChange}
            onNvdStyleDraftChange={updateNvdStyleDraft}
            onDismissNvdSaveReminder={dismissNvdSaveReminder}
            onNvdTextSelectionChange={handleNvdTextSelectionChange}
            onCreateNvdDocument={handleNewNvdDocument}
            onCreateNvvDocument={handleNewNvvDocument}
            onOpenAssetContextMenu={openAssetContextMenu}
            onPlayAudio={playAudioAsset}
            onResetAssetShelfHeight={resetAssetShelfHeight}
            onSceneModeChange={changeSceneMode}
            onToggleAssetShelfCollapsed={toggleAssetShelfCollapsed}
            onOpenFolder={handleOpenFolder}
            onSelectAsset={selectAsset}
            onSelectNativeHub={selectView}
            previewBackground={themeColors.preview}
            sceneMode={sceneMode}
            sourceSummary={sourceSummary}
            sourceFolderCount={sourceFolders.length}
            totalAssetCount={visibleAssets.length}
            viewMode={assetViewMode}
          />
          <Inspector
            activeNvdStyleRole={activeNvdStyleRole}
            assetPlacementSuggestions={assetPlacementSuggestions}
            collapsed={rightPaneCollapsed}
            documentStatistics={selectedDocumentStatistics}
            modelInspectorResult={selectedModelInspectorResult}
            modelTransformOverride={selectedModelTransformOverride}
            nvdStyleDefinitions={nvdStyleDefinitions}
            nvdCharacterSpacingPt={nvdStyleDraft?.characterSpacingPt ?? activeNvdCharacterSpacingPt}
            nvdLineHeight={nvdStyleDraft?.lineHeight ?? activeNvdLineHeight}
            nvdSpaceAfterPt={nvdStyleDraft?.spaceAfterPt ?? activeNvdSpaceAfterPt}
            nvdSpaceBeforePt={nvdStyleDraft?.spaceBeforePt ?? activeNvdSpaceBeforePt}
            nvvDocument={
              sceneMode === "nvv-document" &&
              selectedAsset &&
              activeNvvDocument &&
              normalizePath(selectedAsset.path) === normalizePath(activeNvvDocument.path)
                ? activeNvvDocument.document
                : null
            }
            onAcceptNvdStyle={acceptNvdStyleDraft}
            onApplyNvdStyle={applyNvdStyle}
            onAssetKeptTagsChange={updateAssetKeptTags}
            onAssetNotesChange={updateAssetNotes}
            onAssetPlacementSuggestionAccept={acceptAssetPlacementSuggestion}
            onAssetTagsChange={updateAssetTags}
            onModelTransformChange={updateSelectedModelTransform}
            onModelTransformReset={resetSelectedModelTransform}
            onNvdLineHeightChange={changeNvdLineHeight}
            onNvdCharacterSpacingPtChange={changeNvdCharacterSpacingPt}
            onNvdSpaceAfterPtChange={changeNvdSpaceAfterPt}
            onNvdSpaceBeforePtChange={changeNvdSpaceBeforePt}
            onNvvDocumentChange={updateActiveNvvDocument}
            onResizeStart={startRightPaneResize}
            onResetWidth={() => setRightPaneWidth(DEFAULT_RIGHT_PANE_WIDTH)}
            onResetNvdStyle={resetNvdStyle}
            onSelectNvdStyle={selectNvdStyle}
            onToggleCollapsed={() => setRightPaneCollapsed((collapsed) => !collapsed)}
            selectedAsset={selectedAsset}
            tagSuggestions={assetTagSuggestions}
          />
        </div>
      </div>
      {isSettingsOpen ? (
        <SettingsPanel
          availableThemes={availableThemes}
          canDeleteSelectedTheme={customThemes.some((theme) => theme.id === selectedThemeId)}
          nvdSaveReminderEnabled={nvdSaveReminderEnabled}
          nvdStyleResetConfirmationEnabled={nvdStyleResetConfirmationEnabled}
          onClose={() => setIsSettingsOpen(false)}
          onDeleteTheme={deleteSelectedTheme}
          onNvdSaveReminderEnabledChange={updateNvdSaveReminderEnabled}
          onNvdStyleResetConfirmationEnabledChange={updateNvdStyleResetConfirmationEnabled}
          onSaveTheme={saveTheme}
          onSelectTheme={selectTheme}
          onThemeEditorLayoutChange={setThemeEditorLayout}
          onThemeColorChange={updateThemeColor}
          onThemeNameChange={setThemeName}
          selectedThemeId={selectedThemeId}
          selectedThemeIsBuiltin={selectedThemeIsBuiltin}
          themeColors={themeColors}
          themeEditorLayout={themeEditorLayout}
          themeName={themeName}
        />
      ) : null}
      {pendingNvdStyleResetRole ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-6">
          <section
            aria-label="Refresh style to default"
            aria-modal="true"
            className="w-[min(430px,calc(100vw-48px))] rounded-sm border border-line bg-surface text-ink"
            role="dialog"
          >
            <div className="space-y-4 p-4">
              <div>
                <p className="text-base font-medium leading-relaxed text-ink">Do you want to refresh to default?</p>
                <p className="mt-1 text-xs text-muted">
                  You can revert this change with <strong className="font-semibold text-ink">Ctrl + Z</strong>.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  checked={hideFutureNvdStyleResetConfirmations}
                  className="h-4 w-4 accent-[rgb(var(--color-brand-blue))]"
                  type="checkbox"
                  onChange={(event) => setHideFutureNvdStyleResetConfirmations(event.target.checked)}
                />
                <span>Do not show this again</span>
              </label>
              <p className="text-xs text-muted">You can turn this back on in Settings.</p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={() => setPendingNvdStyleResetRole(null)}
              >
                Cancel
              </button>
              <button
                autoFocus
                className="rounded-sm border border-steel bg-steel px-3 py-1.5 text-sm text-white hover:opacity-90"
                type="button"
                onClick={confirmNvdStyleReset}
              >
                Refresh to default
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isNvdCloseConfirmationOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-6">
          <section
            aria-label="Save changes before closing"
            aria-modal="true"
            className="w-[min(450px,calc(100vw-48px))] rounded-sm border border-line bg-surface text-ink"
            role="dialog"
          >
            <div className="space-y-2 p-4">
              <p className="text-base font-medium leading-relaxed text-ink">Save changes before closing?</p>
              <p className="text-xs text-muted">
                Unsaved changes to {activeNvdDocument?.document.title ?? "this NVD document"} will be lost.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={() => setIsNvdCloseConfirmationOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={() => void closeActiveNvdDocument()}
              >
                Don't Save
              </button>
              <button
                autoFocus
                className="rounded-sm border border-steel bg-steel px-3 py-1.5 text-sm text-white hover:opacity-90"
                disabled={nvdSaveState === "saving"}
                type="button"
                onClick={() => void saveAndCloseActiveNvdDocument()}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {libraryNodeContextMenu ? (
        <LibraryNodeContextMenu
          menu={libraryNodeContextMenu}
          onAddChild={() =>
            openAddLibraryNodePanel(
              libraryNodeContextMenu.folderId ?? null,
              libraryNodeContextMenu.label,
            )
          }
          onDelete={() => {
            const menu = libraryNodeContextMenu;
            setLibraryNodeContextMenu(null);

            if (menu.target === "asset" && menu.isInventoryDocument && typeof menu.assetId === "number") {
              void deleteInventoryNvdDocument(menu.assetId);
            } else if (menu.folderId) {
              deleteLibraryNode(menu.folderId);
            }
          }}
          onRename={() => {
            const menu = libraryNodeContextMenu;
            setLibraryNodeContextMenu(null);

            if (menu.target === "asset" && menu.isInventoryDocument && typeof menu.assetId === "number") {
              void renameInventoryNvdDocument(menu.assetId);
            } else if (menu.target === "asset" && typeof menu.assetId === "number") {
              renameAssetDisplayName(menu.assetId);
            } else if (menu.folderId) {
              renameLibraryNode(menu.folderId);
            }
          }}
          onClose={() => setLibraryNodeContextMenu(null)}
        />
      ) : null}
      {sourceFolderContextMenu ? (
        <SourceFolderContextMenu
          menu={sourceFolderContextMenu}
          onClose={() => setSourceFolderContextMenu(null)}
          onRefresh={() => {
            const sourceId = sourceFolderContextMenu.sourceId;
            setSourceFolderContextMenu(null);
            void refreshSourceFolder(sourceId);
          }}
          onRemove={() => {
            const sourceId = sourceFolderContextMenu.sourceId;
            setSourceFolderContextMenu(null);
            removeSourceFolder(sourceId);
          }}
        />
      ) : null}
      {addLibraryNodePanel ? (
        <AddLibraryNodePanel
          assets={masterLibraryAssets}
          folders={virtualFolders}
          panel={addLibraryNodePanel}
          templates={libraryNodeTemplates}
          onClose={() => setAddLibraryNodePanel(null)}
          onCreate={addLibraryNodeFromDraft}
        />
      ) : null}
      {isTagBrowserOpen ? (
        <TagLibraryBrowser
          sections={libraryTagSourceSections}
          tags={libraryTagDefinitions}
          onClose={() => setIsTagBrowserOpen(false)}
        />
      ) : null}
    </main>
  );
}

function isLibraryView(value: string | null | undefined): value is LibraryView {
  return value === "all" || value === "inbox" || value === "inventory-files" || value === "inventory-documents" || value === "inventory-vectors";
}

function isNativeHubView(value: LibraryView): value is "inventory-files" | "inventory-documents" | "inventory-vectors" {
  return value === "inventory-files" || value === "inventory-documents" || value === "inventory-vectors";
}

function isSceneMode(value: string | null | undefined): value is SceneMode {
  return value === "preview" || value === "nvd-document" || value === "nvv-document";
}

function isLeftPaneView(value: string | null | undefined): value is LeftPaneView {
  return value === "library" || value === "nvd-navigation";
}

function createEmptyLibraryState(): PersistedLibraryState {
  return {
    rootPath: null,
    assets: [],
    sourceFolders: [],
    virtualFolders: [],
  };
}

function createDefaultWorkspaceState(): PersistedWorkspaceState {
  return {
    activeView: "all",
    leftPaneView: "library",
    sceneMode: "preview",
    selectedAssetId: null,
    selectedFolderId: null,
    treeOpenNodeIds: [...defaultTreeOpenNodeIds],
    assetSortKey: "name",
    assetSortDirection: "asc",
    assetViewMode: "medium",
    detailsColumnWidths: { ...defaultDetailsColumnWidths },
    assetSearchQuery: "",
    activeNvdDocumentPath: null,
    modelTransformOverrides: {},
  };
}

function getPersistedLibraryStateFromManifest(manifest: PersistedInventoryManifest): PersistedLibraryState {
  return {
    rootPath: manifest.rootPath ?? manifest.sourceFolders[0]?.path ?? null,
    assets: manifest.assets,
    sourceFolders: manifest.sourceFolders,
    virtualFolders: manifest.libraryTree,
  };
}

function upsertInventoryDocumentEntry(entries: InventoryDocumentEntry[], entry: InventoryDocumentEntry) {
  const entryPath = normalizePath(entry.path);
  const existingIndex = entries.findIndex((candidate) => normalizePath(candidate.path) === entryPath);
  const nextEntries = [...entries];

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = entry;
  } else {
    nextEntries.push(entry);
  }

  return nextEntries.sort((first, second) => compareText(first.title, second.title) || compareText(first.path, second.path));
}

function removeInventoryDocumentEntry(entries: InventoryDocumentEntry[], entry: InventoryDocumentEntry) {
  const entryPath = normalizePath(entry.path);
  return entries.filter((candidate) => candidate.assetId !== entry.assetId && normalizePath(candidate.path) !== entryPath);
}

function findInventoryNvdDocumentForAsset(asset: Pick<Asset, "id" | "path">, documents: InventoryDocumentsState) {
  const assetPath = normalizePath(asset.path);
  return (
    documents.nvdDocuments.find((document) => document.assetId === asset.id || normalizePath(document.path) === assetPath) ??
    null
  );
}

function isInventoryOwnedDocumentPath(path: string, activeInventory: ActiveInventory | null) {
  if (!activeInventory) {
    return false;
  }

  return normalizePath(path).startsWith(`${normalizePath(activeInventory.rootPath)}/documents/`);
}

function removeAssetIdsFromVirtualFolders(folders: VirtualFolder[], assetIds: Set<number>): VirtualFolder[] {
  return folders.map((folder) => ({
    ...folder,
    assetIds: folder.assetIds.filter((assetId) => !assetIds.has(assetId)),
    children: removeAssetIdsFromVirtualFolders(folder.children, assetIds),
  }));
}

function isNvdAsset(asset: Asset) {
  return asset.type === "Document" && asset.extension.toLowerCase() === "nvd";
}

function isNvvAsset(asset: Asset) {
  return asset.type === "Document" && asset.extension.toLowerCase() === "nvv";
}

function isEditableEventTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function AddLibraryNodePanel({
  assets,
  folders,
  panel,
  templates,
  onClose,
  onCreate,
}: {
  assets: Asset[];
  folders: VirtualFolder[];
  panel: AddLibraryNodePanelState;
  templates: LibraryNodeTemplate[];
  onClose: () => void;
  onCreate: (draft: AddLibraryNodeDraft, parentFolderId: string | null) => void;
}) {
  const parentOptions = useMemo(() => getAddLibraryNodeParentOptions(folders), [folders]);
  const [selectedParentFolderId, setSelectedParentFolderId] = useState<string | null>(panel.parentFolderId);
  const selectedParentFolder = selectedParentFolderId ? findFolder(folders, selectedParentFolderId) : null;
  const selectedParentLabel = selectedParentFolder?.name ?? "Master Library";
  const parentTemplate = useMemo(() => getLibraryNodeTemplateForSuggestionParent(selectedParentFolder, templates), [selectedParentFolder, templates]);
  const inheritedFileTypes = useMemo(() => getInheritedSuggestionFileTypes(parentTemplate), [parentTemplate]);
  const [folderName, setFolderName] = useState(panel.initialQuery);
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryNodeTemplate | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedFileTypes, setSelectedFileTypes] = useState<LibraryNodeFileType[]>(() => inheritedFileTypes);
  const panelRef = useRef<HTMLElement | null>(null);
  const panelDragRef = useRef<{
    height: number;
    offsetX: number;
    offsetY: number;
    pointerId: number;
    width: number;
  } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const suggestions = useMemo(() => getAddFolderSuggestions(templates, selectedParentFolder, folderName), [folderName, selectedParentFolder, templates]);
  const selectedSuggestion = selectedSuggestionId ? suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? null : null;
  const draftName = folderName.trim() || selectedTemplate?.name || "New Folder";
  const draftTags = useMemo(
    () => selectedSuggestion?.tags ?? getDefaultLibraryNodeTagsForName(draftName),
    [draftName, selectedSuggestion],
  );
  const draft = useMemo(
    () => createLibraryNodeDraft(selectedTemplate ?? customLibraryNodeTemplate, draftName, draftTags, selectedFileTypes),
    [draftName, draftTags, selectedFileTypes, selectedTemplate],
  );
  const previewAssets = useMemo(() => getAssetsForLibraryNode(createVirtualFolderFromDraft(draft), assets), [assets, draft]);
  const previewExamples = previewAssets.slice(0, 5);
  const panelStyle = panelPosition
    ? ({ left: panelPosition.x, top: panelPosition.y } satisfies CSSProperties)
    : ({ left: "50%", top: "50%", transform: "translate(-50%, -50%)" } satisfies CSSProperties);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (selectedParentFolderId && !findFolder(folders, selectedParentFolderId)) {
      setSelectedParentFolderId(null);
      setSelectedSuggestionId(null);
      setSelectedTemplate(null);
      setSelectedFileTypes(getInheritedSuggestionFileTypes(getLibraryNodeTemplateForSuggestionParent(null, templates)));
    }
  }, [folders, selectedParentFolderId, templates]);

  function updateFolderName(value: string) {
    const hadSuggestion = Boolean(selectedSuggestionId);

    setFolderName(value);
    setSelectedSuggestionId(null);

    if (hadSuggestion || (selectedTemplate && value !== selectedTemplate.name)) {
      setSelectedTemplate(null);
      setSelectedFileTypes(inheritedFileTypes);
    }
  }

  function updateParentFolder(value: string) {
    const parentFolderId = value || null;
    const nextParentFolder = parentFolderId ? findFolder(folders, parentFolderId) : null;
    const nextParentTemplate = getLibraryNodeTemplateForSuggestionParent(nextParentFolder, templates);

    setSelectedParentFolderId(parentFolderId);
    setSelectedSuggestionId(null);
    setSelectedTemplate(null);
    setSelectedFileTypes(getInheritedSuggestionFileTypes(nextParentTemplate));
  }

  function applySuggestion(suggestion: AddFolderSuggestion) {
    setSelectedSuggestionId(suggestion.id);
    setSelectedTemplate(suggestion.template);
    setFolderName(suggestion.name);
    setSelectedFileTypes(normalizeLibraryNodeFileTypes(suggestion.fileTypes));
  }

  function returnToSuggestions() {
    setSelectedSuggestionId(null);
    setSelectedTemplate(null);
    setFolderName(panel.initialQuery);
    setSelectedFileTypes(inheritedFileTypes);
  }

  function startPanelDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!isPrimaryPointer(event)) {
      return;
    }

    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const element = panelRef.current;

    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    panelDragRef.current = {
      height: bounds.height,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      pointerId: event.pointerId,
      width: bounds.width,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanelPosition({ x: bounds.left, y: bounds.top });
    document.body.classList.add("is-dragging-panel");
  }

  function dragPanel(event: ReactPointerEvent<HTMLElement>) {
    const dragState = panelDragRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const edgePadding = 8;
    const maxX = Math.max(edgePadding, window.innerWidth - dragState.width - edgePadding);
    const maxY = Math.max(edgePadding, window.innerHeight - dragState.height - edgePadding);

    setPanelPosition({
      x: clamp(event.clientX - dragState.offsetX, edgePadding, maxX),
      y: clamp(event.clientY - dragState.offsetY, edgePadding, maxY),
    });
  }

  function stopPanelDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = panelDragRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    panelDragRef.current = null;
    document.body.classList.remove("is-dragging-panel");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-6">
      <section
        className="absolute flex h-[min(760px,calc(100vh-64px))] w-[min(980px,calc(100vw-48px))] flex-col overflow-hidden rounded-sm border border-line bg-surface text-ink shadow-soft"
        ref={panelRef}
        style={panelStyle}
      >
        <header
          className="add-folder-drag-header flex h-12 shrink-0 items-center justify-between border-b border-line px-4"
          onPointerCancel={stopPanelDrag}
          onPointerDown={startPanelDrag}
          onPointerMove={dragPanel}
          onPointerUp={stopPanelDrag}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Add Folder</h2>
            <p className="truncate text-xs text-muted">Parent: {selectedParentLabel}</p>
          </div>
          <button className="icon-button" aria-label="Close add folder panel" title="Close" type="button" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-h-0 overflow-auto p-4">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs font-semibold uppercase text-muted">Name</span>
                <input
                  autoFocus
                  className="h-10 rounded-sm border border-line bg-canvas px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                  placeholder="Tables"
                  value={folderName}
                  onChange={(event) => updateFolderName(event.currentTarget.value)}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs font-semibold uppercase text-muted">Make Subdirectory Of</span>
                <select
                  className="h-10 rounded-sm border border-line bg-canvas px-3 text-sm text-ink outline-none transition focus:border-steel focus:ring-2 focus:ring-steel/20"
                  value={selectedParentFolderId ?? ""}
                  onChange={(event) => updateParentFolder(event.currentTarget.value)}
                >
                  {parentOptions.map((option) => (
                    <option key={option.id ?? "master-library"} value={option.id ?? ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-sm border border-line bg-canvas p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase text-muted">Matching Preview</span>
                  <span className="text-sm font-semibold">
                    {previewAssets.length} asset{previewAssets.length === 1 ? "" : "s"}
                  </span>
                </div>
                {previewExamples.length > 0 ? (
                  <div className="mt-3 grid gap-1">
                    {previewExamples.map((asset) => (
                      <div className="flex min-w-0 items-center justify-between gap-3 rounded-sm bg-surface px-2 py-1 text-xs" key={asset.id}>
                        <span className="truncate font-medium">{asset.name}</span>
                        <span className="shrink-0 text-muted">.{asset.extension}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-muted">No loaded assets match this folder yet.</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {selectedSuggestion ? `Suggestion: ${selectedSuggestion.category} / ${selectedSuggestion.name}` : "Custom folder"}
                </p>
                <button className="primary-button" type="button" onClick={() => onCreate(draft, selectedParentFolderId)}>
                  <FolderPlus size={16} aria-hidden="true" />
                  <span>Create Folder</span>
                </button>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-line bg-canvas p-3">
            <div className="flex shrink-0 items-center justify-between gap-2 text-xs font-semibold uppercase text-muted">
              <div className="flex min-w-0 items-center gap-2">
                <Search size={14} aria-hidden="true" />
                <span className="truncate">Suggestions for {selectedParentLabel}</span>
              </div>
              {selectedSuggestionId ? (
                <button className="dark-icon-button h-7 w-7 border-transparent bg-transparent" type="button" title="Back to suggestions" aria-label="Back to suggestions" onClick={returnToSuggestions}>
                  <ArrowLeft size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid min-h-0 gap-1 overflow-auto">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <AddFolderSuggestionButton
                    key={suggestion.id}
                    selected={selectedSuggestionId === suggestion.id}
                    suggestion={suggestion}
                    onSelect={() => applySuggestion(suggestion)}
                  />
                ))
              ) : (
                <div className="rounded-sm border border-line bg-surface p-3 text-xs leading-relaxed text-muted">No suggestion matched. The folder can still be created from your name, tags, and file types.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function AddFolderSuggestionButton({
  selected,
  suggestion,
  onSelect,
}: {
  selected: boolean;
  suggestion: AddFolderSuggestion;
  onSelect: () => void;
}) {
  const Icon = suggestion.icon;

  return (
    <button className={`add-folder-suggestion-row ${selected ? "add-folder-suggestion-row-selected" : ""}`} type="button" onClick={onSelect}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-raised text-steel">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{suggestion.name}</span>
        <span className="block truncate text-[11px] text-muted">{suggestion.category} / {suggestion.fileTypes.join(", ")}</span>
      </span>
    </button>
  );
}

function getAddLibraryNodeParentOptions(folders: VirtualFolder[]): AddLibraryNodeParentOption[] {
  const options: AddLibraryNodeParentOption[] = [{ id: null, label: "Master Library" }];

  function addFolderOptions(currentFolders: VirtualFolder[], parentLabels: string[]) {
    for (const folder of currentFolders) {
      const pathLabels = [...parentLabels, folder.name];

      options.push({
        id: folder.id,
        label: pathLabels.join(" / "),
      });
      addFolderOptions(folder.children, pathLabels);
    }
  }

  addFolderOptions(folders, ["Master Library"]);
  return options;
}

function getAddFolderSuggestions(templates: LibraryNodeTemplate[], parentFolder: VirtualFolder | null, query: string): AddFolderSuggestion[] {
  const search = normalizeLibraryMatchText(query);
  const parentTemplate = getLibraryNodeTemplateForSuggestionParent(parentFolder, templates);
  const parentLabel = parentFolder?.name ?? "Master Library";
  const parentFileTypes = getInheritedSuggestionFileTypes(parentTemplate);
  const suggestions: AddFolderSuggestion[] = [];
  const seenNames = new Set<string>();

  function addSuggestion(suggestion: AddFolderSuggestion) {
    const key = normalizeLibraryMatchText(suggestion.name);

    if (!key || seenNames.has(key)) {
      return;
    }

    if (search && !getAddFolderSuggestionSearchText(suggestion).includes(search)) {
      return;
    }

    seenNames.add(key);
    suggestions.push(suggestion);
  }

  for (const childName of parentTemplate.childSuggestions) {
    const childTemplate = findLibraryNodeTemplateByName(templates, childName);

    addSuggestion(
      childTemplate
        ? createSuggestionFromTemplate(childTemplate, "parent", parentFileTypes)
        : createCustomChildSuggestion(childName, parentLabel, parentFileTypes, parentTemplate.icon),
    );
  }

  const rankedTemplates = templates
    .filter((template) => template.id !== parentTemplate.id && template.id !== "all-assets")
    .map((template) => ({ rank: rankTemplateForParentSuggestion(template, parentTemplate, search), template }))
    .filter(({ rank }) => rank < 500)
    .sort((first, second) => first.rank - second.rank || compareText(first.template.name, second.template.name));

  for (const { template } of rankedTemplates) {
    addSuggestion(createSuggestionFromTemplate(template, "catalog", parentFileTypes));

    if (!search && suggestions.length >= 14) {
      break;
    }
  }

  return suggestions.slice(0, search ? 24 : 14);
}

function createSuggestionFromTemplate(
  template: LibraryNodeTemplate,
  source: AddFolderSuggestion["source"],
  parentFileTypes: LibraryNodeFileType[],
): AddFolderSuggestion {
  return {
    category: template.category,
    description: template.description,
    fileTypes: scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes),
    icon: template.icon,
    id: `${source}:${template.id}`,
    name: template.name,
    source,
    tags: getLibraryNodeTagsFromTemplate(template, template.name),
    template,
  };
}

function createCustomChildSuggestion(
  name: string,
  parentLabel: string,
  parentFileTypes: LibraryNodeFileType[],
  icon: LucideIcon,
): AddFolderSuggestion {
  return {
    category: `${parentLabel} Child`,
    description: `Suggested child folder under ${parentLabel}.`,
    fileTypes: parentFileTypes,
    icon,
    id: `parent:${toSlug(name) || normalizeLibraryMatchText(name)}`,
    name,
    source: "parent",
    tags: getDefaultLibraryNodeTagsForName(name),
    template: null,
  };
}

function rankTemplateForParentSuggestion(template: LibraryNodeTemplate, parentTemplate: LibraryNodeTemplate, search: string) {
  const templateText = getLibraryNodeTemplateSearchText(template);

  if (search && !templateText.includes(search)) {
    return 600;
  }

  const childSuggestionIndex = parentTemplate.childSuggestions.findIndex(
    (childName) => normalizeLibraryMatchText(childName) === normalizeLibraryMatchText(template.name),
  );

  if (childSuggestionIndex >= 0) {
    return childSuggestionIndex;
  }

  if (search) {
    return templateText.startsWith(search) || normalizeLibraryMatchText(template.name).includes(search) ? 100 : 180;
  }

  if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes)) {
    return parentTemplate.category === template.category ? 170 : 220;
  }

  if (parentTemplate.fileTypes.includes("Any") || template.fileTypes.includes("Any")) {
    return 260;
  }

  return 600;
}

function getAddFolderSuggestionSearchText(suggestion: AddFolderSuggestion) {
  return normalizeLibraryMatchText([
    suggestion.name,
    suggestion.category,
    suggestion.description,
    ...suggestion.fileTypes,
    ...suggestion.tags,
    suggestion.template ? getLibraryNodeTemplateSearchText(suggestion.template) : "",
  ].join(" "));
}

function getLibraryNodeTemplateForSuggestionParent(parentFolder: VirtualFolder | null, templates: LibraryNodeTemplate[]) {
  if (!parentFolder) {
    return templates.find((template) => template.id === "all-assets") ?? customLibraryNodeTemplate;
  }

  const template = getLibraryNodeTemplateForFolder(parentFolder);

  if (template.id !== "custom") {
    return template;
  }

  return findLibraryNodeTemplateByName(templates, parentFolder.name) ?? template;
}

function findLibraryNodeTemplateByName(templates: LibraryNodeTemplate[], name: string) {
  const normalizedName = normalizeLibraryMatchText(name);
  return templates.find((template) => normalizeLibraryMatchText(template.name) === normalizedName);
}

function getInheritedSuggestionFileTypes(template: LibraryNodeTemplate) {
  const fileTypes = normalizeLibraryNodeFileTypes(template.fileTypes);
  return fileTypes.includes("Any") ? (["Any"] satisfies LibraryNodeFileType[]) : fileTypes;
}

function scopeLibraryNodeFileTypes(parentFileTypes: LibraryNodeFileType[], childFileTypes: LibraryNodeFileType[]) {
  const normalizedParentFileTypes = normalizeLibraryNodeFileTypes(parentFileTypes);
  const normalizedChildFileTypes = normalizeLibraryNodeFileTypes(childFileTypes);

  if (normalizedParentFileTypes.includes("Any")) {
    return normalizedChildFileTypes;
  }

  if (normalizedChildFileTypes.includes("Any")) {
    return normalizedParentFileTypes;
  }

  const scopedFileTypes = normalizedChildFileTypes.filter((fileType) => normalizedParentFileTypes.includes(fileType));
  return scopedFileTypes.length > 0 ? scopedFileTypes : normalizedParentFileTypes;
}

function libraryNodeFileTypesOverlap(first: LibraryNodeFileType[], second: LibraryNodeFileType[]) {
  const normalizedFirst = normalizeLibraryNodeFileTypes(first);
  const normalizedSecond = normalizeLibraryNodeFileTypes(second);

  return normalizedFirst.includes("Any") || normalizedSecond.includes("Any") || normalizedFirst.some((fileType) => normalizedSecond.includes(fileType));
}

function getLibraryNodeTemplateSearchText(template: LibraryNodeTemplate) {
  return [
    template.name,
    template.description,
    template.category,
    ...template.aliases,
    ...template.suggestedTags,
    ...template.fileTypes,
    ...template.childSuggestions,
    ...template.matchRules.flatMap((rule) => [rule.field, ...rule.terms]),
  ]
    .join(" ")
    .toLowerCase();
}

function groupLibraryNodeTemplates(templates: LibraryNodeTemplate[]) {
  const groups: Array<{ category: string; templates: LibraryNodeTemplate[] }> = [];

  for (const template of templates) {
    const group = groups.find((candidate) => candidate.category === template.category);

    if (group) {
      group.templates.push(template);
    } else {
      groups.push({ category: template.category, templates: [template] });
    }
  }

  return groups;
}

function LibraryStructure({
  activeView,
  activeNvdOutline,
  canCreateFolder,
  canShowNvdNavigation,
  collapsed,
  nodes,
  onCreateFolder,
  onOpenTagBrowser,
  onNavigateNvdBlock,
  onPaneViewChange,
  onResizeStart,
  onResetWidth,
  onSelectAsset,
  onSelectFolder,
  onSelectView,
  onSourceResizeStart,
  onToggleCollapsed,
  onToggleSourceCollapsed,
  onToggleSourceFolder,
  onOpenSourceFolderContextMenu,
  onToggleTreeNode,
  onOpenNodeContextMenu,
  paneView,
  selectedAssetId,
  sourceSectionCollapsed,
  sourceFolders,
  sourceSectionHeight,
}: {
  activeView: LibraryView;
  activeNvdOutline: NvdOutlineEntry[];
  canCreateFolder: boolean;
  canShowNvdNavigation: boolean;
  collapsed: boolean;
  nodes: StructureNode[];
  onCreateFolder: () => void;
  onOpenTagBrowser: () => void;
  onNavigateNvdBlock: (blockIndex: number) => void;
  onPaneViewChange: (view: LeftPaneView) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetWidth: () => void;
  onSelectAsset: (assetId: number) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectView: (view: LibraryView) => void;
  onSourceResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  onToggleSourceCollapsed: () => void;
  onToggleSourceFolder: (sourceId: string) => void;
  onOpenSourceFolderContextMenu: (folder: SourceFolder, event: ReactMouseEvent<HTMLElement>) => void;
  onToggleTreeNode: (nodeId: string) => void;
  onOpenNodeContextMenu: (node: StructureNode, event: ReactMouseEvent<HTMLElement>) => void;
  paneView: LeftPaneView;
  selectedAssetId: number | null;
  sourceSectionCollapsed: boolean;
  sourceFolders: SourceFolder[];
  sourceSectionHeight: number;
}) {
  const isLibraryPane = paneView === "library";
  const paneLabel = isLibraryPane ? "Library Structure" : "NVD Navigation";

  if (collapsed) {
    return (
      <aside className="library-panel relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar text-ink">
        <div className="flex min-h-0 flex-1 flex-col items-center border-r border-line px-1 py-2">
          <button
            aria-label={`Expand ${paneLabel.toLowerCase()}`}
            className="dark-icon-button h-8 w-8"
            title={`Expand ${paneLabel.toLowerCase()}`}
            type="button"
            onClick={onToggleCollapsed}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <div
            className="mt-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-normal text-muted"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {isLibraryPane ? "Library" : "NVD Navigation"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="library-panel relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar text-ink">
      <div
        aria-label="Resize library structure"
        aria-orientation="vertical"
        className="pane-resize-handle pane-resize-handle-right"
        onDoubleClick={onResetWidth}
        onPointerDown={onResizeStart}
        role="separator"
        title="Resize library structure. Double-click to reset."
      />
      <div className="flex min-h-0 flex-1 flex-col border-r border-line">
        <div className="flex h-10 shrink-0 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="left-pane-view-switcher" role="tablist" aria-label="Left pane view">
              <button
                aria-label="Library Structure"
                aria-selected={isLibraryPane}
                className={`left-pane-view-button ${isLibraryPane ? "left-pane-view-button-active" : ""}`}
                role="tab"
                title="Library Structure"
                type="button"
                onClick={() => onPaneViewChange("library")}
              >
                <Backpack size={13} aria-hidden="true" />
              </button>
              <button
                aria-label="NVD Navigation"
                aria-selected={!isLibraryPane}
                className={`left-pane-view-button ${!isLibraryPane ? "left-pane-view-button-active" : ""} ${
                  canShowNvdNavigation && isLibraryPane ? "left-pane-view-button-attention" : ""
                }`}
                disabled={!canShowNvdNavigation}
                role="tab"
                title={canShowNvdNavigation ? "NVD Navigation" : "Open the NVD editor to use document navigation"}
                type="button"
                onClick={() => onPaneViewChange("nvd-navigation")}
              >
                <ListTree size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="dark-icon-button" aria-label={`Minimize ${paneLabel.toLowerCase()}`} title={`Minimize ${paneLabel.toLowerCase()}`} type="button" onClick={onToggleCollapsed}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            {isLibraryPane ? (
              <>
                <button className="dark-icon-button" aria-label="Add library node" disabled={!canCreateFolder} title="Add library node" onClick={onCreateFolder}>
                  <Plus size={14} aria-hidden="true" />
                </button>
                <button className="dark-icon-button" aria-label="Browse tag library" title="Browse tag library" type="button" onClick={onOpenTagBrowser}>
                  <ListTree size={14} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {isLibraryPane ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
              {nodes.map((node) => (
                <StructureRow
                  activeView={activeView}
                  key={node.id}
                  node={node}
                  depth={0}
                  onSelectFolder={onSelectFolder}
                  onSelectView={onSelectView}
                  onSelectAsset={onSelectAsset}
                  onToggleNode={onToggleTreeNode}
                  onOpenContextMenu={onOpenNodeContextMenu}
                  selectedAssetId={selectedAssetId}
                />
              ))}
            </div>

            <SourceFoldersPanel
              collapsed={sourceSectionCollapsed}
              height={sourceSectionHeight}
              onResizeStart={onSourceResizeStart}
              onToggleCollapsed={onToggleSourceCollapsed}
              onToggleSourceFolder={onToggleSourceFolder}
              onOpenSourceFolderContextMenu={onOpenSourceFolderContextMenu}
              sourceFolders={sourceFolders}
            />
          </>
        ) : (
          <NvdNavigation
            activeOutline={activeNvdOutline}
            onNavigateBlock={onNavigateNvdBlock}
          />
        )}
      </div>
    </aside>
  );
}

function NvdNavigation({
  activeOutline,
  onNavigateBlock,
}: {
  activeOutline: NvdOutlineEntry[];
  onNavigateBlock: (blockIndex: number) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase text-muted">Navigation</div>
      {activeOutline.length > 0 ? (
        <div>
          {activeOutline.map((entry) => (
            <button
              className="nvd-outline-row"
              key={entry.id}
              style={{ paddingLeft: `${12 + entry.depth * 12}px` }}
              title={entry.text}
              type="button"
              onClick={() => onNavigateBlock(entry.blockIndex)}
            >
              <span className="nvd-outline-role">{entry.role}</span>
              <span className="truncate">{entry.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-muted">Add text to build the outline.</div>
      )}
    </div>
  );
}

function getNvdOutline(document: NvdDocument | null): NvdOutlineEntry[] {
  if (!document) {
    return [];
  }

  const outline: NvdOutlineEntry[] = [];
  document.blocks.forEach((block, blockIndex) => {
    const role = getNvdStyleRole(block.kind);
    const text = block.text.trim();

    if (role !== "p" && text) {
      outline.push({
        blockIndex,
        depth: getNvdHeadingDepth(role),
        id: block.id,
        role,
        text,
      });
    }
  });

  return outline;
}

function getNvdHeadingDepth(role: Exclude<NvdStyleRole, "p">) {
  return Number(role.slice(1)) - 1;
}

function SourceFoldersPanel({
  collapsed,
  height,
  onResizeStart,
  onToggleCollapsed,
  onToggleSourceFolder,
  onOpenSourceFolderContextMenu,
  sourceFolders,
}: {
  collapsed: boolean;
  height: number;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  onToggleSourceFolder: (sourceId: string) => void;
  onOpenSourceFolderContextMenu: (folder: SourceFolder, event: ReactMouseEvent<HTMLElement>) => void;
  sourceFolders: SourceFolder[];
}) {
  const enabledCount = sourceFolders.filter((folder) => folder.enabled).length;

  return (
    <section className="relative flex shrink-0 flex-col border-t border-line" style={{ height: collapsed ? 36 : height }}>
      {!collapsed ? (
        <div
          aria-label="Resize source folders"
          aria-orientation="horizontal"
          className="row-resize-handle"
          onDoubleClick={() => undefined}
          onPointerDown={onResizeStart}
          role="separator"
          title="Resize source folders."
        />
      ) : null}
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-muted">
          <FolderSearch size={13} aria-hidden="true" />
          <span>Source Folders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-[11px] text-muted">
            {enabledCount}/{sourceFolders.length}
          </span>
          <button
            aria-label={collapsed ? "Expand source folders" : "Minimize source folders"}
            className="dark-icon-button h-6 w-6 border-transparent bg-transparent"
            title={collapsed ? "Expand source folders" : "Minimize source folders"}
            onClick={onToggleCollapsed}
          >
            <ChevronDown className={collapsed ? "" : "rotate-180"} size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!collapsed ? <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {sourceFolders.length > 0 ? (
          <div className="overflow-hidden rounded-sm border border-line">
            {sourceFolders.map((folder) => (
              <button
                className={`source-folder-row ${folder.enabled ? "" : "source-folder-row-disabled"}`}
                key={folder.id}
                onClick={() => onToggleSourceFolder(folder.id)}
                onContextMenu={(event) => onOpenSourceFolderContextMenu(folder, event)}
                title={folder.path}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{folder.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="truncate text-[11px] text-muted">
                    {folder.assetIds.length} asset{folder.assetIds.length === 1 ? "" : "s"}
                    {folder.skippedEntries > 0 ? `, ${folder.skippedEntries} skipped` : ""}
                  </span>
                  <span className={`source-folder-toggle ${folder.enabled ? "source-folder-toggle-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-line bg-surface p-2 text-xs leading-relaxed text-muted">No source folders loaded yet.</div>
        )}
      </div> : null}
    </section>
  );
}

type TagLibraryResizeHandle = "top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-right" | "bottom-left";

type TagLibraryWindowRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const tagLibraryWindowPadding = 16;
const tagLibraryMinHeight = 420;
const tagLibraryMinWidth = 620;
const tagLibraryDefaultHeight = 860;
const tagLibraryDefaultWidth = 1180;

function TagLibraryBrowser({
  sections,
  tags,
  onClose,
}: {
  sections: LibraryTagSourceSection[];
  tags: LibraryTagDefinition[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSystemMinimized, setIsSystemMinimized] = useState(true);
  const [isStylesMinimized, setIsStylesMinimized] = useState(true);
  const [windowRect, setWindowRect] = useState<TagLibraryWindowRect>(() => getDefaultTagLibraryWindowRect());
  const windowRef = useRef<HTMLElement | null>(null);
  const windowInteractionCleanupRef = useRef<(() => void) | null>(null);
  const normalizedQuery = normalizeLibraryMatchText(query);
  const visibleSections = useMemo(
    () => filterTagSourceSections(sections, normalizedQuery),
    [normalizedQuery, sections],
  );
  const systemSection = visibleSections.find((section) => section.id === "system") ?? null;
  const stylesSection = visibleSections.find((section) => section.id === "styles") ?? null;
  const contentSections = visibleSections.filter((section) => section.id !== "system" && section.id !== "styles");
  const visibleCount = useMemo(() => countTagSourceSectionTags(visibleSections), [visibleSections]);
  const modalClassName = isMaximized
    ? "relative flex h-full w-full flex-col overflow-hidden border border-line bg-surface text-ink"
    : "absolute flex flex-col overflow-hidden rounded-sm border border-line bg-surface text-ink";
  const overlayClassName = isMaximized ? "fixed inset-0 z-[60] bg-black/45 p-0" : "fixed inset-0 z-[60] bg-black/45";
  const modalStyle = isMaximized
    ? undefined
    : ({
        height: windowRect.height,
        left: windowRect.x,
        top: windowRect.y,
        width: windowRect.width,
      } satisfies CSSProperties);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    function handleWindowResize() {
      setWindowRect((rect) => constrainTagLibraryWindowRect(rect));
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    return () => {
      windowInteractionCleanupRef.current?.();
    };
  }, []);

  function startWindowDrag(event: ReactPointerEvent<HTMLElement>) {
    if (isMaximized || !isPrimaryPointer(event)) {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;

    if (targetElement?.closest("button, input, textarea, select, a")) {
      return;
    }

    const element = windowRef.current;

    if (!element) {
      return;
    }

    event.preventDefault();
    windowInteractionCleanupRef.current?.();

    const bounds = element.getBoundingClientRect();
    const dragRect = constrainTagLibraryWindowRect({
      height: bounds.height,
      width: bounds.width,
      x: bounds.left,
      y: bounds.top,
    });
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;
    const pointerId = event.pointerId;
    setWindowRect(dragRect);
    document.body.classList.add("is-dragging-tag-library");

    function handlePointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      setWindowRect(
        constrainTagLibraryWindowRect({
          height: dragRect.height,
          width: dragRect.width,
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        }),
      );
    }

    function cleanupDrag() {
      document.body.classList.remove("is-dragging-tag-library");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    }

    function stopDrag(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      cleanupDrag();

      if (windowInteractionCleanupRef.current === cleanupDrag) {
        windowInteractionCleanupRef.current = null;
      }
    }

    windowInteractionCleanupRef.current = cleanupDrag;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  function startWindowResize(event: ReactPointerEvent<HTMLDivElement>, handle: TagLibraryResizeHandle) {
    if (isMaximized || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    windowInteractionCleanupRef.current?.();

    const cursorClassName = getTagLibraryResizeCursorClassName(handle);
    const startRect = constrainTagLibraryWindowRect(windowRect);
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    setWindowRect(startRect);
    document.body.classList.add("is-resizing-tag-library", cursorClassName);

    function handlePointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      setWindowRect(resizeTagLibraryWindowRect(startRect, handle, moveEvent.clientX - startX, moveEvent.clientY - startY));
    }

    function cleanupResize() {
      document.body.classList.remove("is-resizing-tag-library", cursorClassName);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    }

    function stopResize(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }

      cleanupResize();

      if (windowInteractionCleanupRef.current === cleanupResize) {
        windowInteractionCleanupRef.current = null;
      }
    }

    windowInteractionCleanupRef.current = cleanupResize;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function toggleMaximized() {
    if (isMaximized) {
      setWindowRect((rect) => constrainTagLibraryWindowRect(rect));
    }

    setIsMaximized((value) => !value);
  }

  return (
    <div className={overlayClassName}>
      <section
        aria-label="Tag library browser"
        aria-modal="true"
        className={modalClassName}
        ref={windowRef}
        role="dialog"
        style={modalStyle}
      >
        {!isMaximized ? (
          <>
            <div
              aria-label="Resize tag library from top edge"
              aria-orientation="horizontal"
              className="tag-library-resize-handle tag-library-resize-handle-top"
              onPointerDown={(event) => startWindowResize(event, "top")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from right edge"
              aria-orientation="vertical"
              className="tag-library-resize-handle tag-library-resize-handle-right"
              onPointerDown={(event) => startWindowResize(event, "right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom edge"
              aria-orientation="horizontal"
              className="tag-library-resize-handle tag-library-resize-handle-bottom"
              onPointerDown={(event) => startWindowResize(event, "bottom")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from left edge"
              aria-orientation="vertical"
              className="tag-library-resize-handle tag-library-resize-handle-left"
              onPointerDown={(event) => startWindowResize(event, "left")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from top-left corner"
              className="tag-library-resize-handle tag-library-resize-handle-top-left"
              onPointerDown={(event) => startWindowResize(event, "top-left")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from top-right corner"
              className="tag-library-resize-handle tag-library-resize-handle-top-right"
              onPointerDown={(event) => startWindowResize(event, "top-right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom-right corner"
              className="tag-library-resize-handle tag-library-resize-handle-bottom-right"
              onPointerDown={(event) => startWindowResize(event, "bottom-right")}
              role="separator"
              title="Resize tag library"
            />
            <div
              aria-label="Resize tag library from bottom-left corner"
              className="tag-library-resize-handle tag-library-resize-handle-bottom-left"
              onPointerDown={(event) => startWindowResize(event, "bottom-left")}
              role="separator"
              title="Resize tag library"
            />
          </>
        ) : null}
        <header
          className={`${isMaximized ? "" : "tag-library-drag-header"} flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4`}
          onPointerDown={startWindowDrag}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Tag Library</h2>
            <p className="truncate text-[11px] text-muted">
              {visibleCount}/{tags.length} tags visible
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <label className="relative w-[min(360px,45vw)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} aria-hidden="true" />
              <input
                autoFocus
                className="h-8 w-full rounded-sm border border-line bg-canvas pl-8 pr-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-steel focus:ring-2 focus:ring-steel/20"
                placeholder="Search folders, files, tags..."
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label={isMaximized ? "Restore tag library" : "Maximize tag library"}
              title={isMaximized ? "Restore" : "Maximize"}
              type="button"
              onClick={toggleMaximized}
            >
              {isMaximized ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            </button>
            <button className="icon-button" aria-label="Close tag library" title="Close" type="button" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <TagSourceSidePanel
            folder={systemSection}
            isMinimized={isSystemMinimized}
            label="System"
            side="left"
            onToggle={() => setIsSystemMinimized((value) => !value)}
          />
          <div className="min-h-0 overflow-auto border-x border-line bg-canvas">
            <div className="min-w-[520px] py-2">
              {contentSections.length > 0 ? (
                <TagSourceTree folders={contentSections} />
              ) : (
                <div className="mx-3 rounded-sm border border-line bg-surface p-4 text-sm text-muted">No tags match that search.</div>
              )}
            </div>
          </div>
          <TagSourceSidePanel
            folder={stylesSection}
            isMinimized={isStylesMinimized}
            label="Styles"
            side="right"
            onToggle={() => setIsStylesMinimized((value) => !value)}
          />
        </div>
      </section>
    </div>
  );
}

function getDefaultTagLibraryWindowRect(): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  const width = Math.min(tagLibraryDefaultWidth, constraints.maxWidth);
  const height = Math.min(tagLibraryDefaultHeight, constraints.maxHeight);

  return constrainTagLibraryWindowRect({
    height,
    width,
    x: Math.round((constraints.viewportWidth - width) / 2),
    y: Math.round((constraints.viewportHeight - height) / 2),
  });
}

function constrainTagLibraryWindowRect(rect: TagLibraryWindowRect): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  const width = clamp(rect.width, constraints.minWidth, constraints.maxWidth);
  const height = clamp(rect.height, constraints.minHeight, constraints.maxHeight);
  const maxX = Math.max(tagLibraryWindowPadding, constraints.viewportWidth - width - tagLibraryWindowPadding);
  const maxY = Math.max(tagLibraryWindowPadding, constraints.viewportHeight - height - tagLibraryWindowPadding);

  return {
    height,
    width,
    x: clamp(rect.x, tagLibraryWindowPadding, maxX),
    y: clamp(rect.y, tagLibraryWindowPadding, maxY),
  };
}

function resizeTagLibraryWindowRect(
  startRect: TagLibraryWindowRect,
  handle: TagLibraryResizeHandle,
  deltaX: number,
  deltaY: number,
): TagLibraryWindowRect {
  const constraints = getTagLibraryWindowConstraints();
  let left = startRect.x;
  let top = startRect.y;
  let right = startRect.x + startRect.width;
  let bottom = startRect.y + startRect.height;

  if (handle.includes("left")) {
    left = clamp(startRect.x + deltaX, tagLibraryWindowPadding, right - constraints.minWidth);
  }

  if (handle.includes("right")) {
    right = clamp(startRect.x + startRect.width + deltaX, left + constraints.minWidth, constraints.viewportWidth - tagLibraryWindowPadding);
  }

  if (handle.includes("top")) {
    top = clamp(startRect.y + deltaY, tagLibraryWindowPadding, bottom - constraints.minHeight);
  }

  if (handle.includes("bottom")) {
    bottom = clamp(startRect.y + startRect.height + deltaY, top + constraints.minHeight, constraints.viewportHeight - tagLibraryWindowPadding);
  }

  return constrainTagLibraryWindowRect({
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  });
}

function getTagLibraryWindowConstraints() {
  const viewportWidth = typeof window === "undefined" ? tagLibraryDefaultWidth + tagLibraryWindowPadding * 2 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? tagLibraryDefaultHeight + tagLibraryWindowPadding * 2 : window.innerHeight;
  const maxWidth = Math.max(240, viewportWidth - tagLibraryWindowPadding * 2);
  const maxHeight = Math.max(260, viewportHeight - tagLibraryWindowPadding * 2);

  return {
    maxHeight,
    maxWidth,
    minHeight: Math.min(tagLibraryMinHeight, maxHeight),
    minWidth: Math.min(tagLibraryMinWidth, maxWidth),
    viewportHeight,
    viewportWidth,
  };
}

function getTagLibraryResizeCursorClassName(handle: TagLibraryResizeHandle) {
  if (handle === "top-left" || handle === "bottom-right") {
    return "is-resizing-tag-library-nwse";
  }

  if (handle === "top-right" || handle === "bottom-left") {
    return "is-resizing-tag-library-nesw";
  }

  if (handle === "left" || handle === "right") {
    return "is-resizing-tag-library-ew";
  }

  return "is-resizing-tag-library-ns";
}

function TagSourceSidePanel({
  folder,
  isMinimized,
  label,
  side,
  onToggle,
}: {
  folder: LibraryTagSourceFolder | null;
  isMinimized: boolean;
  label: string;
  side: "left" | "right";
  onToggle: () => void;
}) {
  const count = folder ? countTagSourceFolderTags(folder) : 0;
  const chevron = side === "left"
    ? isMinimized ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />
    : isMinimized ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />;

  if (isMinimized) {
    return (
      <aside className="flex w-10 min-w-10 flex-col items-center border-line bg-surface py-2">
        <button
          aria-label={`Show ${label} tags`}
          className="icon-button"
          title={`Show ${label}`}
          type="button"
          onClick={onToggle}
        >
          {chevron}
        </button>
        <div className="mt-3 flex flex-1 items-center justify-center">
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-normal text-muted">
            {label}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 min-w-64 flex-col overflow-hidden bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line px-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Folder size={13} aria-hidden="true" />
          <span className="truncate text-[11px] font-semibold uppercase text-muted">{label}</span>
          <span className="text-[10px] text-muted">{count}</span>
        </div>
        <button
          aria-label={`Minimize ${label} tags`}
          className="icon-button h-7 w-7"
          title={`Minimize ${label}`}
          type="button"
          onClick={onToggle}
        >
          {chevron}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-2">
        {folder ? <TagSourceTree folders={[folder]} compact /> : <div className="px-3 text-xs text-muted">No matching tags.</div>}
      </div>
    </aside>
  );
}

function TagSourceTree({ compact = false, folders }: { compact?: boolean; folders: LibraryTagSourceFolder[] }) {
  return (
    <div className={compact ? "text-[11px]" : "text-xs"}>
      {folders.map((folder) => (
        <TagSourceFolderNode compact={compact} depth={0} folder={folder} key={folder.id} />
      ))}
    </div>
  );
}

function TagSourceFolderNode({
  compact,
  depth,
  folder,
}: {
  compact: boolean;
  depth: number;
  folder: LibraryTagSourceFolder;
}) {
  const tagCount = countTagSourceFolderTags(folder);

  return (
    <details className="group/tag-source-folder" open>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <div
          className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1 hover:bg-surface-raised"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <ChevronRight className="text-muted transition group-open/tag-source-folder:rotate-90" size={12} aria-hidden="true" />
          <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
            <Folder size={13} aria-hidden="true" />
            <span className="truncate">{folder.label}</span>
          </span>
          <span className="text-[10px] text-muted">{tagCount}</span>
        </div>
      </summary>
      {folder.files.map((file) => (
        <TagSourceFileNode compact={compact} depth={depth + 1} file={file} key={`${folder.id}:${file.id}`} />
      ))}
      {(folder.folders ?? []).map((childFolder) => (
        <TagSourceFolderNode compact={compact} depth={depth + 1} folder={childFolder} key={`${folder.id}:${childFolder.id}`} />
      ))}
    </details>
  );
}

function TagSourceFileNode({
  compact,
  depth,
  file,
}: {
  compact: boolean;
  depth: number;
  file: LibraryTagSourceFolder["files"][number];
}) {
  return (
    <details className="group/tag-source-file" open>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <div
          className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1 hover:bg-surface-raised"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <ChevronRight className="text-muted transition group-open/tag-source-file:rotate-90" size={12} aria-hidden="true" />
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-muted">
            <FileText size={12} aria-hidden="true" />
            <span className="truncate">{file.label}</span>
          </span>
          <span className="text-[10px] text-muted">{file.tags.length}</span>
        </div>
      </summary>
      {file.tags.map((tagDefinition) => (
        <TagSourceTagRow
          compact={compact}
          depth={depth + 1}
          key={tagDefinition.id}
          tagDefinition={tagDefinition}
        />
      ))}
    </details>
  );
}

function TagSourceTagRow({
  compact,
  depth,
  tagDefinition,
}: {
  compact: boolean;
  depth: number;
  tagDefinition: LibraryTagDefinition;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 px-2 py-0.5 leading-snug hover:bg-surface-raised"
      style={{ paddingLeft: `${22 + depth * 14}px` }}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getLibraryTagKindDotClass(tagDefinition.kind)}`} aria-hidden="true" />
      <span className={`truncate font-semibold text-ink ${compact ? "text-[11px]" : "text-xs"}`}>{tagDefinition.label}</span>
    </div>
  );
}

function filterTagSourceSections(sections: LibraryTagSourceSection[], normalizedQuery: string): LibraryTagSourceSection[] {
  if (!normalizedQuery) {
    return sections;
  }

  return sections.flatMap((section) => {
    const filteredSection = filterTagSourceFolder(section, normalizedQuery);
    return filteredSection ? [filteredSection] : [];
  });
}

function filterTagSourceFolder(folder: LibraryTagSourceFolder, normalizedQuery: string): LibraryTagSourceFolder | null {
  const folderMatches = normalizedTextIncludesTerm(normalizeLibraryMatchText(folder.label), normalizedQuery);
  const files = folder.files.flatMap((file) => {
      const fileMatches = normalizedTextIncludesTerm(normalizeLibraryMatchText(file.label), normalizedQuery);
      const matchingTags = fileMatches || folderMatches
        ? file.tags
        : file.tags.filter((tagDefinition) => tagLibraryDefinitionIncludesText(tagDefinition, normalizedQuery));

      return matchingTags.length > 0 ? [{ ...file, tags: matchingTags }] : [];
  });
  const folders = (folder.folders ?? []).flatMap((childFolder) => {
    const filteredFolder = folderMatches ? childFolder : filterTagSourceFolder(childFolder, normalizedQuery);
    return filteredFolder ? [filteredFolder] : [];
  });

  return files.length > 0 || folders.length > 0 ? { ...folder, files, folders } : null;
}

function countTagSourceSectionTags(sections: LibraryTagSourceSection[]) {
  return sections.reduce((total, section) => total + countTagSourceFolderTags(section), 0);
}

function countTagSourceFolderTags(folder: LibraryTagSourceFolder): number {
  return (
    folder.files.reduce((total, file) => total + file.tags.length, 0) +
    (folder.folders ?? []).reduce((total, childFolder) => total + countTagSourceFolderTags(childFolder), 0)
  );
}

function tagLibraryDefinitionIncludesText(tagDefinition: LibraryTagDefinition, normalizedQuery: string) {
  return normalizeLibraryMatchText([
    tagDefinition.id,
    tagDefinition.label,
    tagDefinition.kind,
    ...(tagDefinition.aliases ?? []),
    ...(tagDefinition.parents ?? []),
    ...(tagDefinition.implies ?? []),
    ...(tagDefinition.related ?? []),
    ...(tagDefinition.locksToFileTypes ?? []),
  ].join(" ")).includes(normalizedQuery);
}

function getLibraryTagKindDotClass(kind: LibraryTagDefinition["kind"]) {
  switch (kind) {
    case "system":
      return "bg-steel";
    case "style":
      return "bg-copper";
    case "workflow":
      return "bg-muted";
    case "content":
    default:
      return "bg-[rgb(var(--color-brand-blue))]";
  }
}

function StructureRow({
  activeView,
  depth,
  node,
  onSelectAsset,
  onSelectFolder,
  onSelectView,
  onToggleNode,
  onOpenContextMenu,
  selectedAssetId,
}: {
  activeView: LibraryView;
  depth: number;
  node: StructureNode;
  onSelectAsset: (assetId: number) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectView: (view: LibraryView) => void;
  onToggleNode: (nodeId: string) => void;
  onOpenContextMenu: (node: StructureNode, event: ReactMouseEvent<HTMLElement>) => void;
  selectedAssetId: number | null;
}) {
  const Icon = node.icon;
  const hasChildren = Boolean(node.children?.length);
  const style = { "--tree-depth": depth } as CSSProperties;
  const isAssetNode = typeof node.assetId === "number";
  const isActive = isAssetNode && selectedAssetId === node.assetId;
  const isLibraryRoot = node.id === "library" || node.id === "inventory-files";

  function handleSelect() {
    if (typeof node.assetId === "number") {
      onSelectAsset(node.assetId);
    } else if (node.folderId) {
      onSelectFolder(node.folderId);
    } else if (node.view) {
      onSelectView(node.view);
    } else if (hasChildren) {
      onToggleNode(node.id);
    }
  }

  return (
    <div>
      <div
        className={`tree-row ${isLibraryRoot ? "tree-row-library-root" : ""} ${isAssetNode ? "tree-row-file" : ""} ${isActive ? "tree-row-active" : ""}`}
        style={style}
        onContextMenu={(event) => {
          onOpenContextMenu(node, event);
        }}
      >
        {hasChildren ? (
          <button
            aria-label={`${node.open ? "Collapse" : "Expand"} ${node.label}`}
            aria-expanded={node.open}
            className="tree-toggle-button"
            type="button"
            onClick={() => onToggleNode(node.id)}
          >
            {node.open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <button
          aria-expanded={hasChildren ? node.open : undefined}
          className="tree-row-main"
          type="button"
          onClick={handleSelect}
        >
          {Icon ? <Icon className={isActive ? "text-white" : "text-muted"} size={15} aria-hidden="true" /> : null}
          <span className="truncate">{node.label}</span>
        </button>
        {!isAssetNode && node.meta ? <span className="tree-meta">{node.meta}</span> : null}
      </div>

      {node.open &&
        node.children?.map((child) => (
          <StructureRow
            activeView={activeView}
            depth={depth + 1}
            key={child.id}
            node={child}
            onSelectAsset={onSelectAsset}
            onSelectFolder={onSelectFolder}
            onSelectView={onSelectView}
            onToggleNode={onToggleNode}
            onOpenContextMenu={onOpenContextMenu}
            selectedAssetId={selectedAssetId}
          />
        ))}
    </div>
  );
}

function MainWorkspace({
  activeInventory,
  activeView,
  activeFolderName,
  assetShelfHeight,
  assetShelfCollapsed,
  assetSearchQuery,
  assetSortDirection,
  assetSortKey,
  assets,
  canOpenFolder,
  detailsColumnWidths,
  isScanning,
  modelTransformOverride,
  onAssetShelfResizeStart,
  onAssetSearchQueryChange,
  onAssetSortDirectionChange,
  onAssetSortKeyChange,
  onAssetViewModeChange,
  onDetailsColumnWidthChange,
  onModelInspectorResult,
  nvdDocument,
  nvvDocument,
  nvdStyleDraft,
  nvdSaveReminderVisible,
  onCreateNvdDocument,
  onCreateNvvDocument,
  onCloseNvdDocument,
  onCloseNvvDocument,
  onNvdDocumentActivate,
  onNvdDocumentChange,
  onNvvDocumentChange,
  onNvdEditorControllerChange,
  onNvdStyleDraftChange,
  onDismissNvdSaveReminder,
  onNvdTextSelectionChange,
  onOpenAssetContextMenu,
  onOpenFolder,
  onPlayAudio,
  onResetAssetShelfHeight,
  onSceneModeChange,
  onToggleAssetShelfCollapsed,
  onSelectAsset,
  onSelectNativeHub,
  previewBackground,
  sceneMode,
  selectedAsset,
  sourceSummary,
  sourceFolderCount,
  statusMessage,
  totalAssetCount,
  viewMode,
}: {
  activeInventory: ActiveInventory | null;
  activeView: LibraryView;
  activeFolderName: string | null;
  assetShelfHeight: number | null;
  assetShelfCollapsed: boolean;
  assetSearchQuery: string;
  assetSortDirection: SortDirection;
  assetSortKey: AssetSortKey;
  assets: Asset[];
  canOpenFolder: boolean;
  detailsColumnWidths: DetailsColumnWidths;
  isScanning: boolean;
  modelTransformOverride?: ModelTransform;
  onAssetShelfResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onAssetSearchQueryChange: (query: string) => void;
  onAssetSortDirectionChange: (direction: SortDirection) => void;
  onAssetSortKeyChange: (sortKey: AssetSortKey) => void;
  onAssetViewModeChange: (mode: AssetViewMode) => void;
  onDetailsColumnWidthChange: (columnKey: DetailsColumnKey, width: number) => void;
  onModelInspectorResult: (asset: Asset, result: ModelInspectorResult) => void;
  nvdDocument: OpenedNvdDocument | null;
  nvvDocument: OpenedNvvDocument | null;
  nvdStyleDraft: NvdStyleDefinition | null;
  nvdSaveReminderVisible: boolean;
  onCreateNvdDocument: () => void;
  onCreateNvvDocument: () => void;
  onCloseNvdDocument: () => void;
  onCloseNvvDocument: () => void;
  onNvdDocumentActivate: () => void;
  onNvdDocumentChange: (document: NvdDocument) => void;
  onNvvDocumentChange: (document: NvvDocument) => void;
  onNvdEditorControllerChange: (controller: NvdEditorController | null) => void;
  onNvdStyleDraftChange: (style: NvdStyleDefinition) => void;
  onDismissNvdSaveReminder: () => void;
  onNvdTextSelectionChange: (selection: NvdTextSelection | null) => void;
  onOpenAssetContextMenu: (asset: Asset, event: ReactMouseEvent<HTMLElement>) => void;
  onOpenFolder: () => void;
  onPlayAudio: (asset: Asset) => void;
  onResetAssetShelfHeight: () => void;
  onSceneModeChange: (mode: SceneMode) => void;
  onToggleAssetShelfCollapsed: () => void;
  onSelectAsset: (id: number) => void;
  onSelectNativeHub: (view: "inventory-files" | "inventory-documents" | "inventory-vectors") => void;
  previewBackground: string;
  sceneMode: SceneMode;
  selectedAsset: Asset | null;
  sourceSummary: string | null;
  sourceFolderCount: number;
  statusMessage: string;
  totalAssetCount: number;
  viewMode: AssetViewMode;
}) {
  return (
    <section className="workspace-panel flex min-w-0 flex-col overflow-hidden bg-canvas">
      <PreviewStage
        asset={selectedAsset}
        canOpenFolder={canOpenFolder}
        isScanning={isScanning}
        modelTransformOverride={modelTransformOverride}
        onModelInspectorResult={onModelInspectorResult}
        nvdDocument={nvdDocument}
        nvvDocument={nvvDocument}
        nvdStyleDraft={nvdStyleDraft}
        onDismissNvdSaveReminder={onDismissNvdSaveReminder}
        onCreateNvdDocument={onCreateNvdDocument}
        onCreateNvvDocument={onCreateNvvDocument}
        onCloseNvdDocument={onCloseNvdDocument}
        onCloseNvvDocument={onCloseNvvDocument}
        onNvdDocumentActivate={onNvdDocumentActivate}
        onNvdDocumentChange={onNvdDocumentChange}
        onNvdEditorControllerChange={onNvdEditorControllerChange}
        onNvdStyleDraftChange={onNvdStyleDraftChange}
        onNvdTextSelectionChange={onNvdTextSelectionChange}
        onNvvDocumentChange={onNvvDocumentChange}
        onOpenFolder={onOpenFolder}
        onSceneModeChange={onSceneModeChange}
        onSelectAsset={onSelectAsset}
        onSelectNativeHub={onSelectNativeHub}
        projectDocument={
          activeInventory && sourceFolderCount === 0
            ? {
                inventoryName: activeInventory.name,
                manifestFileName: activeInventory.manifestFileName,
                rootPath: activeInventory.rootPath,
              }
            : null
        }
        previewBackground={previewBackground}
        sceneMode={sceneMode}
        showNvdDocumentPrompt={Boolean(activeInventory) && activeView === "inventory-documents"}
        nativeHub={
          activeInventory && sceneMode === "preview" && isNativeHubView(activeView)
            ? { inventoryName: activeInventory.name, view: activeView }
            : null
        }
        nativeHubAssets={assets}
        showNvdSaveReminder={nvdSaveReminderVisible}
        sourcePath={sourceSummary}
      />
      {!isNativeHubView(activeView) ? <AssetShelf
        activeView={activeView}
        activeFolderName={activeFolderName}
        assetSortDirection={assetSortDirection}
        assetSortKey={assetSortKey}
        assets={assets}
        assetSearchQuery={assetSearchQuery}
        canOpenFolder={canOpenFolder}
        detailsColumnWidths={detailsColumnWidths}
        collapsed={assetShelfCollapsed}
        isScanning={isScanning}
        nvdDocument={nvdDocument}
        onAssetSearchQueryChange={onAssetSearchQueryChange}
        onAssetSortDirectionChange={onAssetSortDirectionChange}
        onAssetSortKeyChange={onAssetSortKeyChange}
        onAssetViewModeChange={onAssetViewModeChange}
        onDetailsColumnWidthChange={onDetailsColumnWidthChange}
        onCreateNvdDocument={onCreateNvdDocument}
        onOpenAssetContextMenu={onOpenAssetContextMenu}
        onOpenFolder={onOpenFolder}
        onPlayAudio={onPlayAudio}
        onSelectAsset={onSelectAsset}
        selectedAsset={selectedAsset}
        statusMessage={statusMessage}
        totalAssetCount={totalAssetCount}
        height={assetShelfHeight}
        onResizeStart={onAssetShelfResizeStart}
        onResetHeight={onResetAssetShelfHeight}
        onToggleCollapsed={onToggleAssetShelfCollapsed}
        viewMode={viewMode}
      /> : null}
    </section>
  );
}

function getAssetDirectoryPath(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function getAssetModelKey(asset: Asset) {
  return `${asset.id}:${asset.path}`;
}

function getScannedAssetModelKey(asset: ScannedAsset) {
  return `${asset.id}:${asset.path}`;
}


function buildStructure(
  activeView: LibraryView,
  assets: Asset[],
  virtualFolders: VirtualFolder[],
  selectedFolderId: string | null,
  selectedAssetId: number | null,
  openNodeIds: Set<string>,
  inventoryDocumentPaths: Set<string>,
): StructureNode[] {
  const inventoryDocumentAssets = sortAssets(
    assets.filter((asset) => inventoryDocumentPaths.has(normalizePath(asset.path))),
    "name",
    "asc",
  );
  const inventoryWriteAssets = inventoryDocumentAssets.filter((asset) => asset.extension.toLowerCase() === "nvd");
  const inventoryDrawAssets = inventoryDocumentAssets.filter((asset) => asset.extension.toLowerCase() === "nvv");
  const masterLibraryAssets = assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path)));
  const sortedFolders = sortVirtualFoldersByName(virtualFolders);
  const assignedAssetIds = getAssignedAssetIds(sortedFolders, masterLibraryAssets);
  const rootAssetNodes = sortAssets(
    masterLibraryAssets.filter((asset) => !assignedAssetIds.has(asset.id)),
    "name",
    "asc",
  ).map(assetToStructureNode);
  const inventoryWriteNodes = inventoryWriteAssets.map(assetToStructureNode);
  const inventoryDrawNodes = inventoryDrawAssets.map(assetToStructureNode);
  const nodes: StructureNode[] = [
    {
      id: "library",
      label: "Master Library",
      icon: Backpack,
      canAddChild: true,
      view: "all",
      meta: String(masterLibraryAssets.length),
      open: openNodeIds.has("library"),
      children: [
        ...sortedFolders.map((folder) => virtualFolderToNode(folder, masterLibraryAssets, openNodeIds)),
        ...rootAssetNodes,
      ],
    },
    {
      id: "inventory-files",
      label: "Inventory",
      icon: FolderOpen,
      view: "inventory-files",
      meta: String(inventoryDocumentAssets.length),
      open: openNodeIds.has("inventory-files"),
      children: [
        {
          id: "inventory-documents",
          label: "Write",
          icon: inventoryWriteNodes.length > 0 ? FolderOpen : Folder,
          view: "inventory-documents",
          meta: String(inventoryWriteNodes.length),
          open: openNodeIds.has("inventory-documents"),
          children: inventoryWriteNodes,
        },
        {
          id: "inventory-vectors",
          label: "Draw",
          icon: inventoryDrawNodes.length > 0 ? FolderOpen : Folder,
          view: "inventory-vectors",
          meta: String(inventoryDrawNodes.length),
          open: openNodeIds.has("inventory-vectors"),
          children: inventoryDrawNodes,
        },
      ],
    },
  ];

  return nodes.map((node) => markActive(node, activeView, selectedFolderId, selectedAssetId));
}

function markActive(node: StructureNode, activeView: LibraryView, selectedFolderId: string | null, selectedAssetId: number | null): StructureNode {
  const children = node.children?.map((child) => markActive(child, activeView, selectedFolderId, selectedAssetId));
  const active = typeof node.assetId === "number" ? node.assetId === selectedAssetId : node.folderId ? node.folderId === selectedFolderId : !selectedFolderId && node.view === activeView;

  return {
    ...node,
    active,
    children,
    descendantActive: children?.some((child) => child.active || child.descendantActive),
  };
}

function filterAssets(
  activeView: LibraryView,
  assets: Asset[],
  selectedFolderId: string | null,
  virtualFolders: VirtualFolder[],
  inventoryDocumentPaths: Set<string>,
) {
  const inventoryFileAssets = assets.filter((asset) => inventoryDocumentPaths.has(normalizePath(asset.path)));
  const masterLibraryAssets = assets.filter((asset) => !inventoryDocumentPaths.has(normalizePath(asset.path)));

  if (selectedFolderId) {
    return getDirectAssetsForLibraryNodePath(virtualFolders, selectedFolderId, masterLibraryAssets);
  }

  switch (activeView) {
    case "inventory-files":
      return inventoryFileAssets;
    case "inventory-documents":
      return inventoryFileAssets.filter((asset) => asset.extension.toLowerCase() === "nvd");
    case "inventory-vectors":
      return inventoryFileAssets.filter((asset) => asset.extension.toLowerCase() === "nvv");
    case "inbox": {
      const assignedIds = getAssignedAssetIds(virtualFolders, masterLibraryAssets);
      return masterLibraryAssets.filter((asset) => !assignedIds.has(asset.id));
    }
    case "all":
    default:
      return masterLibraryAssets;
  }
}

function filterAssetsByEnabledSources(assets: Asset[], sourceFolders: SourceFolder[], inventoryDocumentPaths: Set<string>) {
  if (sourceFolders.length === 0) {
    return assets;
  }

  const enabledAssetIds = new Set(sourceFolders.filter((folder) => folder.enabled).flatMap((folder) => folder.assetIds));
  return assets.filter((asset) => enabledAssetIds.has(asset.id) || inventoryDocumentPaths.has(normalizePath(asset.path)));
}

function filterAssetsBySearchQuery(assets: Asset[], query: string) {
  const normalizedQuery = normalizeLibraryMatchText(query);

  if (!normalizedQuery) {
    return assets;
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);

  return assets.filter((asset) => {
    const searchText = getNormalizedAssetSearchText(asset);
    return terms.every((term) => normalizedTextIncludesTerm(searchText, term));
  });
}

function sortAssets(assets: Asset[], sortKey: AssetSortKey, direction: SortDirection) {
  const sortedAssets = [...assets].sort((first, second) => {
    let result = 0;

    switch (sortKey) {
      case "type":
        result = compareText(`${first.type} ${first.extension} ${first.name}`, `${second.type} ${second.extension} ${second.name}`);
        break;
      case "modified":
        if (first.modifiedUnix === null && second.modifiedUnix !== null) {
          return 1;
        }
        if (first.modifiedUnix !== null && second.modifiedUnix === null) {
          return -1;
        }
        result = compareNullableNumbers(first.modifiedUnix, second.modifiedUnix);
        break;
      case "size":
        result = first.sizeBytes - second.sizeBytes;
        break;
      case "name":
      default:
        result = compareText(first.name, second.name);
        break;
    }

    if (result === 0) {
      result = compareText(first.name, second.name);
    }

    return direction === "asc" ? result : -result;
  });

  return sortedAssets;
}

function mergeScannedAssets(existingAssets: ScannedAsset[], newAssets: ScannedAsset[]) {
  const assetsByPath = new Map<string, ScannedAsset>();

  for (const asset of existingAssets) {
    assetsByPath.set(normalizePath(asset.path), asset);
  }

  for (const asset of newAssets) {
    const pathKey = normalizePath(asset.path);
    const existingAsset = assetsByPath.get(pathKey);

    assetsByPath.set(pathKey, {
      ...asset,
      name: existingAsset?.name ?? asset.name,
      kept_tags: existingAsset?.kept_tags ?? asset.kept_tags ?? [],
      notes: existingAsset?.notes ?? asset.notes ?? "",
      tags: existingAsset?.tags ?? asset.tags ?? [],
    });
  }

  return [...assetsByPath.values()];
}

function getSourceSummary(sourceFolders: SourceFolder[]) {
  if (sourceFolders.length === 0) {
    return null;
  }

  const enabledFolders = sourceFolders.filter((folder) => folder.enabled);

  if (enabledFolders.length === 0) {
    return "All source folders closed";
  }

  if (enabledFolders.length === 1) {
    return enabledFolders[0].path;
  }

  return `${enabledFolders.length} source folders loaded`;
}

function getSourceFolderId(path: string) {
  return `source-${normalizePath(path).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}`;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function compareText(first: string, second: string) {
  return first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" });
}

function compareNullableNumbers(first: number | null, second: number | null) {
  if (first === null && second === null) {
    return 0;
  }

  if (first === null) {
    return 1;
  }

  if (second === null) {
    return -1;
  }

  return first - second;
}

function virtualFolderToNode(folder: VirtualFolder, assets: Asset[], openNodeIds: Set<string>): StructureNode {
  const scopedAssets = getAssetsForLibraryNode(folder, assets);
  const matchingAssets = sortAssets(getDirectAssetsForLibraryNode(folder, assets), "name", "asc");
  const sortedChildren = sortVirtualFoldersByName(folder.children);
  const childAssetScopes = getChildAssetScopes(sortedChildren, scopedAssets);
  const childFolderNodes = sortedChildren.map((child) => virtualFolderToNode(child, childAssetScopes.get(child.id) ?? [], openNodeIds));
  const assetNodes = matchingAssets.map(assetToStructureNode);

  return {
    id: folder.id,
    label: folder.name,
    icon: childFolderNodes.length > 0 || assetNodes.length > 0 ? FolderOpen : Folder,
    canAddChild: true,
    folderId: folder.id,
    meta: String(countFolderAssets(folder, assets)),
    open: openNodeIds.has(folder.id),
    children: [...childFolderNodes, ...assetNodes],
  };
}

function sortVirtualFoldersByName(folders: VirtualFolder[]) {
  return [...folders].sort((first, second) => compareText(first.name, second.name));
}

function assetToStructureNode(asset: Asset): StructureNode {
  return {
    id: `asset-${asset.id}`,
    label: asset.name,
    assetId: asset.id,
    icon: typeIcons[asset.type],
  };
}

function createVirtualFolderFromTemplate(template: LibraryNodeTemplate, name: string): VirtualFolder {
  return createVirtualFolderFromDraft(createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name), template.fileTypes));
}

function createDefaultTopLevelLibraryNodesForAssets(assets: ScannedAsset[]) {
  const assetTypes = new Set(assets.map((asset) => asset.file_type));

  return (Object.entries(defaultTopLevelLibraryNodeTemplateIds) as Array<[AssetType, string]>)
    .filter(([assetType]) => assetTypes.has(assetType))
    .map(([, templateId]) => libraryNodeTemplates.find((template) => template.id === templateId))
    .filter((template): template is LibraryNodeTemplate => Boolean(template))
    .map((template) => createVirtualFolderFromTemplate(template, template.name));
}

function createVirtualFolderFromDraft(draft: AddLibraryNodeDraft): VirtualFolder {
  return {
    id: createVirtualFolderId(draft.name),
    name: draft.name,
    assetIds: [],
    children: [],
    diskPath: null,
    isPlannedOnDisk: false,
    pathSegment: toSlug(draft.name) || "node",
    rules: draft.rules,
    suggestedTags: [...draft.tags],
    tags: [...draft.tags],
    templateId: draft.templateId,
  };
}

function createLibraryNodeDraft(
  template: LibraryNodeTemplate,
  name: string,
  tags: string[],
  fileTypes: LibraryNodeFileType[],
): AddLibraryNodeDraft {
  const normalizedFileTypes = normalizeLibraryNodeFileTypes(fileTypes);
  const normalizedTags = normalizeLibraryNodeTagValues(tags);

  return {
    fileTypes: normalizedFileTypes,
    name,
    rules: createLibraryNodeRulesFromTemplate(template, name, normalizedTags, normalizedFileTypes),
    tags: normalizedTags,
    templateId: template.id === "custom" ? null : template.id,
  };
}

function getAssetsForLibraryNode(folder: VirtualFolder, assets: Asset[]) {
  return assets.filter((asset) => libraryNodeIncludesAsset(folder, asset));
}

function getChildAssetScopes(children: VirtualFolder[], scopedAssets: Asset[]) {
  const childAssetScopes = new Map<string, Asset[]>(children.map((child) => [child.id, []]));

  for (const asset of scopedAssets) {
    const bestChild = getBestLibraryNodeChildForAsset(children, asset);

    if (!bestChild) {
      continue;
    }

    childAssetScopes.get(bestChild.id)?.push(asset);
  }

  return childAssetScopes;
}

function getBestLibraryNodeChildForAsset(children: VirtualFolder[], asset: Asset) {
  let bestChild: VirtualFolder | null = null;
  let bestScore = 0;

  for (const child of children) {
    if (!libraryNodeIncludesAsset(child, asset)) {
      continue;
    }

    const score = getLibraryNodeChildAssignmentScore(child, asset);

    if (score > bestScore || (score === bestScore && bestChild && compareText(child.name, bestChild.name) < 0)) {
      bestChild = child;
      bestScore = score;
    }
  }

  return bestChild;
}

function getLibraryNodeChildAssignmentScore(folder: VirtualFolder, asset: Asset) {
  if (folder.assetIds.includes(asset.id)) {
    return 10000;
  }

  const scoredSuggestion = scoreAssetPlacementSuggestion(folder, asset, [folder]);
  return scoredSuggestion?.score ?? 0;
}

function getDirectAssetsForLibraryNode(folder: VirtualFolder, assets: Asset[]) {
  if (folder.children.length === 0) {
    return getAssetsForLibraryNode(folder, assets);
  }

  const descendantAssetIds = getDescendantLibraryNodeAssetIds(folder, assets);

  return assets.filter((asset) => libraryNodeIncludesAsset(folder, asset) && !descendantAssetIds.has(asset.id));
}

function getDirectAssetsForLibraryNodePath(folders: VirtualFolder[], folderId: string, assets: Asset[]) {
  const path = findFolderNodePath(folders, folderId);

  if (!path) {
    return [];
  }

  let scopedAssets = assets;

  for (const [index, folder] of path.entries()) {
    const folderAssets = getAssetsForLibraryNode(folder, scopedAssets);

    if (index === path.length - 1) {
      return getDirectAssetsForLibraryNode(folder, scopedAssets);
    }

    const nextFolder = path[index + 1];
    scopedAssets = getChildAssetScopes(folder.children, folderAssets).get(nextFolder.id) ?? [];
  }

  return [];
}

function getDescendantLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[]) {
  const ids = new Set<number>();

  for (const child of folder.children) {
    for (const assetId of getLibraryNodeAssetIds(child, assets, true)) {
      ids.add(assetId);
    }
  }

  return ids;
}

function getAssetPlacementSuggestions(asset: Asset, folders: VirtualFolder[], assets: Asset[]) {
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const folder of folders) {
    const folderAssets = getAssetsForLibraryNode(folder, assets);

    if (!folderAssets.some((candidate) => candidate.id === asset.id)) {
      continue;
    }

    const childAssetScopes = getChildAssetScopes(folder.children, folderAssets);
    const childFoldersWithAsset = folder.children.filter((child) => childAssetScopes.get(child.id)?.some((candidate) => candidate.id === asset.id));

    if (childFoldersWithAsset.length > 0) {
      continue;
    }

    suggestions.push(...getExistingChildPlacementSuggestions(folder, asset, folderAssets, [folder]));
    suggestions.push(...getNewChildPlacementSuggestions(folder, asset, [folder]));
  }

  return dedupeAssetPlacementSuggestions(suggestions)
    .sort((first, second) => second.score - first.score || second.path.length - first.path.length || compareText(first.path.join(" "), second.path.join(" ")))
    .slice(0, 8);
}

function getExistingChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, scopedAssets: Asset[], parentPath: VirtualFolder[]) {
  return parentFolder.children
    .filter((child) => !getAssetsForLibraryNode(child, scopedAssets).some((candidate) => candidate.id === asset.id) && libraryNodeFileRulesAllowAsset(child, asset))
    .map((child) => scoreAssetPlacementSuggestion(child, asset, [...parentPath, child]))
    .filter((suggestion): suggestion is AssetPlacementSuggestion => Boolean(suggestion && suggestion.score >= 24));
}

function getNewChildPlacementSuggestions(parentFolder: VirtualFolder, asset: Asset, parentPath: VirtualFolder[]) {
  const parentTemplate = getLibraryNodeTemplateForSuggestionParent(parentFolder, libraryNodeTemplates);
  const parentFileTypes = getInheritedSuggestionFileTypes(parentTemplate);
  const existingChildNames = new Set(parentFolder.children.map((child) => normalizeLibraryMatchText(child.name)));
  const candidateTemplates = getLibraryNodeChildSuggestionTemplates(parentTemplate);
  const suggestions: AssetPlacementSuggestion[] = [];

  for (const template of candidateTemplates) {
    const name = template.name;
    const normalizedName = normalizeLibraryMatchText(name);

    if (!normalizedName || existingChildNames.has(normalizedName)) {
      continue;
    }

    const fileTypes = scopeLibraryNodeFileTypes(parentFileTypes, template.fileTypes);

    if (!libraryNodeFileTypeListAllowsAsset(fileTypes, asset)) {
      continue;
    }

    const draft = createLibraryNodeDraft(template, name, getLibraryNodeTagsFromTemplate(template, name), fileTypes);
    const scoredSuggestion = scoreDraftPlacementSuggestion(draft, template, asset, [...parentPath.map((folder) => folder.name), name], parentFolder.id);

    if (scoredSuggestion && scoredSuggestion.score >= 30) {
      suggestions.push(scoredSuggestion);
    }
  }

  if (suggestions.length === 0) {
    const fallbackSuggestion = getFallbackNewChildPlacementSuggestion(parentFolder, parentFileTypes, existingChildNames, asset, parentPath);

    if (fallbackSuggestion) {
      suggestions.push(fallbackSuggestion);
    }
  }

  return suggestions;
}

function getFallbackNewChildPlacementSuggestion(
  parentFolder: VirtualFolder,
  parentFileTypes: LibraryNodeFileType[],
  existingChildNames: Set<string>,
  asset: Asset,
  parentPath: VirtualFolder[],
) {
  const nameTerms = getAssetPlacementNameTerms(asset);

  if (nameTerms.length === 0) {
    return null;
  }

  const name = nameTerms.map(toTitleCase).join(" ");
  const normalizedName = normalizeLibraryMatchText(name);

  if (!normalizedName || existingChildNames.has(normalizedName)) {
    return null;
  }

  const draft = createLibraryNodeDraft(customLibraryNodeTemplate, name, nameTerms, parentFileTypes);
  return scoreDraftPlacementSuggestion(draft, customLibraryNodeTemplate, asset, [...parentPath.map((folder) => folder.name), name], parentFolder.id);
}

function getLibraryNodeChildSuggestionTemplates(parentTemplate: LibraryNodeTemplate) {
  const templates: LibraryNodeTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  function addTemplate(template: LibraryNodeTemplate | undefined) {
    if (!template || template.id === "all-assets" || template.id === parentTemplate.id || seenTemplateIds.has(template.id)) {
      return;
    }

    seenTemplateIds.add(template.id);
    templates.push(template);
  }

  for (const childName of parentTemplate.childSuggestions) {
    addTemplate(findLibraryNodeTemplateByName(libraryNodeTemplates, childName));
  }

  for (const template of libraryNodeTemplates) {
    if (libraryNodeFileTypesOverlap(parentTemplate.fileTypes, template.fileTypes)) {
      addTemplate(template);
    }
  }

  return templates;
}

function getAssetPlacementNameTerms(asset: Asset) {
  const normalizedExtension = normalizeLibraryMatchText(asset.extension);
  const terms: string[] = [];
  const seenTerms = new Set<string>();

  for (const part of normalizeLibraryMatchText(asset.name).split(" ")) {
    const term = canonicalizeLibraryTag(part);

    if (
      !term ||
      term === normalizedExtension ||
      term.length <= 2 ||
      /^\d+$/.test(term) ||
      assetPlacementNameNoiseTerms.has(term) ||
      isIgnoredLibraryMatchTerm(term) ||
      seenTerms.has(term)
    ) {
      continue;
    }

    seenTerms.add(term);
    terms.push(term);

    if (terms.length >= 3) {
      break;
    }
  }

  return terms;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function libraryNodeFileTypeListAllowsAsset(fileTypes: LibraryNodeFileType[], asset: Asset) {
  const normalizedFileTypes = normalizeLibraryNodeFileTypes(fileTypes);

  return normalizedFileTypes.includes("Any") || normalizedFileTypes.some((fileType) => fileType === asset.type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

function dedupeAssetPlacementSuggestions(suggestions: AssetPlacementSuggestion[]) {
  const seenSuggestions = new Set<string>();
  const dedupedSuggestions: AssetPlacementSuggestion[] = [];

  for (const suggestion of suggestions) {
    const finalPathLabel = suggestion.path[suggestion.path.length - 1] ?? "";
    const key = suggestion.target === "existing" ? `existing:${suggestion.folderId}` : `new:${suggestion.parentFolderId}:${normalizeLibraryMatchText(finalPathLabel)}`;

    if (seenSuggestions.has(key)) {
      continue;
    }

    seenSuggestions.add(key);
    dedupedSuggestions.push(suggestion);
  }

  return dedupedSuggestions;
}

function libraryNodeFileRulesAllowAsset(folder: VirtualFolder, asset: Asset) {
  const fileRules = getLibraryNodeRules(folder).filter((rule) => rule.field === "type" || rule.field === "extension");

  if (fileRules.length > 0) {
    return fileRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));
  }

  return libraryNodeFileTypeMatches(getLibraryNodeTemplateForFolder(folder), asset);
}

function scoreAssetPlacementSuggestion(folder: VirtualFolder, asset: Asset, path: VirtualFolder[]): AssetPlacementSuggestion | null {
  const scoredTerms = scoreAssetPlacementTerms(asset, getLibraryNodeSuggestionTerms(folder), path.length);

  if (!scoredTerms) {
    return null;
  }

  const pathLabels = path.map((folderNode) => folderNode.name);

  return {
    folderId: folder.id,
    matchedTerms: scoredTerms.matchedTerms,
    path: pathLabels,
    reason: `Suggested from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name or tags.`,
    score: scoredTerms.score,
    target: "existing",
  };
}

function scoreDraftPlacementSuggestion(
  draft: AddLibraryNodeDraft,
  template: LibraryNodeTemplate,
  asset: Asset,
  path: string[],
  parentFolderId: string | null,
): AssetPlacementSuggestion | null {
  const scoredTerms = scoreAssetPlacementTerms(asset, getLibraryNodeDraftSuggestionTerms(draft, template), path.length);

  if (!scoredTerms) {
    return null;
  }

  return {
    draft,
    matchedTerms: scoredTerms.matchedTerms,
    parentFolderId,
    path,
    reason: `Create this child from ${formatMatchedTerms(scoredTerms.matchedTerms)} in the file name or tags.`,
    score: scoredTerms.score + 6,
    target: "new",
  };
}

function scoreAssetPlacementTerms(asset: Asset, terms: Array<[string, number]>, pathDepth: number) {
  const assetText = normalizeLibraryMatchText([
    asset.name,
    asset.extension,
    asset.type,
    ...asset.tags,
  ].join(" "));
  const matchedTerms: string[] = [];
  let score = pathDepth * 4;

  for (const [term, weight] of terms) {
    if (normalizedTextIncludesTerm(assetText, term)) {
      matchedTerms.push(term);
      score += weight;
    }
  }

  if (matchedTerms.length === 0) {
    return null;
  }

  return {
    matchedTerms: [...new Set(matchedTerms)].slice(0, 8),
    score,
  };
}

function getLibraryNodeSuggestionTerms(folder: VirtualFolder) {
  const template = getLibraryNodeTemplateForFolder(folder);
  const weightedTerms = new Map<string, number>();
  const folderTags = template.id !== "custom" ? getEffectiveLibraryNodeTags(template, folder) : normalizeLibraryNodeTagValues([...(folder.tags ?? []), ...(folder.suggestedTags ?? [])]);

  function add(value: string, weight: number) {
    for (const term of getLibrarySuggestionTermParts(value)) {
      weightedTerms.set(term, Math.max(weightedTerms.get(term) ?? 0, weight));
    }
  }

  add(folder.name, 36);

  for (const tag of folderTags) {
    add(tag, 28);
  }

  for (const rule of getLibraryNodeRules(folder)) {
    if (rule.field === "type" || rule.field === "extension") {
      continue;
    }

    add(rule.value, rule.field === "name" || rule.field === "tag" ? 34 : 16);
  }

  if (template.id !== "custom") {
    add(template.name, 28);

    for (const alias of template.aliases) {
      add(alias, 22);
    }

    for (const tag of template.suggestedTags) {
      add(tag, 22);
    }

    for (const rule of template.matchRules) {
      if (rule.field === "type" || rule.field === "extension") {
        continue;
      }

      for (const term of rule.terms) {
        add(term, rule.field === "name" || rule.field === "tag" ? 34 : 16);
      }
    }
  }

  return [...weightedTerms.entries()].sort((first, second) => second[1] - first[1] || compareText(first[0], second[0]));
}

function getLibraryNodeDraftSuggestionTerms(draft: AddLibraryNodeDraft, template: LibraryNodeTemplate) {
  const weightedTerms = new Map<string, number>();

  function add(value: string, weight: number) {
    for (const term of getLibrarySuggestionTermParts(value)) {
      weightedTerms.set(term, Math.max(weightedTerms.get(term) ?? 0, weight));
    }
  }

  add(draft.name, 36);

  for (const tag of draft.tags) {
    add(tag, 28);
  }

  for (const rule of draft.rules) {
    if (rule.field === "type" || rule.field === "extension") {
      continue;
    }

    add(rule.value, rule.field === "name" || rule.field === "tag" ? 34 : 16);
  }

  if (template.id !== "custom") {
    add(template.name, 28);

    for (const alias of template.aliases) {
      add(alias, 22);
    }

    for (const tag of template.suggestedTags) {
      add(tag, 22);
    }

    for (const rule of template.matchRules) {
      if (rule.field === "type" || rule.field === "extension") {
        continue;
      }

      for (const term of rule.terms) {
        add(term, rule.field === "name" || rule.field === "tag" ? 34 : 16);
      }
    }
  }

  return [...weightedTerms.entries()].sort((first, second) => second[1] - first[1] || compareText(first[0], second[0]));
}

function getLibrarySuggestionTermParts(value: string) {
  const terms = new Set<string>();
  const normalized = canonicalizeLibraryTag(normalizeLibraryMatchText(value));

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return [];
  }

  terms.add(normalized);

  for (const part of normalized.split(" ")) {
    const canonicalPart = canonicalizeLibraryTag(part);

    if (canonicalPart.length > 2 && !isIgnoredLibraryMatchTerm(canonicalPart)) {
      terms.add(canonicalPart);
    }
  }

  return [...terms];
}

function formatMatchedTerms(terms: string[]) {
  if (terms.length === 0) {
    return "matching clues";
  }

  if (terms.length === 1) {
    return terms[0];
  }

  return `${terms.slice(0, 3).join(", ")}${terms.length > 3 ? ", ..." : ""}`;
}

function libraryNodeIncludesAsset(folder: VirtualFolder, asset: Asset) {
  return folder.assetIds.includes(asset.id) || libraryNodeRulesMatchAsset(folder, asset);
}

function libraryNodeRulesMatchAsset(folder: VirtualFolder, asset: Asset) {
  const rules = getLibraryNodeRules(folder);

  if (rules.length > 0) {
    const fileRules = rules.filter((rule) => rule.field === "type" || rule.field === "extension");
    const contentRules = rules.filter((rule) => rule.field !== "type" && rule.field !== "extension");
    const fileRulesMatch = fileRules.length === 0 || fileRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));
    const contentRulesMatch = contentRules.length === 0 || contentRules.some((rule) => libraryNodeRuleMatchesAsset(rule, asset));

    return fileRulesMatch && contentRulesMatch;
  }

  const template = getLibraryNodeTemplateForFolder(folder);

  if (!libraryNodeFileTypeMatches(template, asset)) {
    return false;
  }

  const assetSearchText = getNormalizedAssetSearchText(asset);
  return getLibraryNodeImpliedMatchTerms(template, folder).some((term) => normalizedTextIncludesTerm(assetSearchText, term));
}

function libraryNodeFileTypeMatches(template: LibraryNodeTemplate, asset: Asset) {
  if (template.fileTypes.includes("Any")) {
    return true;
  }

  return template.fileTypes.some((fileType) => fileType === asset.type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

function libraryNodeRuleMatchesAsset(rule: LibraryNodeRule, asset: Asset) {
  const value = normalizeLibraryMatchText(rule.value);

  if (!value) {
    return false;
  }

  switch (rule.field) {
    case "extension":
      return compareLibraryRuleValue(asset.extension, rule.operator, value);
    case "type":
      return compareLibraryRuleValue(asset.type, rule.operator, value);
    case "tag":
      return asset.tags.some((tag) => compareLibraryRuleValue(tag, rule.operator, value));
    case "name":
      return compareLibraryRuleValue(asset.name, rule.operator, value);
    case "path":
      return compareLibraryRuleValue(asset.path, rule.operator, value);
    case "notes":
      return compareLibraryRuleValue(asset.notes, rule.operator, value);
  }
}

function compareLibraryRuleValue(candidate: string, operator: LibraryNodeRuleOperator, normalizedValue: string) {
  const normalizedCandidate = normalizeLibraryMatchText(candidate);

  if (operator === "equals") {
    return normalizedCandidate === normalizedValue;
  }

  return normalizedTextIncludesTerm(normalizedCandidate, normalizedValue);
}

function getLibraryNodeTemplateForFolder(folder: VirtualFolder) {
  return folder.templateId ? libraryNodeTemplates.find((template) => template.id === folder.templateId) ?? customLibraryNodeTemplate : customLibraryNodeTemplate;
}

function getLibraryNodeRules(folder: VirtualFolder): LibraryNodeRule[] {
  const template = getLibraryNodeTemplateForFolder(folder);
  const tags = getEffectiveLibraryNodeTags(template, folder);

  if (folder.rules && folder.rules.length > 0) {
    if (folder.templateId && template.id !== "custom") {
      const existingFileRules = folder.rules.filter((rule) => !isLibraryNodeContentRule(rule));
      const refreshedContentRules = createLibraryNodeRulesFromTemplate(template, folder.name, tags).filter(isLibraryNodeContentRule);

      return mergeLibraryNodeRules(existingFileRules, refreshedContentRules);
    }

    return mergeLibraryNodeRules(folder.rules);
  }

  return createLibraryNodeRulesFromTemplate(template, folder.name, tags);
}

function getEffectiveLibraryNodeTags(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "tags">) {
  return normalizeLibraryNodeTagValues([
    ...getLibraryNodeTagsFromTemplate(template, folder.name),
    ...(folder.tags ?? []),
  ]).filter((tag) => !isStaleTemplateFolderTag(template, tag));
}

function isStaleTemplateFolderTag(template: LibraryNodeTemplate, tag: string) {
  return template.id === "props" && (tag === "object" || tag === "item");
}

function isLibraryNodeContentRule(rule: LibraryNodeRule) {
  return rule.field !== "type" && rule.field !== "extension";
}

function mergeLibraryNodeRules(...ruleGroups: LibraryNodeRule[][]) {
  const rules: LibraryNodeRule[] = [];
  const seenRules = new Set<string>();

  for (const rule of ruleGroups.flat()) {
    const normalizedValue = normalizeLibraryMatchText(rule.value);

    if (!normalizedValue || isIgnoredLibraryMatchTerm(normalizedValue)) {
      continue;
    }

    const key = `${rule.field}:${rule.operator}:${normalizedValue}`;

    if (seenRules.has(key)) {
      continue;
    }

    seenRules.add(key);
    rules.push({ ...rule, value: normalizedValue });
  }

  return rules;
}

function getLibraryNodeTagsFromTemplate(template: LibraryNodeTemplate, name: string) {
  const tags = new Set<string>();

  for (const tag of template.suggestedTags) {
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
  }

  if (template.id === "custom") {
    for (const term of normalizeLibraryMatchText(name).split(" ")) {
      addNormalizedLibraryMatchTerm(tags, term);
    }
  }

  return [...tags];
}

function createLibraryNodeRulesFromTemplate(template: LibraryNodeTemplate, name: string, tags: string[], fileTypes = template.fileTypes) {
  const rules: LibraryNodeRule[] = [];
  const seenRules = new Set<string>();

  function addRule(field: LibraryNodeMatchField, operator: LibraryNodeRuleOperator, value: string) {
    const normalizedValue = normalizeLibraryMatchText(value);

    if (!normalizedValue || isIgnoredLibraryMatchTerm(normalizedValue)) {
      return;
    }

    const key = `${field}:${operator}:${normalizedValue}`;

    if (seenRules.has(key)) {
      return;
    }

    seenRules.add(key);
    rules.push({ field, operator, value: normalizedValue });
  }

  for (const fileType of normalizeLibraryNodeFileTypes(fileTypes)) {
    if (fileType === "Any") {
      continue;
    }

    if (fileType === "Source") {
      for (const extension of sourceFileExtensions) {
        addRule("extension", "equals", extension);
      }
    } else {
      addRule("type", "equals", fileType);
    }
  }

  for (const matchRule of template.matchRules) {
    for (const term of matchRule.terms) {
      addRule(matchRule.field, getLibraryNodeRuleOperator(matchRule), term);
    }
  }

  for (const tag of tags) {
    addRule("tag", "contains", tag);
    addRule("name", "contains", tag);
  }

  if (template.id === "custom") {
    for (const term of normalizeLibraryMatchText(name).split(" ")) {
      addRule("name", "contains", term);
      addRule("tag", "contains", term);
    }
  }

  return rules;
}

function normalizeLibraryNodeFileTypes(fileTypes: LibraryNodeFileType[]) {
  const uniqueFileTypes = [...new Set(fileTypes)];

  if (uniqueFileTypes.length === 0 || uniqueFileTypes.includes("Any")) {
    return ["Any"] satisfies LibraryNodeFileType[];
  }

  return uniqueFileTypes;
}

function getAssetTagSuggestions(assets: Asset[], folders: VirtualFolder[]) {
  const tags = new Set<string>();

  for (const tagDefinition of libraryTagDefinitions) {
    for (const value of [
      tagDefinition.id,
      tagDefinition.label,
      ...(tagDefinition.aliases ?? []),
      ...(tagDefinition.parents ?? []),
      ...(tagDefinition.implies ?? []),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }
  }

  for (const template of libraryNodeTemplates) {
    for (const value of [
      template.name,
      ...template.aliases,
      ...template.suggestedTags,
      ...template.childSuggestions,
      ...template.matchRules.flatMap((rule) => rule.terms),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }
  }

  for (const asset of assets) {
    for (const tag of asset.userTags) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
    }
  }

  collectFolderTagSuggestions(folders, tags);

  return [...tags].sort(compareText);
}

function collectFolderTagSuggestions(folders: VirtualFolder[], tags: Set<string>) {
  for (const folder of folders) {
    for (const value of [
      folder.name,
      ...(folder.tags ?? []),
      ...(folder.suggestedTags ?? []),
      ...(folder.rules ?? []).map((rule) => rule.value),
    ]) {
      addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(value));
    }

    collectFolderTagSuggestions(folder.children, tags);
  }
}

function getLibraryNodeRuleOperator(rule: LibraryNodeMatchRule): LibraryNodeRuleOperator {
  return rule.field === "extension" || rule.field === "type" ? "equals" : "contains";
}

function getLibraryNodeImpliedMatchTerms(template: LibraryNodeTemplate, folder: Pick<VirtualFolder, "name" | "suggestedTags" | "tags">) {
  const terms = new Set<string>();
  const templateTerms =
    template.id === "custom"
      ? []
      : [
          template.name,
          ...template.aliases,
          ...template.suggestedTags,
          ...template.matchRules.flatMap((rule) => rule.terms),
        ];

  for (const value of [
    folder.name,
    ...(folder.tags ?? []),
    ...(folder.suggestedTags ?? []),
    ...templateTerms,
  ]) {
    addLibraryMatchTerm(terms, value);
  }

  return [...terms];
}

function addLibraryMatchTerm(terms: Set<string>, value: string) {
  const normalized = normalizeLibraryMatchText(value);
  addNormalizedLibraryMatchTerm(terms, normalized);

  for (const part of normalized.split(" ")) {
    addNormalizedLibraryMatchTerm(terms, part);
  }
}

function getNormalizedAssetSearchText(asset: Asset) {
  return normalizeLibraryMatchText([asset.name, asset.path, asset.extension, asset.type, ...asset.tags, asset.notes].join(" "));
}

function createVirtualFolderId(name: string) {
  const slug = toSlug(name) || "node";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `vf-${Date.now()}-${slug}-${suffix}`;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findFolder(folders: VirtualFolder[], folderId: string): VirtualFolder | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }

    const child = findFolder(folder.children, folderId);

    if (child) {
      return child;
    }
  }

  return null;
}

function folderContainsId(folder: VirtualFolder, folderId: string): boolean {
  if (folder.id === folderId) {
    return true;
  }

  return folder.children.some((child) => folderContainsId(child, folderId));
}

function findFolderPath(folders: VirtualFolder[], folderId: string): string[] | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder.id];
    }

    const childPath = findFolderPath(folder.children, folderId);

    if (childPath) {
      return [folder.id, ...childPath];
    }
  }

  return null;
}

function findFolderNodePath(folders: VirtualFolder[], folderId: string): VirtualFolder[] | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder];
    }

    const childPath = findFolderNodePath(folder.children, folderId);

    if (childPath) {
      return [folder, ...childPath];
    }
  }

  return null;
}

function updateFolder(folders: VirtualFolder[], folderId: string, update: (folder: VirtualFolder) => VirtualFolder): VirtualFolder[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return update(folder);
    }

    return {
      ...folder,
      children: updateFolder(folder.children, folderId, update),
    };
  });
}

function getTreeNodePathForView(view: LibraryView) {
  switch (view) {
    case "inventory-files":
      return ["inventory-files"];
    case "inventory-documents":
      return ["inventory-files", "inventory-documents"];
    case "inventory-vectors":
      return ["inventory-files", "inventory-vectors"];
    case "all":
      return ["library"];
    case "inbox":
    default:
      return ["library"];
  }
}

function removeFolder(folders: VirtualFolder[], folderId: string): VirtualFolder[] {
  return folders
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      children: removeFolder(folder.children, folderId),
    }));
}

function pruneStarterLibraryNodes(folders: VirtualFolder[]): VirtualFolder[] {
  return folders
    .filter((folder) => !starterLibraryNodeIds.has(folder.id))
    .map((folder) => ({
      ...folder,
      children: pruneStarterLibraryNodes(folder.children),
    }));
}

function getAssignedAssetIds(folders: VirtualFolder[], assets: Asset[]) {
  const ids = new Set<number>();

  for (const folder of folders) {
    for (const assetId of getLibraryNodeAssetIds(folder, assets, true)) {
      ids.add(assetId);
    }
  }

  return ids;
}

function getLibraryNodeAssetIds(folder: VirtualFolder, assets: Asset[], includeChildren: boolean) {
  const ids = new Set<number>();

  for (const asset of assets) {
    if (libraryNodeIncludesAsset(folder, asset)) {
      ids.add(asset.id);
    }
  }

  if (includeChildren) {
    for (const child of folder.children) {
      for (const assetId of getLibraryNodeAssetIds(child, assets, true)) {
        ids.add(assetId);
      }
    }
  }

  return ids;
}

function countFolderAssets(folder: VirtualFolder, assets: Asset[]): number {
  return getLibraryNodeAssetIds(folder, assets, true).size;
}

function countManualFolderAssets(folder: VirtualFolder): number {
  return folder.assetIds.length + sumManualFolderAssets(folder.children);
}

function sumManualFolderAssets(folders: VirtualFolder[]): number {
  return folders.reduce((total, folder) => total + countManualFolderAssets(folder), 0);
}

function getAutomaticAssetTags(asset: ScannedAsset, modelResult?: ModelInspectorResult) {
  const tags = new Set<string>();
  const extension = asset.extension.toLowerCase();

  for (const tag of [
    asset.file_type.toLowerCase(),
    extension,
    ...fileTypeAutomaticTags[asset.file_type],
    ...(extensionAutomaticTags[extension] ?? []),
  ]) {
    addNormalizedLibraryMatchTerm(tags, normalizeLibraryMatchText(tag));
  }

  for (const tag of getAutomaticAudioTags(asset)) {
    addNormalizedLibraryMatchTerm(tags, tag);
  }

  for (const tag of getAutomaticModelInspectorTags(modelResult)) {
    addNormalizedLibraryMatchTerm(tags, tag);
  }

  for (const tag of getAutomaticLibraryRegistryTags(asset)) {
    addNormalizedLibraryMatchTerm(tags, tag);
  }

  const searchText = getScannedAssetTagSearchText(asset);
  let catalogTagCount = 0;
  const matchedTemplates: LibraryNodeTemplate[] = [];

  for (const template of libraryNodeTemplates) {
    if (template.id === "all-assets" || !scannedAssetCanMatchTemplate(asset, template)) {
      continue;
    }

    const triggerTerms = getMatchingTemplateAutomaticTagTerms(template, searchText);

    if (triggerTerms.length === 0) {
      continue;
    }

    matchedTemplates.push(template);

    for (const term of triggerTerms) {
      if (catalogTagCount >= MAX_AUTOMATIC_CATALOG_TAGS) {
        break;
      }

      catalogTagCount += addAutomaticCatalogTag(tags, term) ? 1 : 0;
    }
  }

  for (const template of getLeafMostMatchedCatalogTemplates(matchedTemplates)) {
    let expansionCount = 0;

    for (const tag of getTemplateAutomaticExpansionTags(template)) {
      if (catalogTagCount >= MAX_AUTOMATIC_CATALOG_TAGS || expansionCount >= MAX_CATALOG_EXPANSION_TAGS_PER_TEMPLATE) {
        break;
      }

      if (addAutomaticCatalogTag(tags, tag)) {
        catalogTagCount += 1;
        expansionCount += 1;
      }
    }
  }

  return [...tags];
}

function getDefaultKeptAssetTags(asset: ScannedAsset) {
  return normalizeLibraryNodeTagValues([
    asset.file_type.toLowerCase(),
    asset.extension,
    ...fileTypeAutomaticTags[asset.file_type],
  ]);
}

function getScannedAssetTagSearchText(asset: ScannedAsset) {
  return normalizeLibraryMatchText([
    asset.name,
    asset.extension,
    asset.file_type,
  ].join(" "));
}

function getAutomaticLibraryRegistryTags(asset: ScannedAsset) {
  const tags = new Set<string>();
  const searchText = getScannedAssetTagSearchText(asset);

  for (const tagDefinition of libraryTagDefinitions) {
    if (tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
      break;
    }

    if (!libraryTagDefinitionCanMatchAsset(asset, tagDefinition) || !libraryTagDefinitionMatchesSearchText(tagDefinition, searchText)) {
      continue;
    }

    addLibraryTagDefinitionTags(tags, tagDefinition);
  }

  return [...tags];
}

function libraryTagDefinitionCanMatchAsset(asset: ScannedAsset, tagDefinition: LibraryTagDefinition) {
  const fileTypes = tagDefinition.locksToFileTypes;

  if (!fileTypes || fileTypes.length === 0 || fileTypes.includes("Any")) {
    return true;
  }

  return fileTypes.some((fileType) => fileType === asset.file_type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

function libraryTagDefinitionMatchesSearchText(tagDefinition: LibraryTagDefinition, searchText: string) {
  return getLibraryTagDefinitionTriggerTerms(tagDefinition).some((term) => normalizedTextIncludesTerm(searchText, term));
}

function getLibraryTagDefinitionTriggerTerms(tagDefinition: LibraryTagDefinition) {
  const terms = new Set<string>();

  for (const value of [
    tagDefinition.id,
    tagDefinition.label,
    ...(tagDefinition.aliases ?? []),
  ]) {
    addLibraryRegistryTriggerTerm(terms, value);
  }

  return [...terms];
}

function addLibraryRegistryTriggerTerm(terms: Set<string>, value: string) {
  const normalized = normalizeLibraryMatchText(value);

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return;
  }

  addNormalizedLibraryMatchTerm(terms, normalized);
}

function addLibraryTagDefinitionTags(tags: Set<string>, tagDefinition: LibraryTagDefinition, visitedTagKeys = new Set<string>()) {
  const tagKey = getLibraryTagDefinitionKey(tagDefinition);

  if (!tagKey || visitedTagKeys.has(tagKey) || tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
    return;
  }

  visitedTagKeys.add(tagKey);
  addAutomaticRegistryTag(tags, tagDefinition.id);

  for (const relatedTagId of [...(tagDefinition.parents ?? []), ...(tagDefinition.implies ?? [])]) {
    if (tags.size >= MAX_AUTOMATIC_REGISTRY_TAGS) {
      break;
    }

    const relatedTag = getLibraryTagDefinitionByKey(relatedTagId);

    if (relatedTag) {
      addLibraryTagDefinitionTags(tags, relatedTag, visitedTagKeys);
    } else {
      addAutomaticRegistryTag(tags, relatedTagId);
    }
  }
}

function addAutomaticRegistryTag(tags: Set<string>, value: string) {
  const normalized = canonicalizeLibraryTag(normalizeLibraryMatchText(value));

  if (!normalized || isIgnoredLibraryMatchTerm(normalized)) {
    return false;
  }

  const size = tags.size;
  addNormalizedLibraryMatchTerm(tags, normalized);
  return tags.size > size;
}

function getLibraryTagDefinitionByKey(value: string) {
  return libraryTagDefinitionsByKey.get(getLibraryTagKey(value)) ?? null;
}

function createLibraryTagDefinitionLookup(tagDefinitions: LibraryTagDefinition[]) {
  const lookup = new Map<string, LibraryTagDefinition>();

  function addLookupValue(value: string, tagDefinition: LibraryTagDefinition) {
    const key = getLibraryTagKey(value);

    if (key && !lookup.has(key)) {
      lookup.set(key, tagDefinition);
    }
  }

  for (const tagDefinition of tagDefinitions) {
    addLookupValue(tagDefinition.id, tagDefinition);
  }

  for (const tagDefinition of tagDefinitions) {
    addLookupValue(tagDefinition.label, tagDefinition);
  }

  for (const tagDefinition of tagDefinitions) {
    for (const alias of tagDefinition.aliases ?? []) {
      addLookupValue(alias, tagDefinition);
    }
  }

  return lookup;
}

function getLibraryTagDefinitionKey(tagDefinition: LibraryTagDefinition) {
  return getLibraryTagKey(tagDefinition.id);
}

function getLibraryTagKey(value: string) {
  return canonicalizeLibraryTag(normalizeLibraryMatchText(value));
}

function getAutomaticAudioTags(asset: ScannedAsset) {
  if (asset.file_type !== "Audio") {
    return [];
  }

  const tags = new Set<string>();
  const fileSearchText = normalizeLibraryMatchText([
    asset.name,
    asset.extension,
  ].join(" "));
  const parentSearchText = normalizeLibraryMatchText(getAssetImmediateParentName(asset.path));
  const combinedSearchText = normalizeLibraryMatchText([fileSearchText, parentSearchText].join(" "));
  const looksLikeNonSoundEffect =
    normalizedTextIncludesAnyTerm(fileSearchText, audioNonSoundEffectTerms) || normalizedTextIncludesAnyTerm(parentSearchText, audioNonSoundEffectTerms);
  const hasSoundEffectEvidence = normalizedTextIncludesAnyTerm(combinedSearchText, audioSoundEffectTerms);
  const hasImpactEvidence = normalizedTextIncludesAnyTerm(combinedSearchText, audioImpactTerms);

  if (!looksLikeNonSoundEffect && (hasSoundEffectEvidence || likelySoundEffectAudioExtensions.has(asset.extension.toLowerCase()))) {
    tags.add("sfx");
  }

  if (!looksLikeNonSoundEffect && hasImpactEvidence) {
    tags.add("impact");
  }

  return [...tags];
}

function getAutomaticModelInspectorTags(modelResult?: ModelInspectorResult) {
  if (modelResult?.status !== "ready") {
    return [];
  }

  const triangleCount = modelResult.info.triangleCount;

  if (triangleCount <= 0) {
    return [];
  }

  if (triangleCount < modelPolyTagThresholds.low) {
    return ["low-poly"];
  }

  if (triangleCount < modelPolyTagThresholds.high) {
    return ["mid-poly"];
  }

  if (triangleCount < modelPolyTagThresholds.veryHigh) {
    return ["high-poly"];
  }

  return ["very-high-poly"];
}

function getAssetImmediateParentName(path: string) {
  const directory = getAssetDirectoryPath(path);
  return directory ? getBaseName(directory) : "";
}

function normalizedTextIncludesAnyTerm(text: string, terms: string[]) {
  return terms.some((term) => normalizedTextIncludesTerm(text, normalizeLibraryMatchText(term)));
}

function scannedAssetCanMatchTemplate(asset: ScannedAsset, template: LibraryNodeTemplate) {
  if (template.fileTypes.includes("Any")) {
    return true;
  }

  return template.fileTypes.some((fileType) => fileType === asset.file_type || (fileType === "Source" && sourceFileExtensions.has(asset.extension)));
}

function getMatchingTemplateAutomaticTagTerms(template: LibraryNodeTemplate, searchText: string) {
  return getTemplateAutomaticTagTriggerTerms(template).filter(
    (term) => !automaticCatalogTagIgnoredTerms.has(term) && !isIgnoredLibraryMatchTerm(term) && normalizedTextIncludesTerm(searchText, term),
  );
}

function addAutomaticCatalogTag(tags: Set<string>, value: string) {
  const normalized = canonicalizeLibraryTag(normalizeLibraryMatchText(value));

  if (!normalized || automaticCatalogTagIgnoredTerms.has(normalized) || isIgnoredLibraryMatchTerm(normalized)) {
    return false;
  }

  const size = tags.size;
  addNormalizedLibraryMatchTerm(tags, normalized);
  return tags.size > size;
}

function getLeafMostMatchedCatalogTemplates(templates: LibraryNodeTemplate[]) {
  return templates.filter((template) => !templates.some((candidate) => candidate.id !== template.id && libraryNodeTemplateIsAncestor(template, candidate)));
}

function libraryNodeTemplateIsAncestor(ancestor: LibraryNodeTemplate, descendant: LibraryNodeTemplate, visitedTemplateIds = new Set<string>()): boolean {
  if (visitedTemplateIds.has(descendant.id)) {
    return false;
  }

  visitedTemplateIds.add(descendant.id);

  for (const parent of getLibraryNodeTemplateParents(descendant)) {
    if (parent.id === ancestor.id || libraryNodeTemplateIsAncestor(ancestor, parent, visitedTemplateIds)) {
      return true;
    }
  }

  return false;
}

function getLibraryNodeTemplateParents(template: LibraryNodeTemplate) {
  const templateName = normalizeLibraryMatchText(template.name);

  return libraryNodeTemplates.filter(
    (candidate) =>
      candidate.id !== template.id &&
      candidate.childSuggestions.some((childSuggestion) => normalizeLibraryMatchText(childSuggestion) === templateName),
  );
}

function getTemplateAutomaticExpansionTags(template: LibraryNodeTemplate) {
  const terms = new Set<string>();

  addLibraryMatchTerm(terms, template.name);

  for (const parent of getLibraryNodeTemplateParents(template).filter((parentTemplate) => parentTemplate.category !== "Asset Type" && parentTemplate.category !== "Foundation")) {
    addLibraryMatchTerm(terms, parent.name);
  }

  if (template.category !== "Asset Type" && template.category !== "Foundation" && template.childSuggestions.length <= 6) {
    for (const tag of template.suggestedTags) {
      addLibraryMatchTerm(terms, tag);
    }
  }

  return [...terms];
}

function getTemplateAutomaticTagTriggerTerms(template: LibraryNodeTemplate) {
  const terms = new Set<string>();

  for (const value of [
    template.name,
    ...template.aliases,
    ...template.suggestedTags,
  ]) {
    addLibraryMatchTerm(terms, value);
  }

  for (const rule of template.matchRules) {
    for (const term of rule.terms) {
      addAutomaticMatchRuleTriggerTerm(terms, term);
    }
  }

  return [...terms];
}

function addAutomaticMatchRuleTriggerTerm(terms: Set<string>, value: string) {
  const normalized = normalizeLibraryMatchText(value);

  if (!normalized) {
    return;
  }

  if (normalized.includes(" ")) {
    addNormalizedLibraryMatchTerm(terms, normalized);
    return;
  }

  addLibraryMatchTerm(terms, normalized);
}

function toAsset(asset: ScannedAsset, modelResult?: ModelInspectorResult): Asset {
  const systemTags = normalizeLibraryNodeTagValues(getAutomaticAssetTags(asset, modelResult));
  const defaultKeptTags = getDefaultKeptAssetTags(asset).filter((tag) => systemTags.includes(tag));
  const keptTags = normalizeLibraryNodeTagValues([...defaultKeptTags, ...(asset.kept_tags ?? [])]);
  const userTags = normalizeLibraryNodeTagValues(asset.tags ?? []);

  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    type: asset.file_type,
    extension: asset.extension,
    size: formatBytes(asset.size_bytes),
    sizeBytes: asset.size_bytes,
    modified: formatModified(asset.modified_unix),
    modifiedUnix: asset.modified_unix,
    defaultKeptTags,
    keptTags,
    systemTags,
    tags: normalizeLibraryNodeTagValues([...systemTags, ...keptTags, ...userTags]),
    userTags,
    notes: asset.notes ?? "",
    color: typeColors[asset.file_type],
  };
}

function getBaseName(path: string) {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]+/).pop() || normalized;
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function formatModified(value: number | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value * 1000));
}
