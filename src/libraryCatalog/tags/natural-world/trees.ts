import { tag } from "../../tag";

export const treeTags = [
  tag("birch-tree", {
    label: "Birch",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("cedar-tree", {
    label: "Cedar",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("cypress-tree", {
    label: "Cypress",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "wetland"],
    matches: ["tree", "wetland", "swamp"],
  }),
  tag("elm-tree", {
    label: "Elm",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("eucalyptus-tree", {
    label: "Eucalyptus",
    aliases: ["gum tree"],
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("log", {
    label: "Log",
    aliases: ["timber"],
    parents: ["tree"],
    implies: ["tree", "wood"],
    matches: ["tree"],
  }),
  tag("mahogany-tree", {
    label: "Mahogany",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "rainforest"],
    matches: ["tree", "rainforest"],
  }),
  tag("mangrove-tree", {
    label: "Mangrove",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "swamp", "coastal"],
    matches: ["tree", "swamp", "wetland", "coastal"],
  }),
  tag("maple-tree", {
    label: "Maple",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("oak-tree", {
    label: "Oak",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("palm-tree", {
    label: "Palm",
    parents: ["tree"],
    implies: ["tree", "plant-life", "coastal", "jungle"],
    matches: ["tree", "coastal", "jungle", "rainforest"],
  }),
  tag("pine-tree", {
    label: "Pine",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("redwood-tree", {
    label: "Redwood",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
  }),
  tag("spruce-tree", {
    label: "Spruce",
    parents: ["tree"],
    implies: ["tree", "plant-life", "wood", "forest"],
    matches: ["tree", "forest"],
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
    implies: ["tree", "plant-life", "wood", "wetland"],
    matches: ["tree", "wetland", "swamp"],
  }),
];
