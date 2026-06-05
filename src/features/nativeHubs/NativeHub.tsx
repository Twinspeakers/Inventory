import { FilePlus2, FileText, FolderOpen, PenTool, Shapes } from "lucide-react";

export type NativeHubAsset = {
  extension: string;
  id: number;
  modified: string;
  name: string;
  size: string;
};

export type NativeHubView = "inventory-files" | "inventory-documents" | "inventory-vectors";

export function NativeHub({
  assets,
  onCreateDocument,
  onCreateVector,
  onOpenAsset,
  onSelectHub,
  view,
}: {
  assets: NativeHubAsset[];
  onCreateDocument: () => void;
  onCreateVector: () => void;
  onOpenAsset: (assetId: number) => void;
  onSelectHub: (view: NativeHubView) => void;
  view: NativeHubView;
}) {
  const documents = assets.filter((asset) => asset.extension.toLowerCase() === "nvd");
  const vectors = assets.filter((asset) => asset.extension.toLowerCase() === "nvv");

  if (view === "inventory-files") {
    return (
      <div className="native-hub">
        <header className="native-hub-header">
          <h1>Create something.</h1>
        </header>
        <div className="native-hub-launchers">
          <button className="native-hub-launcher" type="button" onClick={() => onSelectHub("inventory-documents")}>
            <span className="native-hub-launcher-icon native-hub-launcher-write"><FileText size={26} aria-hidden="true" /></span>
            <span><strong>Write</strong><small>Documents</small></span>
          </button>
          <button className="native-hub-launcher" type="button" onClick={() => onSelectHub("inventory-vectors")}>
            <span className="native-hub-launcher-icon native-hub-launcher-draw"><PenTool size={26} aria-hidden="true" /></span>
            <span><strong>Draw</strong><small>Vectors</small></span>
          </button>
        </div>
        <NativeFileSection assets={[...documents, ...vectors].slice(0, 8)} emptyText="Create something in Write or Draw to see it here." onOpenAsset={onOpenAsset} title="Recent Files" />
      </div>
    );
  }

  const isWrite = view === "inventory-documents";
  const nativeAssets = isWrite ? documents : vectors;
  return (
    <div className="native-hub">
      <header className="native-hub-header native-hub-header-compact">
        <h1>{isWrite ? "Write" : "Draw"}</h1>
        <button className="primary-button" type="button" onClick={isWrite ? onCreateDocument : onCreateVector}>
          {isWrite ? <FilePlus2 size={16} aria-hidden="true" /> : <Shapes size={16} aria-hidden="true" />}
          <span>{isWrite ? "New Write Document" : "New Draw Vector"}</span>
        </button>
      </header>
      <NativeFileSection
        assets={nativeAssets}
        emptyText={isWrite ? "Your first Write document can begin with a single line." : "Your first Draw vector can begin with a single shape."}
        onOpenAsset={onOpenAsset}
        title="Recent Files"
      />
    </div>
  );
}

function NativeFileSection({
  assets,
  emptyText,
  onOpenAsset,
  title,
}: {
  assets: NativeHubAsset[];
  emptyText: string;
  onOpenAsset: (assetId: number) => void;
  title: string;
}) {
  return (
    <section className="native-hub-files">
      <div className="native-hub-section-title">
        <h2>{title}</h2>
        <span>{assets.length}</span>
      </div>
      {assets.length > 0 ? (
        <div className="native-hub-grid">
          {assets.map((asset) => {
            const isVector = asset.extension.toLowerCase() === "nvv";
            return (
              <button className="native-hub-file" key={asset.id} type="button" onClick={() => onOpenAsset(asset.id)}>
                <span className={`native-hub-file-preview ${isVector ? "native-hub-file-preview-vector" : ""}`}>
                  {isVector ? <Shapes size={30} aria-hidden="true" /> : <FileText size={30} aria-hidden="true" />}
                </span>
                <span className="native-hub-file-name">{asset.name}</span>
                <span className="native-hub-file-type">{asset.size} / {asset.modified}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="native-hub-empty">
          <FolderOpen size={22} aria-hidden="true" />
          <span>{emptyText}</span>
        </div>
      )}
    </section>
  );
}
