export type InspectorAssetType = "Image" | "3D" | "Audio" | "Document" | "Archive";

export type InspectorAsset = {
  defaultKeptTags: string[];
  extension: string;
  id: number;
  keptTags: string[];
  modified: string;
  name: string;
  notes: string;
  path: string;
  size: string;
  systemTags: string[];
  type: InspectorAssetType;
  userTags: string[];
};
