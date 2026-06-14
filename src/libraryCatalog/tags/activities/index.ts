import type { LibraryTagDefinition } from "../../types";
import { hobbyTags } from "./hobbies";
import { professionTags } from "./professions";
import { skillTags } from "./skills";
import { sportTags } from "./sports";

export { hobbyTags } from "./hobbies";
export { professionTags } from "./professions";
export { skillTags } from "./skills";
export { sportTags } from "./sports";

export const activityTags: LibraryTagDefinition[] = [
  ...hobbyTags,
  ...professionTags,
  ...sportTags,
  ...skillTags,
];
