import { defaultDetailsColumnWidths, type LibraryView } from "../../features/assetShelf";
import type {
  ActiveInventory,
  InventoryDocumentEntry,
  InventoryDocumentsState,
} from "../../features/inventoryProject";
import type { SceneMode } from "../../features/sceneViewer";
import { defaultTreeOpenNodeIds } from "../workspace/appLayout";
import type {
  Asset,
  LeftPaneView,
  PersistedInventoryManifest,
  PersistedLibraryState,
  ProjectTagGroup,
  PersistedWorkspaceState,
  VirtualFolder,
} from "../appTypes";

export function isLibraryView(value: string | null | undefined): value is LibraryView {
  return value === "all" || value === "inbox" || value === "inventory-files" || value === "inventory-documents" || value === "inventory-vectors";
}

export function isNativeHubView(value: LibraryView): value is "inventory-files" | "inventory-documents" | "inventory-vectors" {
  return value === "inventory-files" || value === "inventory-documents" || value === "inventory-vectors";
}

export function isSceneMode(value: string | null | undefined): value is SceneMode {
  return value === "preview" || value === "nvd-document" || value === "nvv-document";
}

export function isLeftPaneView(value: string | null | undefined): value is LeftPaneView {
  return value === "library" || value === "nvd-navigation";
}

export function createEmptyLibraryState(): PersistedLibraryState {
  return {
    rootPath: null,
    assets: [],
    projectTagGroups: [],
    recentUserTagIds: [],
    sourceFolders: [],
    virtualFolders: [],
  };
}

export function createDefaultWorkspaceState(): PersistedWorkspaceState {
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

export function getPersistedLibraryStateFromManifest(manifest: PersistedInventoryManifest): PersistedLibraryState {
  return {
    rootPath: manifest.rootPath ?? manifest.sourceFolders[0]?.path ?? null,
    assets: manifest.assets,
    projectTagGroups: normalizeProjectTagGroups(manifest.projectTagGroups),
    recentUserTagIds: normalizeStringList(manifest.recentUserTagIds),
    sourceFolders: manifest.sourceFolders,
    virtualFolders: manifest.libraryTree,
  };
}

function normalizeProjectTagGroups(value: unknown[] | undefined): ProjectTagGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((group) => {
    if (!group || typeof group !== "object") {
      return [];
    }

    const candidate = group as {
      id?: unknown;
      label?: unknown;
      tags?: unknown;
    };
    const id = typeof candidate.id === "string" ? candidate.id : null;
    const label = typeof candidate.label === "string" ? candidate.label : null;
    const tags = Array.isArray(candidate.tags)
      ? candidate.tags.flatMap((tag) => {
          if (!tag || typeof tag !== "object") {
            return [];
          }

          const tagCandidate = tag as { id?: unknown; label?: unknown };
          return typeof tagCandidate.id === "string" && typeof tagCandidate.label === "string"
            ? [{ id: tagCandidate.id, label: tagCandidate.label }]
            : [];
        })
      : [];

    return id && label ? [{ id, label, tags }] : [];
  });
}

function normalizeStringList(value: string[] | undefined) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function upsertInventoryDocumentEntry(entries: InventoryDocumentEntry[], entry: InventoryDocumentEntry) {
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

export function removeInventoryDocumentEntry(entries: InventoryDocumentEntry[], entry: InventoryDocumentEntry) {
  const entryPath = normalizePath(entry.path);
  return entries.filter((candidate) => candidate.assetId !== entry.assetId && normalizePath(candidate.path) !== entryPath);
}

export function findInventoryNvdDocumentForAsset(asset: Pick<Asset, "id" | "path">, documents: InventoryDocumentsState) {
  const assetPath = normalizePath(asset.path);
  return (
    documents.nvdDocuments.find((document) => document.assetId === asset.id || normalizePath(document.path) === assetPath) ??
    null
  );
}

export function isInventoryOwnedDocumentPath(path: string, activeInventory: ActiveInventory | null) {
  if (!activeInventory) {
    return false;
  }

  return normalizePath(path).startsWith(`${normalizePath(activeInventory.rootPath)}/documents/`);
}

export function removeAssetIdsFromVirtualFolders(folders: VirtualFolder[], assetIds: Set<number>): VirtualFolder[] {
  return folders.map((folder) => ({
    ...folder,
    assetIds: folder.assetIds.filter((assetId) => !assetIds.has(assetId)),
    excludedAssetIds: (folder.excludedAssetIds ?? []).filter((assetId) => !assetIds.has(assetId)),
    children: removeAssetIdsFromVirtualFolders(folder.children, assetIds),
  }));
}

export function isNvdAsset(asset: Asset) {
  return asset.type === "Document" && asset.extension.toLowerCase() === "nvd";
}

export function isNvvAsset(asset: Asset) {
  return asset.type === "Document" && asset.extension.toLowerCase() === "nvv";
}

export function isEditableEventTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function compareText(first: string, second: string) {
  return first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" });
}

