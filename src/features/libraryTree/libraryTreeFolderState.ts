import type { AddLibraryNodeParentOption, VirtualFolder } from "../../app/appTypes";
import type { LibraryView } from "../assetShelf";

const starterLibraryNodeIds = new Set(["vf-tavern", "vf-tavern-props", "vf-tavern-lighting", "vf-fishing", "vf-icons"]);

export function createVirtualFolderId(name: string) {
  const slug = toSlug(name) || "node";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `vf-${Date.now()}-${slug}-${suffix}`;
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findFolder(folders: VirtualFolder[], folderId: string): VirtualFolder | null {
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

export function folderContainsId(folder: VirtualFolder, folderId: string): boolean {
  if (folder.id === folderId) {
    return true;
  }

  return folder.children.some((child) => folderContainsId(child, folderId));
}

export function findFolderPath(folders: VirtualFolder[], folderId: string): string[] | null {
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

export function findFolderNodePath(folders: VirtualFolder[], folderId: string): VirtualFolder[] | null {
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

export function updateFolder(folders: VirtualFolder[], folderId: string, update: (folder: VirtualFolder) => VirtualFolder): VirtualFolder[] {
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

export function insertFolder(folders: VirtualFolder[], parentFolderId: string | null, folder: VirtualFolder): VirtualFolder[] {
  if (!parentFolderId) {
    return [...folders, folder];
  }

  return updateFolder(folders, parentFolderId, (parent) => ({
    ...parent,
    children: [...parent.children, folder],
  }));
}

export function setFolderAssetAssignment(
  folders: VirtualFolder[],
  folderId: string,
  assetId: number,
  assigned: boolean,
): VirtualFolder[] {
  return updateFolder(folders, folderId, (folder) => ({
    ...folder,
    assetIds: assigned
      ? folder.assetIds.includes(assetId)
        ? folder.assetIds
        : [...folder.assetIds, assetId]
      : folder.assetIds.filter((currentAssetId) => currentAssetId !== assetId),
  }));
}

export function setFolderAssetExclusion(
  folders: VirtualFolder[],
  folderId: string,
  assetId: number,
  excluded: boolean,
): VirtualFolder[] {
  return updateFolder(folders, folderId, (folder) => {
    const currentExcludedAssetIds = folder.excludedAssetIds ?? [];

    return {
      ...folder,
      excludedAssetIds: excluded
        ? currentExcludedAssetIds.includes(assetId)
          ? currentExcludedAssetIds
          : [...currentExcludedAssetIds, assetId]
        : currentExcludedAssetIds.filter((currentAssetId) => currentAssetId !== assetId),
    };
  });
}

export function getTreeNodePathForView(view: LibraryView) {
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

export function removeFolder(folders: VirtualFolder[], folderId: string): VirtualFolder[] {
  return folders
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      children: removeFolder(folder.children, folderId),
    }));
}

export function pruneStarterLibraryNodes(folders: VirtualFolder[]): VirtualFolder[] {
  return folders
    .filter((folder) => !starterLibraryNodeIds.has(folder.id))
    .map((folder) => ({
      ...folder,
      children: pruneStarterLibraryNodes(folder.children),
    }));
}

export function getAddLibraryNodeParentOptions(folders: VirtualFolder[]): AddLibraryNodeParentOption[] {
  const options: AddLibraryNodeParentOption[] = [{ id: null, label: "Master" }];

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

  addFolderOptions(folders, ["Master"]);
  return options;
}
