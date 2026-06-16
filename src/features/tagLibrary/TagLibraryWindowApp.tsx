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
  TAG_LIBRARY_WINDOW_READY_EVENT,
  TAG_LIBRARY_WINDOW_STATE_EVENT,
  type TagLibraryWindowAddTagPayload,
  type TagLibraryWindowAssetSnapshot,
  type TagLibraryWindowStatePayload,
} from "./tagLibraryWindowBridge";

export function TagLibraryWindowApp() {
  const [selectedAsset, setSelectedAsset] = useState<TagLibraryWindowAssetSnapshot | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlistenState: (() => void) | null = null;

    void getCurrentWindow()
      .listen<TagLibraryWindowStatePayload>(TAG_LIBRARY_WINDOW_STATE_EVENT, ({ payload }) => {
        if (!disposed) {
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

  return (
    <TagLibraryBrowser
      mode="window"
      selectedAsset={selectedAsset}
      sections={libraryTagSourceSections}
      tags={libraryTagDefinitions}
      onAddTag={handleAddTag}
      onClose={handleClose}
    />
  );
}
