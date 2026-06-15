import type { LibraryTagDefinition } from "../../types";
import { hobbyTags } from "./hobbies";
import { skillTags } from "./skills";
import { sportTags } from "./sports";

export { hobbyTags } from "./hobbies";
export { skillTags } from "./skills";
export { sportTags } from "./sports";

export const activityTags: LibraryTagDefinition[] = [
  ...hobbyTags,
  ...sportTags,
  ...skillTags,
];
