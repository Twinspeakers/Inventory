import { ageGroupTags } from "./age-groups";
import { depictionTags } from "./depiction";
import { humanoidTags } from "./humanoids";
import { relationshipTags } from "./relationships";
import { roleTags } from "./roles";

export const peopleTags = [
  ...ageGroupTags,
  ...depictionTags,
  ...humanoidTags,
  ...relationshipTags,
  ...roleTags,
];

export { ageGroupTags, depictionTags, humanoidTags, relationshipTags, roleTags };
