import { tag } from "../../tag";

export const toolTags = [
  tag("tool", {
    label: "Tool",
    aliases: ["equipment", "gear", "hand tool", "utility item"],
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
  tag("pliers", {
    label: "Pliers",
    aliases: ["tongs", "grips"],
    parents: ["tool"],
    implies: ["tool", "metalworking"],
  }),
  tag("rake", {
    label: "Rake",
    aliases: ["garden rake", "leaf rake"],
    parents: ["tool"],
    implies: ["tool", "farming"],
  }),
  tag("rope", {
    label: "Rope",
    aliases: ["cord", "line", "cable rope"],
    parents: ["tool"],
    implies: ["tool"],
  }),
  tag("saw", {
    label: "Saw",
    aliases: ["handsaw", "hand saw", "wood saw"],
    parents: ["tool"],
    implies: ["tool", "woodcutting"],
  }),
  tag("shovel", {
    label: "Shovel",
    aliases: ["spade"],
    parents: ["tool"],
    implies: ["tool", "digging"],
  }),
  tag("screwdriver", {
    label: "Screwdriver",
    aliases: ["driver", "philips", "phillips", "flathead", "flat head"],
    parents: ["tool"],
    implies: ["tool"],
  }),
  tag("step-ladder", {
    label: "Step Ladder",
    aliases: ["ladder", "stepladder", "step stool"],
    parents: ["tool"],
    implies: ["tool", "prop"],
  }),
  tag("wrench", {
    label: "Wrench",
    aliases: ["spanner", "socket wrench", "monkey wrench"],
    parents: ["tool"],
    implies: ["tool", "metalworking"],
  }),
];
