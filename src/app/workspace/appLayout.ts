import type { PointerEvent as ReactPointerEvent } from "react";
import {
  defaultDetailsColumnWidths,
  detailsColumnKeys,
  detailsColumnMaxWidths,
  detailsColumnMinWidths,
  type AssetSortKey,
  type AssetViewMode,
  type DetailsColumnKey,
  type DetailsColumnWidths,
  type SortDirection,
} from "../../features/assetShelf";
import type { ModelTransform } from "../../sceneReaders/threeModelReader";

export const DEFAULT_LEFT_PANE_WIDTH = 310;
export const MIN_LEFT_PANE_WIDTH = 220;
export const MAX_LEFT_PANE_WIDTH = 560;
export const DEFAULT_RIGHT_PANE_WIDTH = 360;
export const MIN_RIGHT_PANE_WIDTH = 260;
export const MAX_RIGHT_PANE_WIDTH = 560;
export const COLLAPSED_SIDE_PANE_WIDTH = 40;
export const MIN_MAIN_PANE_WIDTH = 520;
export const DEFAULT_SOURCE_SECTION_HEIGHT = 170;
export const MIN_SOURCE_SECTION_HEIGHT = 96;
export const MAX_SOURCE_SECTION_HEIGHT = 320;

export const layoutStorageKeys = {
  leftPaneWidth: "inventory.layout.leftPaneWidth",
  leftPaneCollapsed: "inventory.layout.leftPaneCollapsed",
  rightPaneWidth: "inventory.layout.rightPaneWidth",
  rightPaneCollapsed: "inventory.layout.rightPaneCollapsed",
  assetShelfHeight: "inventory.layout.assetShelfHeight",
  assetShelfCollapsed: "inventory.layout.assetShelfCollapsed",
  sourceSectionCollapsed: "inventory.layout.sourceSectionCollapsed",
  sourceSectionHeight: "inventory.layout.sourceSectionHeight",
  treeOpenNodeIds: "inventory.layout.treeOpenNodeIds",
};

export const assetShelfStorageKeys = {
  detailsColumnWidths: "inventory.assetShelf.detailsColumnWidths",
  sortDirection: "inventory.assetShelf.sortDirection",
  sortKey: "inventory.assetShelf.sortKey",
  viewMode: "inventory.assetShelf.viewMode",
};

export const projectStorageKeys = {
  activeInventoryManifestPath: "inventory.project.activeInventoryManifestPath",
};

export const layoutResizeEndEvent = "inventory:layout-resize-end";
export const defaultTreeOpenNodeIds = new Set(["library", "inventory-files", "inventory-documents", "inventory-vectors"]);

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function readStoredNumber(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);

    if (storedValue === null) {
      return fallback;
    }

    const value = Number(storedValue);
    return Number.isFinite(value) ? clamp(value, min, max) : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredOptionalNumber(key: string, min: number) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return null;
    }

    const value = Number(storedValue);
    return Number.isFinite(value) ? Math.max(value, min) : null;
  } catch {
    return null;
  }
}

export function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

export function storeNumber(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(Math.round(value)));
  } catch {
    // Layout persistence is a convenience; the app should keep working without it.
  }
}

export function removeStoredNumber(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Layout persistence is a convenience; the app should keep working without it.
  }
}

export function isPrimaryPointer(event: ReactPointerEvent<HTMLElement>) {
  return event.isPrimary && (event.pointerType !== "mouse" || event.button === 0);
}

export function getWorkspaceGridWidth(element: HTMLDivElement | null) {
  return element?.getBoundingClientRect().width ?? window.innerWidth;
}

export function isLayoutResizeInProgress() {
  return document.body.classList.contains("is-resizing-pane") || document.body.classList.contains("is-resizing-row");
}

export function readStoredAssetSortKey(): AssetSortKey {
  if (typeof window === "undefined") {
    return "name";
  }

  const value = window.localStorage.getItem(assetShelfStorageKeys.sortKey);
  return isAssetSortKey(value) ? value : "name";
}

export function readStoredSortDirection(): SortDirection {
  if (typeof window === "undefined") {
    return "asc";
  }

  return window.localStorage.getItem(assetShelfStorageKeys.sortDirection) === "desc" ? "desc" : "asc";
}

export function readStoredAssetViewMode(): AssetViewMode {
  if (typeof window === "undefined") {
    return "medium";
  }

  const value = window.localStorage.getItem(assetShelfStorageKeys.viewMode);
  return normalizeAssetViewMode(value);
}

export function readStoredDetailsColumnWidths(): DetailsColumnWidths {
  if (typeof window === "undefined") {
    return defaultDetailsColumnWidths;
  }

  try {
    const rawWidths = JSON.parse(window.localStorage.getItem(assetShelfStorageKeys.detailsColumnWidths) ?? "{}");
    return normalizeDetailsColumnWidths(rawWidths);
  } catch {
    return defaultDetailsColumnWidths;
  }
}

export function normalizeDetailsColumnWidths(value: unknown): DetailsColumnWidths {
  if (!value || typeof value !== "object") {
    return defaultDetailsColumnWidths;
  }

  return detailsColumnKeys.reduce<DetailsColumnWidths>((widths, columnKey) => {
    const rawWidth = (value as Partial<Record<DetailsColumnKey, unknown>>)[columnKey];
    const width = typeof rawWidth === "number" && Number.isFinite(rawWidth) ? rawWidth : defaultDetailsColumnWidths[columnKey];
    widths[columnKey] = clamp(width, detailsColumnMinWidths[columnKey], detailsColumnMaxWidths[columnKey]);
    return widths;
  }, { ...defaultDetailsColumnWidths });
}

export function normalizeModelTransformOverrides(value: unknown): Record<string, ModelTransform> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, ModelTransform>>((overrides, [key, rawTransform]) => {
    const transform = normalizeModelTransform(rawTransform);

    if (transform) {
      overrides[key] = transform;
    }

    return overrides;
  }, {});
}

export function storeString(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is a convenience; the live app can continue without it.
  }
}

export function readStoredString(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeStoredString(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Persistence is a convenience; the live app can continue without it.
  }
}

export function readStoredStringSet(key: string, fallback: Set<string>) {
  if (typeof window === "undefined") {
    return new Set(fallback);
  }

  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return new Set(fallback);
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return new Set(fallback);
    }

    return new Set(parsedValue.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set(fallback);
  }
}

export function storeStringSet(key: string, values: Set<string>) {
  storeString(key, JSON.stringify([...values]));
}

function normalizeModelTransform(value: unknown): ModelTransform | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const transform = value as Partial<Record<keyof ModelTransform, unknown>>;
  const position = normalizeModelVector3(transform.position);
  const rotation = normalizeModelVector3(transform.rotation);
  const scale = normalizeModelVector3(transform.scale);

  return position && rotation && scale ? { position, rotation, scale } : null;
}

function normalizeModelVector3(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const vector = value as Partial<Record<"x" | "y" | "z", unknown>>;

  if (![vector.x, vector.y, vector.z].every((axis) => typeof axis === "number" && Number.isFinite(axis))) {
    return null;
  }

  return { x: vector.x as number, y: vector.y as number, z: vector.z as number };
}

export function isAssetSortKey(value: string | null): value is AssetSortKey {
  return value === "name" || value === "type" || value === "modified" || value === "size";
}

export function isAssetViewMode(value: string | null): value is AssetViewMode {
  return value === "extra-large" || value === "large" || value === "medium" || value === "details";
}

export function normalizeAssetViewMode(value: string | null | undefined): AssetViewMode {
  if (value === "large") {
    return "extra-large";
  }

  const normalizedValue = value ?? null;
  return isAssetViewMode(normalizedValue) ? normalizedValue : "medium";
}

