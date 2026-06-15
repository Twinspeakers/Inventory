import { tag } from "../../tag";

export const relationshipTags = [
  tag("acquaintance", {
    label: "Acquaintance",
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("offspring", {
    label: "Offspring",
    aliases: ["child"],
    parents: ["family-relationship"],
    implies: ["family-relationship", "relationship", "person"],
  }),
  tag("couple", {
    label: "Couple",
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("family", {
    label: "Family",
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("family-relationship", {
    label: "Family Relationship",
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("friend", {
    label: "Friend",
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("parent", {
    label: "Parent",
    aliases: ["mother", "father", "guardian"],
    parents: ["family-relationship"],
    implies: ["family-relationship", "relationship", "person"],
  }),
  tag("partner", {
    label: "Partner",
    aliases: ["spouse", "significant other"],
    parents: ["relationship"],
    implies: ["relationship", "person"],
  }),
  tag("relationship", {
    label: "Relationship",
    aliases: ["social bond", "connection"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("sibling", {
    label: "Sibling",
    aliases: ["brother", "sister"],
    parents: ["family-relationship"],
    implies: ["family-relationship", "relationship", "person"],
  }),
];
