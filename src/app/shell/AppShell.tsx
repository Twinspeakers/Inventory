import type {
  ComponentProps,
  CSSProperties,
  Ref,
} from "react";
import { AppOverlays } from "./AppOverlays";
import { MainWorkspace } from "./MainWorkspace";
import { MenuBar } from "./MenuBar";
import { LibraryStructure } from "./LibraryStructure";
import { Inspector } from "./inspector";
import type { AssetPlacementSuggestion } from "../appTypes";

type AppShellInspectorProps = Omit<
  ComponentProps<typeof Inspector>,
  "assetPlacementSuggestions" | "onAssetPlacementSuggestionAccept"
> & {
  assetPlacementSuggestions: AssetPlacementSuggestion[];
  onAssetPlacementSuggestionAccept: (suggestion: AssetPlacementSuggestion) => void;
};

type AppShellProps = {
  inspector: AppShellInspectorProps;
  libraryStructure: ComponentProps<typeof LibraryStructure>;
  mainWorkspace: ComponentProps<typeof MainWorkspace>;
  menuBar: ComponentProps<typeof MenuBar>;
  overlays: ComponentProps<typeof AppOverlays>;
  themeStyle: CSSProperties;
  workspaceGridRef: Ref<HTMLDivElement>;
  workspaceGridStyle: CSSProperties;
};

export function AppShell({
  inspector,
  libraryStructure,
  mainWorkspace,
  menuBar,
  overlays,
  themeStyle,
  workspaceGridRef,
  workspaceGridStyle,
}: AppShellProps) {
  return (
    <main className="h-screen overflow-hidden bg-app text-ink" style={themeStyle}>
      <div className="flex h-full flex-col">
        <MenuBar {...menuBar} />
        <div className="grid min-h-0 flex-1 overflow-hidden" ref={workspaceGridRef} style={workspaceGridStyle}>
          <LibraryStructure {...libraryStructure} />
          <MainWorkspace {...mainWorkspace} />
          <Inspector {...inspector} />
        </div>
      </div>
      <AppOverlays {...overlays} />
    </main>
  );
}

