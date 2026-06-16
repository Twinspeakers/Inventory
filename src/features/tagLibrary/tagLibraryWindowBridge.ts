import type { Asset, ProjectTagGroup } from "../../app/appTypes";

export const TAG_LIBRARY_WINDOW_LABEL = "tag-library";
export const TAG_LIBRARY_WINDOW_ROUTE_PARAM = "tag-library-window";
export const TAG_LIBRARY_WINDOW_READY_EVENT = "tag-library:ready";
export const TAG_LIBRARY_WINDOW_STATE_EVENT = "tag-library:state";
export const TAG_LIBRARY_WINDOW_ADD_TAG_EVENT = "tag-library:add-tag";
export const TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_GROUP_EVENT = "tag-library:create-project-tag-group";
export const TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_EVENT = "tag-library:create-project-tag";
export const TAG_LIBRARY_WINDOW_DELETE_PROJECT_TAG_GROUP_EVENT = "tag-library:delete-project-tag-group";

export type TagLibraryWindowAssetSnapshot = Pick<Asset, "id" | "name" | "tags">;

export type TagLibraryWindowStatePayload = {
  projectTagGroups: ProjectTagGroup[];
  selectedAsset: TagLibraryWindowAssetSnapshot | null;
};

export type TagLibraryWindowAddTagPayload = {
  assetId: number;
  tag: string;
};

export type TagLibraryWindowCreateProjectTagGroupPayload = {
  label: string;
};

export type TagLibraryWindowCreateProjectTagPayload = {
  groupId: string;
  label: string;
};

export type TagLibraryWindowDeleteProjectTagGroupPayload = {
  groupId: string;
};

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isTagLibraryWindowRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get(TAG_LIBRARY_WINDOW_ROUTE_PARAM) === "1";
}

export function buildTagLibraryWindowUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(TAG_LIBRARY_WINDOW_ROUTE_PARAM, "1");
  return url.toString();
}

export function toTagLibraryWindowAssetSnapshot(asset: Asset | null): TagLibraryWindowAssetSnapshot | null {
  if (!asset) {
    return null;
  }

  return {
    id: asset.id,
    name: asset.name,
    tags: [...asset.tags],
  };
}
