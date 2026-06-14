import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from "react";
import { normalizeLibraryNodeTagValues } from "../../libraryCatalog";
import type { ActiveInventory, InventoryDocumentsState } from "../../features/inventoryProject";
import type { SessionHistoryCommand } from "../../features/editors";
import {
  countFolderAssets,
  createVirtualFolderFromDraft,
  findFolder,
  findFolderPath,
  folderContainsId,
  getAssetsForLibraryNode,
  libraryNodeIncludesAsset,
  removeFolder,
  updateFolder,
} from "../../features/libraryTree/libraryTreeModel";
import type { LibraryView } from "../../features/assetShelf";
import type { LibraryNodeContextMenuState, SourceFolderContextMenuState } from "../shell/ContextMenus";
import type {
  AddLibraryNodeDraft,
  AddLibraryNodePanelState,
  Asset,
  AssetPlacementSuggestion,
  ScanResult,
  SourceFolder,
  StructureNode,
  UndoContext,
  VirtualFolder,
} from "../appTypes";
import { updateAssetInScanResult } from "../library/scanResultState";
import { findInventoryNvdDocumentForAsset } from "../workspace/workspaceState";

export function useLibraryActions({
  activeInventory,
  addLibraryNodePanel,
  assets,
  inventoryDocuments,
  masterLibraryAssets,
  selectedAsset,
  selectedFolderId,
  virtualFolders,
  addLibraryHistoryCommand,
  openTreeNodePath,
  setActiveView,
  setAddLibraryNodePanel,
  setLibraryNodeContextMenu,
  setScanResult,
  setSelectedFolderId,
  setSelectedId,
  setSourceFolderContextMenu,
  setStatusMessage,
  setUndoContext,
  setVirtualFolders,
}: {
  activeInventory: ActiveInventory | null;
  addLibraryNodePanel: AddLibraryNodePanelState | null;
  assets: Asset[];
  inventoryDocuments: InventoryDocumentsState;
  masterLibraryAssets: Asset[];
  selectedAsset: Asset | null;
  selectedFolderId: string | null;
  virtualFolders: VirtualFolder[];
  addLibraryHistoryCommand: (command: SessionHistoryCommand) => void;
  openTreeNodePath: (nodeIds: string[]) => void;
  setActiveView: Dispatch<SetStateAction<LibraryView>>;
  setAddLibraryNodePanel: Dispatch<SetStateAction<AddLibraryNodePanelState | null>>;
  setLibraryNodeContextMenu: Dispatch<SetStateAction<LibraryNodeContextMenuState | null>>;
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>;
  setSelectedFolderId: Dispatch<SetStateAction<string | null>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setSourceFolderContextMenu: Dispatch<SetStateAction<SourceFolderContextMenuState | null>>;
  setStatusMessage: (message: string) => void;
  setUndoContext: Dispatch<SetStateAction<UndoContext>>;
  setVirtualFolders: Dispatch<SetStateAction<VirtualFolder[]>>;
}) {
  function focusLibraryFolder(folderId: string, selectedAssetId?: number, nodePath?: string[]) {
    openTreeNodePath(nodePath ?? ["library", ...(findFolderPath(virtualFolders, folderId) ?? [])]);
    setSelectedFolderId(folderId);
    setActiveView("all");

    if (selectedAssetId !== undefined) {
      setSelectedId(selectedAssetId);
    }
  }

  function updateScannedAsset(
    assetId: number,
    update: (asset: ScanResult["assets"][number]) => ScanResult["assets"][number],
    nextSelectedAssetId?: number,
  ) {
    setScanResult((currentScanResult) => updateAssetInScanResult(currentScanResult, assetId, update));

    if (nextSelectedAssetId !== undefined) {
      setSelectedId(nextSelectedAssetId);
    }
  }

  function canAddLibraryNodes() {
    if (activeInventory) {
      return true;
    }

    setStatusMessage("Create or open an Inventory before adding library nodes.");
    return false;
  }

  function createFolder() {
    if (!canAddLibraryNodes()) {
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
    if (!canAddLibraryNodes()) {
      setLibraryNodeContextMenu(null);
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
    focusLibraryFolder(folder.id, undefined, ["library", ...parentPath, folder.id]);
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
    focusLibraryFolder(folderId);
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
    updateScannedAsset(assetId, (currentAsset) => ({ ...currentAsset, name }), assetId);
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
      focusLibraryFolder(folder.id, selectedAsset.id, ["library", ...parentPath, folder.id]);
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

    focusLibraryFolder(folder.id, selectedAsset.id);
    setStatusMessage(`Placed "${selectedAsset.name}" in "${suggestion.path.join(" > ")}" inside Inventory.`);
  }

  function updateAssetNotes(assetId: number, notes: string) {
    updateScannedAsset(assetId, (asset) => ({ ...asset, notes }));
  }

  function updateAssetTags(assetId: number, tags: string[]) {
    const normalizedTags = normalizeLibraryNodeTagValues(tags);

    updateScannedAsset(assetId, (asset) => ({ ...asset, tags: normalizedTags }));
  }

  function updateAssetKeptTags(assetId: number, tags: string[]) {
    const normalizedTags = normalizeLibraryNodeTagValues(tags);

    updateScannedAsset(assetId, (asset) => ({ ...asset, kept_tags: normalizedTags }));
  }

  return {
    acceptAssetPlacementSuggestion,
    addLibraryNodeFromDraft,
    createFolder,
    deleteLibraryNode,
    openAddLibraryNodePanel,
    openAssetContextMenu,
    openLibraryNodeContextMenu,
    openSourceFolderContextMenu,
    renameAssetDisplayName,
    renameLibraryNode,
    updateAssetKeptTags,
    updateAssetNotes,
    updateAssetTags,
  };
}

