import type { LibraryTagDefinition } from "../../types";
import { landscapeTags } from "./landscapes";
import { naturalObjectTags } from "./naturalObjects";
import { natureGroupTags } from "./natureGroups";
import { plantTags } from "./plants";
import { skyWeatherWaterTags } from "./skyWeatherWater";

export const natureTags: LibraryTagDefinition[] = [
  ...natureGroupTags,
  ...landscapeTags,
  ...naturalObjectTags,
  ...plantTags,
  ...skyWeatherWaterTags,
];
