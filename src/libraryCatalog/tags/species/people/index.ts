import { ethnicityTags } from "./ethnicities";
import { genderTags } from "./genders";
import { humanoidTags } from "./humanoids";

export const peopleTags = [
  ...humanoidTags,
  ...ethnicityTags,
  ...genderTags,
];

export { ethnicityTags, genderTags, humanoidTags };
