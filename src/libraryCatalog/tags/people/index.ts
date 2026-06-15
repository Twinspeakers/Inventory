import { ageGroupTags } from "./age-groups";
import { humanoidTags } from "./humanoids";
import { relationshipTags } from "./relationships";
import { roleTags } from "./roles";

export const peopleTags = [
  ...ageGroupTags,
  ...humanoidTags,
  ...relationshipTags,
  ...roleTags,
];

export { ageGroupTags, humanoidTags, relationshipTags, roleTags };
