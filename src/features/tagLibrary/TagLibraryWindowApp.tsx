import { useEffect, useState } from "react";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  libraryTagDefinitions,
  libraryTagSourceSections,
} from "../../libraryCatalog";
import { TagLibraryBrowser } from "./TagLibraryBrowser";
import {
  TAG_LIBRARY_WINDOW_ADD_TAG_EVENT,
  TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_EVENT,
  TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_GROUP_EVENT,
  TAG_LIBRARY_WINDOW_DELETE_PROJECT_TAG_GROUP_EVENT,
  TAG_LIBRARY_WINDOW_RENAME_ASSET_EVENT,
  TAG_LIBRARY_WINDOW_READY_EVENT,
  TAG_LIBRARY_WINDOW_STATE_EVENT,
  type TagLibraryWindowAddTagPayload,
  type TagLibraryWindowAssetSnapshot,
  type TagLibraryWindowCreateProjectTagGroupPayload,
  type TagLibraryWindowCreateProjectTagPayload,
  type TagLibraryWindowDeleteProjectTagGroupPayload,
  type TagLibraryWindowRenameAssetPayload,
  type TagLibraryWindowStatePayload,
} from "./tagLibraryWindowBridge";

export function TagLibraryWindowApp() {
  const [selectedAsset, setSelectedAsset] = useState<TagLibraryWindowAssetSnapshot | null>(null);
  const [projectTagGroups, setProjectTagGroups] = useState<TagLibraryWindowStatePayload["projectTagGroups"]>([]);

  useEffect(() => {
    let disposed = false;
    let unlistenState: (() => void) | null = null;

    void getCurrentWindow()
      .listen<TagLibraryWindowStatePayload>(TAG_LIBRARY_WINDOW_STATE_EVENT, ({ payload }) => {
        if (!disposed) {
          setProjectTagGroups(payload.projectTagGroups);
          setSelectedAsset(payload.selectedAsset);
        }
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenState = unlisten;
      });

    void emitTo("main", TAG_LIBRARY_WINDOW_READY_EVENT);

    return () => {
      disposed = true;
      unlistenState?.();
    };
  }, []);

  function handleAddTag(tag: string) {
    if (!selectedAsset) {
      return;
    }

    const payload: TagLibraryWindowAddTagPayload = {
      assetId: selectedAsset.id,
      tag,
    };
    void emitTo("main", TAG_LIBRARY_WINDOW_ADD_TAG_EVENT, payload);
  }

  function handleClose() {
    void getCurrentWindow().close();
  }

  function handleCreateProjectTagGroup(label: string) {
    const payload: TagLibraryWindowCreateProjectTagGroupPayload = { label };
    void emitTo("main", TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_GROUP_EVENT, payload);
  }

  function handleCreateProjectTag(groupId: string, label: string) {
    const payload: TagLibraryWindowCreateProjectTagPayload = { groupId, label };
    void emitTo("main", TAG_LIBRARY_WINDOW_CREATE_PROJECT_TAG_EVENT, payload);
  }

  function handleDeleteProjectTagGroup(groupId: string) {
    const payload: TagLibraryWindowDeleteProjectTagGroupPayload = { groupId };
    void emitTo("main", TAG_LIBRARY_WINDOW_DELETE_PROJECT_TAG_GROUP_EVENT, payload);
  }

  function handleRenameSelectedAsset(name: string) {
    if (!selectedAsset) {
      return;
    }

    const payload: TagLibraryWindowRenameAssetPayload = {
      assetId: selectedAsset.id,
      name,
    };
    void emitTo("main", TAG_LIBRARY_WINDOW_RENAME_ASSET_EVENT, payload);
  }

  return (
    <TagLibraryBrowser
      mode="window"
      projectTagGroups={projectTagGroups}
      selectedAsset={selectedAsset}
      sections={libraryTagSourceSections}
      tags={libraryTagDefinitions}
      onCreateProjectTag={handleCreateProjectTag}
      onCreateProjectTagGroup={handleCreateProjectTagGroup}
      onDeleteProjectTagGroup={handleDeleteProjectTagGroup}
      onRenameSelectedAsset={handleRenameSelectedAsset}
      onAddTag={handleAddTag}
      onClose={handleClose}
    />
  );
}
