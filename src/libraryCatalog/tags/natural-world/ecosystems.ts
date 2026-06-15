import { tag } from "../../tag";

export const ecosystemTags = [
  tag("coastal", {
    label: "Coastal",
    aliases: ["coastline", "seaside environment", "shore environment"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "water"],
    related: ["beach", "island"],
  }),
  tag("ecosystem", {
    label: "Ecosystem",
    aliases: ["biome", "ecoregion", "habitat", "natural region"],
    related: ["terrain", "natural-world"],
  }),
  tag("freshwater", {
    label: "Freshwater",
    aliases: ["inland water", "fresh water habitat"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "water"],
    related: ["river", "lake"],
  }),
  tag("grassland", {
    label: "Grassland",
    aliases: ["prairie", "meadowland"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "grass"],
  }),
  tag("jungle", {
    label: "Jungle",
    aliases: ["tropical forest"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "tree", "plant-life"],
  }),
  tag("marine", {
    label: "Marine",
    aliases: ["ocean habitat", "saltwater habitat"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "water"],
  }),
  tag("polar", {
    label: "Polar",
    aliases: ["arctic", "icy region", "frozen region"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "ice", "snow"],
  }),
  tag("rainforest", {
    label: "Rainforest",
    aliases: ["tropical rainforest"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "tree", "plant-life"],
  }),
  tag("reef", {
    label: "Reef",
    aliases: ["coral reef"],
    parents: ["marine"],
    implies: ["marine", "ecosystem", "water"],
  }),
  tag("savanna", {
    label: "Savanna",
    aliases: ["savannah", "tropical grassland"],
    parents: ["grassland"],
    implies: ["grassland", "ecosystem", "grass"],
  }),
  tag("swamp", {
    label: "Swamp",
    aliases: ["boggy wetland"],
    parents: ["wetland"],
    implies: ["wetland", "ecosystem", "water"],
  }),
  tag("tundra", {
    label: "Tundra",
    aliases: ["treeless plain", "frozen plain"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "snow"],
  }),
  tag("volcanic", {
    label: "Volcanic",
    aliases: ["lava field", "volcanic region"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "volcano", "rock"],
  }),
  tag("wetland", {
    label: "Wetland",
    aliases: ["wetlands", "marshland"],
    parents: ["ecosystem"],
    implies: ["ecosystem", "water"],
  }),
];
