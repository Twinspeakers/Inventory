import { createBundledHighlighter, createSingletonShorthands } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

export type InventoryCodeTheme = "github-dark" | "github-light";

type InventoryCodeLanguage = keyof typeof inventoryCodeLanguages;
type InventoryHighlightLanguage = InventoryCodeLanguage | "text";

const inventoryCodeLanguages = {
  bash: () => import("@shikijs/langs/bash"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  css: () => import("@shikijs/langs/css"),
  gdscript: () => import("@shikijs/langs/gdscript"),
  go: () => import("@shikijs/langs/go"),
  html: () => import("@shikijs/langs/html"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  markdown: () => import("@shikijs/langs/markdown"),
  powershell: () => import("@shikijs/langs/powershell"),
  python: () => import("@shikijs/langs/python"),
  rust: () => import("@shikijs/langs/rust"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
};

const inventoryCodeThemes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
};

const createInventoryHighlighter = createBundledHighlighter({
  engine: () => createJavaScriptRegexEngine(),
  langs: inventoryCodeLanguages,
  themes: inventoryCodeThemes,
});

const { codeToHtml } = createSingletonShorthands(createInventoryHighlighter);

export function highlightMarkdownCode(code: string, language: string, theme: InventoryCodeTheme) {
  return codeToHtml(code, {
    lang: normalizeInventoryCodeLanguage(language),
    theme,
  });
}

function normalizeInventoryCodeLanguage(language: string): InventoryHighlightLanguage {
  const normalized = language.toLowerCase();

  switch (normalized) {
    case "bat":
    case "cmd":
    case "sh":
    case "shell":
      return "bash";
    case "cs":
      return "csharp";
    case "htm":
      return "html";
    case "js":
      return "javascript";
    case "md":
      return "markdown";
    case "ps":
    case "ps1":
      return "powershell";
    case "py":
      return "python";
    case "rs":
      return "rust";
    case "ts":
      return "typescript";
    case "txt":
    case "plaintext":
      return "text";
    case "yml":
      return "yaml";
    default:
      return isInventoryCodeLanguage(normalized) ? normalized : "text";
  }
}

function isInventoryCodeLanguage(language: string): language is InventoryCodeLanguage {
  return language in inventoryCodeLanguages;
}
