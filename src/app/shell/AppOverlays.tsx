import {
  libraryNodeTemplates,
  libraryTagDefinitions,
  libraryTagSourceSections,
} from "../../libraryCatalog";
import {
  LibraryNodeContextMenu,
  SourceFolderContextMenu,
  type LibraryNodeContextMenuState,
  type SourceFolderContextMenuState,
} from "../shell/ContextMenus";
import type {
  AddLibraryNodeDraft,
  AddLibraryNodePanelState,
  Asset,
  AssetPlacementSuggestion,
  ProjectTagGroup,
  VirtualFolder,
} from "../appTypes";
import type { NvdStyleRole } from "../../features/nvdEditor";
import { AddLibraryNodePanel } from "../library/AddLibraryNodePanel";
import {
  SettingsPanel,
  type ThemeColors,
  type ThemeDefinition,
  type ThemeEditorLayout,
} from "../../features/settings";
import { TagLibraryBrowser } from "../../features/tagLibrary/TagLibraryBrowser";

export function AppOverlays({
  addLibraryNodePanel,
  availableThemes,
  customThemes,
  isNvdCloseConfirmationOpen,
  isSettingsOpen,
  isTagBrowserOpen,
  libraryNodeContextMenu,
  masterLibraryAssets,
  nvdSaveReminderEnabled,
  nvdSaveState,
  nvdStyleResetConfirmationEnabled,
  openedNvdDocumentTitle,
  pendingNvdStyleResetRole,
  projectTagGroups,
  selectedThemeId,
  selectedThemeIsBuiltin,
  selectedAsset,
  sourceFolderContextMenu,
  themeColors,
  themeEditorLayout,
  themeName,
  virtualFolders,
  hideFutureNvdStyleResetConfirmations,
  onAddLibraryNodePanelClose,
  onCloseActiveNvdDocument,
  onCloseNvdCloseConfirmation,
  onConfirmNvdStyleReset,
  onDeleteInventoryNvdDocument,
  onDeleteLibraryNode,
  onDeleteTheme,
  onAssetPlacementSuggestionAccept,
  onLibraryNodeContextMenuClose,
  onRemoveAssetFromLibraryNode,
  onNvdSaveReminderEnabledChange,
  onNvdStyleResetConfirmationEnabledChange,
  onOpenAddLibraryNodePanel,
  onRefreshSourceFolder,
  onRemoveSourceFolder,
  onRenameAssetDisplayName,
  onRenameInventoryNvdDocument,
  onRenameLibraryNode,
  onSaveAndCloseActiveNvdDocument,
  onSaveTheme,
  onSelectTheme,
  onSettingsClose,
  onSourceFolderContextMenuClose,
  onTagBrowserClose,
  onTagBrowserAddTag,
  onThemeColorChange,
  onThemeEditorLayoutChange,
  onThemeNameChange,
  onToggleFutureNvdStyleResetConfirmations,
  onClearPendingNvdStyleResetRole,
  onCreateLibraryNode,
  onCreateProjectTag,
  onCreateProjectTagGroup,
  onDeleteProjectTagGroup,
  onRenameSelectedAsset,
}: {
  addLibraryNodePanel: AddLibraryNodePanelState | null;
  availableThemes: ThemeDefinition[];
  customThemes: ThemeDefinition[];
  isNvdCloseConfirmationOpen: boolean;
  isSettingsOpen: boolean;
  isTagBrowserOpen: boolean;
  libraryNodeContextMenu: LibraryNodeContextMenuState | null;
  masterLibraryAssets: Asset[];
  nvdSaveReminderEnabled: boolean;
  nvdSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  nvdStyleResetConfirmationEnabled: boolean;
  openedNvdDocumentTitle: string | null;
  pendingNvdStyleResetRole: NvdStyleRole | null;
  projectTagGroups: ProjectTagGroup[];
  selectedThemeId: string;
  selectedThemeIsBuiltin: boolean;
  selectedAsset: Asset | null;
  sourceFolderContextMenu: SourceFolderContextMenuState | null;
  themeColors: ThemeColors;
  themeEditorLayout: ThemeEditorLayout;
  themeName: string;
  virtualFolders: VirtualFolder[];
  hideFutureNvdStyleResetConfirmations: boolean;
  onAddLibraryNodePanelClose: () => void;
  onCloseActiveNvdDocument: () => void;
  onCloseNvdCloseConfirmation: () => void;
  onConfirmNvdStyleReset: () => void;
  onDeleteInventoryNvdDocument: (assetId: number) => void;
  onDeleteLibraryNode: (folderId: string) => void;
  onDeleteTheme: () => void;
  onAssetPlacementSuggestionAccept: (suggestion: AssetPlacementSuggestion) => void;
  onLibraryNodeContextMenuClose: () => void;
  onRemoveAssetFromLibraryNode: (assetId: number, folderId: string) => void;
  onNvdSaveReminderEnabledChange: (enabled: boolean) => void;
  onNvdStyleResetConfirmationEnabledChange: (enabled: boolean) => void;
  onOpenAddLibraryNodePanel: (parentFolderId: string | null, parentLabel: string) => void;
  onRefreshSourceFolder: (sourceId: string) => void;
  onRemoveSourceFolder: (sourceId: string) => void;
  onRenameAssetDisplayName: (assetId: number) => void;
  onRenameInventoryNvdDocument: (assetId: number) => void;
  onRenameLibraryNode: (folderId: string) => void;
  onSaveAndCloseActiveNvdDocument: () => void;
  onSaveTheme: () => void;
  onSelectTheme: (themeId: string) => void;
  onSettingsClose: () => void;
  onSourceFolderContextMenuClose: () => void;
  onTagBrowserClose: () => void;
  onTagBrowserAddTag: (tag: string) => void;
  onThemeColorChange: (key: keyof ThemeColors, value: string) => void;
  onThemeEditorLayoutChange: (layout: ThemeEditorLayout) => void;
  onThemeNameChange: (name: string) => void;
  onToggleFutureNvdStyleResetConfirmations: (enabled: boolean) => void;
  onClearPendingNvdStyleResetRole: () => void;
  onCreateLibraryNode: (draft: AddLibraryNodeDraft, parentFolderId: string | null) => void;
  onCreateProjectTag: (groupId: string, label: string) => void;
  onCreateProjectTagGroup: (label: string) => void;
  onDeleteProjectTagGroup: (groupId: string) => void;
  onRenameSelectedAsset: (name: string) => void;
}) {
  return (
    <>
      {isSettingsOpen ? (
        <SettingsPanel
          availableThemes={availableThemes}
          canDeleteSelectedTheme={customThemes.some((theme) => theme.id === selectedThemeId)}
          nvdSaveReminderEnabled={nvdSaveReminderEnabled}
          nvdStyleResetConfirmationEnabled={nvdStyleResetConfirmationEnabled}
          onClose={onSettingsClose}
          onDeleteTheme={onDeleteTheme}
          onNvdSaveReminderEnabledChange={onNvdSaveReminderEnabledChange}
          onNvdStyleResetConfirmationEnabledChange={onNvdStyleResetConfirmationEnabledChange}
          onSaveTheme={onSaveTheme}
          onSelectTheme={onSelectTheme}
          onThemeEditorLayoutChange={onThemeEditorLayoutChange}
          onThemeColorChange={onThemeColorChange}
          onThemeNameChange={onThemeNameChange}
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
                  onChange={(event) => onToggleFutureNvdStyleResetConfirmations(event.target.checked)}
                />
                <span>Do not show this again</span>
              </label>
              <p className="text-xs text-muted">You can turn this back on in Settings.</p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={onClearPendingNvdStyleResetRole}
              >
                Cancel
              </button>
              <button
                autoFocus
                className="rounded-sm border border-steel bg-steel px-3 py-1.5 text-sm text-white hover:opacity-90"
                type="button"
                onClick={onConfirmNvdStyleReset}
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
                Unsaved changes to {openedNvdDocumentTitle ?? "this NVD document"} will be lost.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={onCloseNvdCloseConfirmation}
              >
                Cancel
              </button>
              <button
                className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-raised"
                type="button"
                onClick={onCloseActiveNvdDocument}
              >
                Don't Save
              </button>
              <button
                autoFocus
                className="rounded-sm border border-steel bg-steel px-3 py-1.5 text-sm text-white hover:opacity-90"
                disabled={nvdSaveState === "saving"}
                type="button"
                onClick={onSaveAndCloseActiveNvdDocument}
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
            onOpenAddLibraryNodePanel(
              libraryNodeContextMenu.folderId ?? null,
              libraryNodeContextMenu.label,
            )
          }
          onDelete={() => {
            const menu = libraryNodeContextMenu;
            onLibraryNodeContextMenuClose();

            if (menu.target === "asset" && menu.isInventoryDocument && typeof menu.assetId === "number") {
              onDeleteInventoryNvdDocument(menu.assetId);
            } else if (menu.folderId) {
              onDeleteLibraryNode(menu.folderId);
            }
          }}
          onAcceptPlacementSuggestion={(suggestion) => {
            onLibraryNodeContextMenuClose();
            onAssetPlacementSuggestionAccept(suggestion);
          }}
          onOpenNewNode={() => {
            onLibraryNodeContextMenuClose();
            onOpenAddLibraryNodePanel(null, "Master");
          }}
          onRemoveFromNode={() => {
            const menu = libraryNodeContextMenu;
            onLibraryNodeContextMenuClose();

            if (typeof menu.assetId === "number" && menu.assetParentFolderId) {
              onRemoveAssetFromLibraryNode(menu.assetId, menu.assetParentFolderId);
            }
          }}
          onRename={() => {
            const menu = libraryNodeContextMenu;
            onLibraryNodeContextMenuClose();

            if (menu.target === "asset" && menu.isInventoryDocument && typeof menu.assetId === "number") {
              onRenameInventoryNvdDocument(menu.assetId);
            } else if (menu.target === "asset" && typeof menu.assetId === "number") {
              onRenameAssetDisplayName(menu.assetId);
            } else if (menu.folderId) {
              onRenameLibraryNode(menu.folderId);
            }
          }}
          onClose={onLibraryNodeContextMenuClose}
        />
      ) : null}
      {sourceFolderContextMenu ? (
        <SourceFolderContextMenu
          menu={sourceFolderContextMenu}
          onClose={onSourceFolderContextMenuClose}
          onRefresh={() => {
            const sourceId = sourceFolderContextMenu.sourceId;
            onSourceFolderContextMenuClose();
            onRefreshSourceFolder(sourceId);
          }}
          onRemove={() => {
            const sourceId = sourceFolderContextMenu.sourceId;
            onSourceFolderContextMenuClose();
            onRemoveSourceFolder(sourceId);
          }}
        />
      ) : null}
      {addLibraryNodePanel ? (
        <AddLibraryNodePanel
          assets={masterLibraryAssets}
          folders={virtualFolders}
          panel={addLibraryNodePanel}
          templates={libraryNodeTemplates}
          onClose={onAddLibraryNodePanelClose}
          onCreate={onCreateLibraryNode}
        />
      ) : null}
      {isTagBrowserOpen ? (
        <TagLibraryBrowser
          projectTagGroups={projectTagGroups}
          selectedAsset={selectedAsset}
          sections={libraryTagSourceSections}
          tags={libraryTagDefinitions}
          onCreateProjectTag={onCreateProjectTag}
          onCreateProjectTagGroup={onCreateProjectTagGroup}
          onDeleteProjectTagGroup={onDeleteProjectTagGroup}
          onRenameSelectedAsset={onRenameSelectedAsset}
          onAddTag={onTagBrowserAddTag}
          onClose={onTagBrowserClose}
        />
      ) : null}
    </>
  );
}

