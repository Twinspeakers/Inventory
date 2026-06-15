import { tag } from "../../tag";

export const treeTags = [
  tag("birch-tree", {
    label: "Birch",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("cedar-tree", {
    label: "Cedar",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("cypress-tree", {
    label: "Cypress",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("elm-tree", {
    label: "Elm",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("eucalyptus-tree", {
    label: "Eucalyptus",
    aliases: ["gum tree"],
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("log", {
    label: "Log",
    aliases: ["timber"],
    parents: ["tree"],
    implies: ["tree", "wood"],
  }),
  tag("mahogany-tree", {
    label: "Mahogany",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("maple-tree", {
    label: "Maple",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("oak-tree", {
    label: "Oak",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("palm-tree", {
    label: "Palm",
    parents: ["tree"],
    implies: ["tree", "plant-life"],
  }),
  tag("pine-tree", {
    label: "Pine",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("redwood-tree", {
    label: "Redwood",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("spruce-tree", {
    label: "Spruce",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
  tag("tree", {
    label: "Tree",
    aliases: ["trunk", "woody plant"],
    parents: ["plant-life"],
    implies: ["plant-life", "wood"],
  }),
  tag("willow-tree", {
    label: "Willow",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood"],
  }),
];
