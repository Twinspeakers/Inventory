import type { LibraryTagDefinition } from "../types";
import { activityTags } from "./activityTags";
import { foodTags } from "./foodTags";
import { lifeTags } from "./lifeTags";
import { materialTags } from "./materialTags";
import { objectTags } from "./objectTags";
import { placeTags } from "./placeTags";
import { styleTags } from "./styleTags";
import { systemTags } from "./systemTags";

export const libraryTagDefinitions: LibraryTagDefinition[] = [
  ...systemTags,
  ...lifeTags,
  ...foodTags,
  ...materialTags,
  ...activityTags,
  ...objectTags,
  ...placeTags,
  ...styleTags,
];
