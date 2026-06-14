import { tag } from "../../tag";

export const biomeTags = [
  tag("aquatic-biome", {
    label: "Aquatic",
    aliases: ["water environment", "marine environment"],
    parents: ["biome"],
    implies: ["biome", "water"],
  }),
  tag("biome", {
    label: "Biome",
    aliases: ["ecoregion", "natural environment"],
    related: ["nature", "landscape"],
  }),
  tag("cave-biome", {
    label: "Cave",
    aliases: ["subterranean environment", "underground environment"],
    parents: ["biome"],
    implies: ["biome", "cave"],
  }),
  tag("coastal-biome", {
    label: "Coastal",
    aliases: ["coastline", "seaside environment"],
    parents: ["biome"],
    implies: ["biome", "water"],
    related: ["beach", "ocean"],
  }),
  tag("desert-biome", {
    label: "Desert",
    aliases: ["arid environment", "drylands"],
    parents: ["biome"],
    implies: ["biome", "sand"],
  }),
  tag("forest-biome", {
    label: "Forest",
    aliases: ["woodland", "forest environment"],
    parents: ["biome"],
    implies: ["biome", "tree"],
  }),
  tag("grassland-biome", {
    label: "Grassland",
    aliases: ["prairie", "meadow"],
    parents: ["biome"],
    implies: ["biome", "grass"],
  }),
  tag("jungle-biome", {
    label: "Jungle",
    aliases: ["rainforest", "tropical forest"],
    parents: ["forest-biome"],
    implies: ["forest-biome", "biome", "tree"],
  }),
  tag("mountain-biome", {
    label: "Mountain",
    aliases: ["alpine environment", "highland"],
    parents: ["biome"],
    implies: ["biome", "mountain"],
  }),
  tag("savanna-biome", {
    label: "Savanna",
    aliases: ["savannah", "tropical grassland"],
    parents: ["grassland-biome"],
    implies: ["grassland-biome", "biome", "grass"],
  }),
  tag("swamp-biome", {
    label: "Swamp",
    aliases: ["marsh", "bog"],
    parents: ["wetland-biome"],
    implies: ["wetland-biome", "biome", "water"],
  }),
  tag("tundra-biome", {
    label: "Tundra",
    aliases: ["arctic environment", "frozen environment"],
    parents: ["biome"],
    implies: ["biome", "snow"],
  }),
  tag("urban-biome", {
    label: "Urban",
    aliases: ["city habitat", "urban habitat"],
    parents: ["biome"],
    implies: ["biome", "urban-environment"],
  }),
  tag("wetland-biome", {
    label: "Wetland",
    aliases: ["wetlands", "marshland"],
    parents: ["biome"],
    implies: ["biome", "water"],
  }),
];
