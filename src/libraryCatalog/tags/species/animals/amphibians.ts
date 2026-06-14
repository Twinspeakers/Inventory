import { tag } from "../../../tag";

export const amphibianTags = [
  tag("amphibian", {
    label: "Amphibian",
    aliases: ["frog", "toad", "salamander", "newt"],
    parents: ["animal", "water"],
    implies: ["animal", "water"],
  }),
  tag("frog", {
    label: "Frog",
    aliases: ["toad", "tadpole"],
    parents: ["amphibian"],
    implies: ["amphibian", "animal", "water"],
  }),
  tag("salamander", {
    label: "Salamander",
    aliases: ["newt", "axolotl"],
    parents: ["amphibian"],
    implies: ["amphibian", "animal", "water"],
  }),
];
