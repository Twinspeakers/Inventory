import { tag } from "../tag";

export const activityTags = [
  tag("fishing", {
    label: "Fishing",
    aliases: ["angling"],
  }),
  tag("woodcutting", {
    label: "Woodcutting",
    aliases: ["wood cutting", "chopping"],
    related: ["wood", "tree", "hatchet"],
  }),
  tag("mining", {
    label: "Mining",
    aliases: ["mine"],
    related: ["rock", "stone", "pickaxe"],
  }),
  tag("metalworking", {
    label: "Metalworking",
    aliases: ["smithing", "blacksmithing"],
    related: ["metal", "anvil", "furnace"],
  }),
];
