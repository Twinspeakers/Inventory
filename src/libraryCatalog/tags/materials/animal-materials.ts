import { tag } from "../../tag";

export const animalMaterialTags = [
  tag("animal-material", {
    label: "Animal Material",
    aliases: ["animal product material"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("bone", {
    label: "Bone",
    aliases: ["ivory"],
    parents: ["animal-material"],
    implies: ["animal-material", "material"],
  }),
  tag("fur", {
    label: "Fur",
    aliases: ["pelt"],
    parents: ["animal-material"],
    implies: ["animal-material", "material"],
  }),
  tag("leather", {
    label: "Leather",
    aliases: ["hide"],
    parents: ["animal-material"],
    implies: ["animal-material", "material"],
  }),
  tag("wax", {
    label: "Wax",
    aliases: ["beeswax"],
    parents: ["animal-material"],
    implies: ["animal-material", "material"],
  }),
];
