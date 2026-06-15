import { tag } from "../../tag";

export const toolTags = [
  tag("tool", {
    label: "Tool",
    aliases: ["equipment", "gear"],
  }),
  tag("fishing-rod", {
    label: "Fishing Rod",
    aliases: ["rod", "fishing pole"],
    parents: ["tool"],
    implies: ["tool", "fishing"],
  }),
  tag("hammer", {
    label: "Hammer",
    aliases: ["mallet"],
    parents: ["tool"],
    implies: ["tool", "metalworking"],
  }),
  tag("hatchet", {
    label: "Hatchet",
    aliases: ["axe"],
    parents: ["tool"],
    implies: ["tool", "woodcutting"],
  }),
  tag("hoe", {
    label: "Hoe",
    aliases: ["garden hoe", "farming hoe"],
    parents: ["tool"],
    implies: ["tool", "farming"],
  }),
  tag("pickaxe", {
    label: "Pickaxe",
    aliases: ["pick"],
    parents: ["tool"],
    implies: ["tool", "mining"],
  }),
  tag("rake", {
    label: "Rake",
    aliases: ["garden rake", "leaf rake"],
    parents: ["tool"],
    implies: ["tool", "farming"],
  }),
  tag("rope", {
    label: "Rope",
    aliases: ["cord", "line"],
    parents: ["tool"],
    implies: ["tool"],
  }),
  tag("shovel", {
    label: "Shovel",
    aliases: ["spade"],
    parents: ["tool"],
    implies: ["tool", "digging"],
  }),
  tag("step-ladder", {
    label: "Step Ladder",
    aliases: ["ladder"],
    parents: ["tool"],
    implies: ["tool", "prop"],
  }),
];
