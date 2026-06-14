import { tag } from "../../tag";

export const plantTags = [
  tag("bush", {
    label: "Bush",
    aliases: ["shrub", "hedge"],
    parents: ["plant"],
    implies: ["plant", "nature"],
  }),
  tag("crop", {
    label: "Crop",
    aliases: ["crops", "harvest"],
    parents: ["plant", "ingredient"],
    implies: ["plant", "ingredient", "food", "farm"],
  }),
  tag("flower", {
    label: "Flower",
    aliases: ["blossom", "bloom"],
    parents: ["plant"],
    implies: ["plant", "nature"],
  }),
  tag("grass", {
    label: "Grass",
    aliases: ["lawn"],
    parents: ["plant"],
    implies: ["plant", "nature"],
  }),
  tag("tree", {
    label: "Tree",
    aliases: ["sapling", "trunk"],
    parents: ["plant", "nature"],
    implies: ["plant", "nature", "wood"],
  }),
];
