import { tag } from "../tag";

export const objectTags = [
  tag("prop", {
    label: "Prop",
    aliases: ["set dressing", "decor"],
  }),
  tag("tool", {
    label: "Tool",
    aliases: ["equipment", "gear"],
  }),
  tag("hatchet", {
    label: "Hatchet",
    aliases: ["axe"],
    parents: ["tool"],
    implies: ["tool", "woodcutting"],
  }),
  tag("pickaxe", {
    label: "Pickaxe",
    aliases: ["pick"],
    parents: ["tool"],
    implies: ["tool", "mining"],
  }),
  tag("fishing-rod", {
    label: "Fishing Rod",
    aliases: ["rod", "fishing pole"],
    parents: ["tool"],
    implies: ["tool", "fishing"],
  }),
  tag("crafting-station", {
    label: "Crafting Station",
    aliases: ["workstation", "skill station", "station"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("lighting", {
    label: "Lighting",
    aliases: ["light", "illumination"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("anvil", {
    label: "Anvil",
    parents: ["crafting-station"],
    implies: ["crafting-station", "prop", "metalworking"],
  }),
  tag("furnace", {
    label: "Furnace",
    aliases: ["forge", "smelter"],
    parents: ["crafting-station"],
    implies: ["crafting-station", "prop", "metalworking"],
  }),
  tag("range", {
    label: "Range",
    aliases: ["stove", "oven"],
    parents: ["crafting-station"],
    implies: ["crafting-station", "prop", "cooking"],
  }),
  tag("lantern", {
    label: "Lantern",
    aliases: ["lamp", "light"],
    parents: ["lighting"],
    implies: ["lighting", "prop"],
  }),
];
