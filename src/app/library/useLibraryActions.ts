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
  findFolderNodePath,
  findFolderPath,
  folderContainsId,
  getAssetsForLibraryNode,
  getAssetPlacementSuggestions,
  libraryNodeIncludesAsset,
  insertFolder,
  removeFolder,
  setFolderAssetAssignment,
  setFolderAssetExclusion,
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

  function focusLibraryRoot(selectedAssetId?: number) {
    openTreeNodePath(["library"]);
    setSelectedFolderId(null);
    setActiveView("all");

    if (selectedAssetId !== undefined) {
      setSelectedId(selectedAssetId);
    }
  }

  function focusLibraryParent(folderPath: string[], selectedAssetId?: number) {
    const parentPath = folderPath.slice(0, -1);
    const parentFolderId = parentPath[parentPath.length - 1] ?? null;

    if (parentFolderId) {
      focusLibraryFolder(parentFolderId, selectedAssetId, ["library", ...parentPath]);
      return;
    }

    focusLibraryRoot(selectedAssetId);
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

    openAddLibraryNodePanel(null, "Master");
  }

  function openLibraryNodeContextMenu(node: StructureNode, event: ReactMouseEvent<HTMLElement>) {
    const assetNodeId = typeof node.assetId === "number" ? node.assetId : null;
    const isAssetNode = assetNodeId !== null;
    const canOpenFolderMenu =
      Boolean(node.canAddChild) ||
      Boolean(node.folderId) ||
      Boolean(node.builtinView) ||
      node.id === "library" ||
      node.id === "inventory-files";

    if (!canOpenFolderMenu && !isAssetNode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setUndoContext("library");
    setSourceFolderContextMenu(null);

    if (isAssetNode) {
      const asset = assets.find((candidate) => candidate.id === assetNodeId);
      const parentFolder = node.parentFolderId ? findFolder(virtualFolders, node.parentFolderId) : null;
      const parentPathLabels = node.parentFolderId
        ? (findFolderNodePath(virtualFolders, node.parentFolderId) ?? []).map((folder) => folder.name)
        : [];
      setSelectedId(assetNodeId);
      setLibraryNodeContextMenu({
        assetId: assetNodeId,
        assetParentFolderId: node.parentFolderId ?? null,
        assetParentPathLabels: parentPathLabels,
        assetPlacementSuggestions: asset ? getAssetPlacementSuggestions(asset, virtualFolders, masterLibraryAssets) : [],
        canRemoveFromNode: Boolean(parentFolder && asset && libraryNodeIncludesAsset(parentFolder, asset)),
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
    setSelectedId(asset.id);
    setLibraryNodeContextMenu({
      assetId: asset.id,
      assetParentFolderId: null,
      assetParentPathLabels: [],
      assetPlacementSuggestions: getAssetPlacementSuggestions(asset, virtualFolders, masterLibraryAssets),
      canRemoveFromNode: false,
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

  function openAddLibraryNodePanel(
    parentFolderId: string | null,
    parentLabel: string,
    initialQuery = "",
  ) {
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
      setStatusMessage("Name the node before creating it.");
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
    const parentLabel = parentFolder?.name ?? "Master";

    setVirtualFolders((folders) =>
      parentFolderId
        ? updateFolder(folders, parentFolderId, (parent) => ({ ...parent, children: [...parent.children, folder] }))
        : [...folders, folder],
    );
    focusLibraryFolder(folder.id, undefined, ["library", ...parentPath, folder.id]);
    setAddLibraryNodePanel(null);
    setStatusMessage(
      `Added node "${folder.name}" under "${parentLabel}". ${
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

    if (!trimmedName) {
      return;
    }

    renameLibraryNodeTo(folderId, trimmedName);
  }

  function renameLibraryNodeTo(folderId: string, name: string) {
    const folder = findFolder(virtualFolders, folderId);

    if (!folder) {
      setStatusMessage("That library node could not be found.");
      return;
    }

    const trimmedName = name.trim();

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

    if (!trimmedName) {
      return;
    }

    renameAssetDisplayNameTo(assetId, trimmedName);
  }

  function renameAssetDisplayNameTo(assetId: number, name: string) {
    const asset = assets.find((candidate) => candidate.id === assetId);

    if (!asset) {
      setStatusMessage("That asset could not be found.");
      return;
    }

    const trimmedName = name.trim();

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
    const asset = selectedAsset;

    if (!asset) {
      setStatusMessage("Select an asset before accepting a placement suggestion.");
      return;
    }

    if (suggestion.target === "new" && suggestion.draft) {
      const parentFolderId = suggestion.parentFolderId ?? null;
      const parentPath = parentFolderId ? findFolderPath(virtualFolders, parentFolderId) ?? [] : [];
      const folder = {
        ...createVirtualFolderFromDraft(suggestion.draft),
        assetIds: [asset.id],
      };
      const folderPath = ["library", ...parentPath, folder.id];

      const applyPlacement = (message: string) => {
        setVirtualFolders((folders) => insertFolder(folders, parentFolderId, folder));
        focusLibraryFolder(folder.id, asset.id, folderPath);
        setStatusMessage(message);
      };

      const undoPlacement = (message: string) => {
        setVirtualFolders((folders) => removeFolder(folders, folder.id));
        focusLibraryParent([...parentPath, folder.id], asset.id);
        setStatusMessage(message);
      };

      applyPlacement(`Created "${folder.name}" and placed "${asset.name}" there inside Inventory.`);
      addLibraryHistoryCommand({
        label: `Add To ${folder.name}`,
        redo: () => applyPlacement(`Redid placing "${asset.name}" in "${folder.name}".`),
        undo: () => undoPlacement(`Undid placing "${asset.name}" in "${folder.name}".`),
      });
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

    const folderPath = findFolderPath(virtualFolders, folder.id) ?? [folder.id];
    const hadManualAssignment = folder.assetIds.includes(asset.id);
    const wasExcluded = (folder.excludedAssetIds ?? []).includes(asset.id);
    const needsManualAssignment = !libraryNodeIncludesAsset(folder, asset);

    if (needsManualAssignment) {
      const applyPlacement = (message: string) => {
        setVirtualFolders((folders) => {
          const withAssignment = setFolderAssetAssignment(folders, folder.id, asset.id, true);
          return wasExcluded ? setFolderAssetExclusion(withAssignment, folder.id, asset.id, false) : withAssignment;
        });
        focusLibraryFolder(folder.id, asset.id);
        setStatusMessage(message);
      };

      const undoPlacement = (message: string) => {
        setVirtualFolders((folders) => {
          const withAssignment = setFolderAssetAssignment(folders, folder.id, asset.id, hadManualAssignment);
          return setFolderAssetExclusion(withAssignment, folder.id, asset.id, wasExcluded);
        });
        focusLibraryParent(folderPath, asset.id);
        setStatusMessage(message);
      };

      applyPlacement(`Placed "${asset.name}" in "${suggestion.path.join(" > ")}" inside Inventory.`);
      addLibraryHistoryCommand({
        label: `Add To ${folder.name}`,
        redo: () => applyPlacement(`Redid placing "${asset.name}" in "${suggestion.path.join(" > ")}".`),
        undo: () => undoPlacement(`Undid placing "${asset.name}" in "${suggestion.path.join(" > ")}".`),
      });
      return;
    }

    if (wasExcluded) {
      const applyPlacement = (message: string) => {
        setVirtualFolders((folders) => setFolderAssetExclusion(folders, folder.id, asset.id, false));
        focusLibraryFolder(folder.id, asset.id);
        setStatusMessage(message);
      };

      const undoPlacement = (message: string) => {
        setVirtualFolders((folders) => setFolderAssetExclusion(folders, folder.id, asset.id, true));
        focusLibraryParent(folderPath, asset.id);
        setStatusMessage(message);
      };

      applyPlacement(`Placed "${asset.name}" in "${suggestion.path.join(" > ")}" inside Inventory.`);
      addLibraryHistoryCommand({
        label: `Add To ${folder.name}`,
        redo: () => applyPlacement(`Redid placing "${asset.name}" in "${suggestion.path.join(" > ")}".`),
        undo: () => undoPlacement(`Undid placing "${asset.name}" in "${suggestion.path.join(" > ")}".`),
      });
      return;
    }

    focusLibraryFolder(folder.id, asset.id);
    setStatusMessage(`Placed "${asset.name}" in "${suggestion.path.join(" > ")}" inside Inventory.`);
  }

  function removeAssetFromLibraryNode(assetId: number, folderId: string) {
    const asset = assets.find((candidate) => candidate.id === assetId);
    const folder = findFolder(virtualFolders, folderId);

    if (!asset || !folder) {
      setStatusMessage("That asset placement could not be found.");
      return;
    }

    const hadManualAssignment = folder.assetIds.includes(assetId);
    const wasExcluded = (folder.excludedAssetIds ?? []).includes(assetId);
    const matchesByRules = !wasExcluded && !hadManualAssignment && libraryNodeIncludesAsset(folder, asset);

    if (!hadManualAssignment && !matchesByRules) {
      setStatusMessage(`"${asset.name}" is not currently placed in "${folder.name}".`);
      return;
    }

    const folderPath = findFolderPath(virtualFolders, folder.id) ?? [folder.id];

    const applyRemoval = (message: string) => {
      setVirtualFolders((folders) => {
        const withoutAssignment = setFolderAssetAssignment(folders, folder.id, assetId, false);
        return setFolderAssetExclusion(withoutAssignment, folder.id, assetId, matchesByRules);
      });
      focusLibraryParent(folderPath, assetId);
      setStatusMessage(message);
    };

    const undoRemoval = (message: string) => {
      setVirtualFolders((folders) => {
        const withAssignment = setFolderAssetAssignment(folders, folder.id, assetId, hadManualAssignment);
        return setFolderAssetExclusion(withAssignment, folder.id, assetId, wasExcluded);
      });
      focusLibraryFolder(folder.id, assetId);
      setStatusMessage(message);
    };

    applyRemoval(`Demoted "${asset.name}" from "${folder.name}" inside Inventory.`);
    addLibraryHistoryCommand({
      label: `Demote From ${folder.name}`,
      redo: () => applyRemoval(`Redid demoting "${asset.name}" from "${folder.name}".`),
      undo: () => undoRemoval(`Undid demoting "${asset.name}" from "${folder.name}".`),
    });
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
    removeAssetFromLibraryNode,
    renameAssetDisplayName,
    renameAssetDisplayNameTo,
    renameLibraryNode,
    renameLibraryNodeTo,
    updateAssetKeptTags,
    updateAssetNotes,
    updateAssetTags,
  };
}

