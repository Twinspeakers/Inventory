import { tag } from "../../tag";

export const flowerTags = [
  tag("cherry-blossom", {
    label: "Cherry Blossom",
    aliases: ["sakura"],
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("daisy", {
    label: "Daisy",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("flower", {
    label: "Flower",
    aliases: ["blossom", "bloom"],
    parents: ["plant-life"],
    implies: ["plant-life"],
  }),
  tag("hibiscus", {
    label: "Hibiscus",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("lavender", {
    label: "Lavender",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("lily", {
    label: "Lily",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("lotus", {
    label: "Lotus",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("orchid", {
    label: "Orchid",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("rose", {
    label: "Rose",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("sunflower", {
    label: "Sunflower",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("tulip", {
    label: "Tulip",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
  tag("wildflower", {
    label: "Wildflower",
    parents: ["flower"],
    implies: ["flower", "plant-life"],
  }),
];
