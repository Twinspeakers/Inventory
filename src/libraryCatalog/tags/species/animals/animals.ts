import { tag } from "../../../tag";

export const rootAnimalTags = [
  tag("animal", {
    label: "Animal",
    aliases: ["creature", "fauna", "wildlife"],
  }),
  tag("egg", {
    label: "Egg",
    aliases: ["eggshell"],
    parents: ["food", "ingredient"],
    implies: ["food", "ingredient"],
  }),
  tag("feather", {
    label: "Feather",
    aliases: ["plume"],
    parents: ["animal"],
    implies: ["animal"],
  }),
];
