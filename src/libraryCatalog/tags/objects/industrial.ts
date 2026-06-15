import { tag } from "../../tag";

export const industrialTags = [
  tag("industrial-item", {
    label: "Industrial Item",
    aliases: ["workshop item", "factory item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("anvil", {
    label: "Anvil",
    parents: ["crafting-station", "industrial-item"],
    implies: ["crafting-station", "industrial-item", "prop", "metalworking"],
  }),
  tag("crafting-station", {
    label: "Crafting Station",
    aliases: ["workstation", "skill station", "station"],
    parents: ["industrial-item"],
    implies: ["industrial-item", "prop"],
  }),
  tag("furnace", {
    label: "Furnace",
    aliases: ["forge", "smelter"],
    parents: ["crafting-station", "industrial-item"],
    implies: ["crafting-station", "industrial-item", "prop", "metalworking"],
  }),
  tag("range", {
    label: "Range",
    aliases: ["stove", "oven"],
    parents: ["crafting-station"],
    implies: ["crafting-station", "industrial-item", "prop", "cooking"],
  }),
  tag("workbench", {
    label: "Workbench",
    parents: ["crafting-station", "industrial-item"],
    implies: ["crafting-station", "industrial-item", "prop", "wood"],
  }),
];
