export type ThemeColors = {
  app: string;
  ink: string;
  muted: string;
  graphite: string;
  sidebar: string;
  commandBar: string;
  inspector: string;
  canvas: string;
  surface: string;
  surfaceRaised: string;
  line: string;
  preview: string;
  forest: string;
  copper: string;
  steel: string;
  violet: string;
  amber: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  colors: ThemeColors;
  builtin?: boolean;
};

export type ThemeEditorLayout = "cards" | "list";

export const themeColorKeys = [
  "app",
  "ink",
  "muted",
  "graphite",
  "sidebar",
  "commandBar",
  "inspector",
  "canvas",
  "surface",
  "surfaceRaised",
  "line",
  "preview",
  "forest",
  "copper",
  "steel",
  "violet",
  "amber",
] as const satisfies readonly (keyof ThemeColors)[];

export const themeColorFields: { key: keyof ThemeColors; label: string }[] = [
  { key: "app", label: "App Background" },
  { key: "ink", label: "Main Text" },
  { key: "muted", label: "Muted Text" },
  { key: "graphite", label: "Menu Bar" },
  { key: "sidebar", label: "Library Sidebar" },
  { key: "commandBar", label: "Command Bar" },
  { key: "inspector", label: "Inspector" },
  { key: "canvas", label: "Workspace" },
  { key: "surface", label: "Cards & Inputs" },
  { key: "surfaceRaised", label: "Raised Surfaces" },
  { key: "line", label: "Borders" },
  { key: "preview", label: "Preview Stage" },
  { key: "forest", label: "3D Accent" },
  { key: "copper", label: "Audio Accent" },
  { key: "steel", label: "Image Accent" },
  { key: "violet", label: "Document Accent" },
  { key: "amber", label: "Archive Accent" },
];

export const darkThemeColors: ThemeColors = {
  app: "#121212",
  ink: "#e8e8e8",
  muted: "#a7a7a7",
  graphite: "#141414",
  sidebar: "#1a1a1a",
  commandBar: "#202020",
  inspector: "#202020",
  canvas: "#181818",
  surface: "#242424",
  surfaceRaised: "#303030",
  line: "#454545",
  preview: "#1c1c1c",
  forest: "#5d8868",
  copper: "#c78255",
  steel: "#8a8a8a",
  violet: "#8d7db2",
  amber: "#c79a55",
};

export const lightThemeColors: ThemeColors = {
  app: "#d9dde1",
  ink: "#20242a",
  muted: "#66717e",
  graphite: "#eef1f4",
  sidebar: "#e7ebef",
  commandBar: "#eef0f2",
  inspector: "#eef0f2",
  canvas: "#f7f8f8",
  surface: "#ffffff",
  surfaceRaised: "#f1f3f5",
  line: "#c7ccd1",
  preview: "#eef2f6",
  forest: "#4f6f5a",
  copper: "#b56b3f",
  steel: "#666666",
  violet: "#6f638e",
  amber: "#b88746",
};

export const premadeThemes: ThemeDefinition[] = [
  { id: "light", name: "Light", colors: lightThemeColors, builtin: true },
  { id: "dark", name: "Dark", colors: darkThemeColors, builtin: true },
];
