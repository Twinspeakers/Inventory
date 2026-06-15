import type { LibraryTagDefinition } from "../../types";
import { celestialTags } from "./celestial";
import { ecosystemTags } from "./ecosystems";
import { flowerTags } from "./flowers";
import { foliageTags } from "./foliage";
import { rockTags } from "./rocks";
import { terrainTags } from "./terrain";
import { treeTags } from "./trees";

export const naturalWorldTags: LibraryTagDefinition[] = [
  ...celestialTags,
  ...ecosystemTags,
  ...flowerTags,
  ...foliageTags,
  ...rockTags,
  ...terrainTags,
  ...treeTags,
];

export {
  celestialTags,
  ecosystemTags,
  flowerTags,
  foliageTags,
  rockTags,
  terrainTags,
  treeTags,
};
