import { tag } from "../../tag";

export const terrainTags = [
  tag("beach", {
    label: "Beach",
    aliases: ["shore", "coast", "coastline"],
    parents: ["terrain"],
    implies: ["terrain", "sand", "water"],
  }),
  tag("cave", {
    label: "Cave",
    aliases: ["cavern", "grotto"],
    parents: ["terrain"],
    implies: ["terrain", "rock"],
  }),
  tag("canyon", {
    label: "Canyon",
    aliases: ["gorge", "ravine"],
    parents: ["terrain"],
    implies: ["terrain", "rock"],
  }),
  tag("desert", {
    label: "Desert",
    aliases: ["dune", "sand"],
    parents: ["terrain"],
    implies: ["terrain", "sand"],
  }),
  tag("field", {
    label: "Field",
    aliases: ["meadow", "grassland", "plain"],
    parents: ["terrain"],
    implies: ["terrain", "grass"],
  }),
  tag("forest", {
    label: "Forest",
    aliases: ["woods", "woodland"],
    parents: ["terrain"],
    implies: ["terrain", "tree"],
  }),
  tag("glacier", {
    label: "Glacier",
    aliases: ["ice field"],
    parents: ["terrain"],
    implies: ["terrain", "ice"],
  }),
  tag("island", {
    label: "Island",
    aliases: ["isle"],
    parents: ["terrain"],
    implies: ["terrain", "water"],
  }),
  tag("lake", {
    label: "Lake",
    aliases: ["lagoon"],
    parents: ["terrain"],
    implies: ["terrain", "water"],
  }),
  tag("mountain", {
    label: "Mountain",
    aliases: ["peak", "cliff", "hill"],
    parents: ["terrain"],
    implies: ["terrain", "rock"],
  }),
  tag("river", {
    label: "River",
    aliases: ["stream", "creek"],
    parents: ["terrain"],
    implies: ["terrain", "water"],
  }),
  tag("terrain", {
    label: "Terrain",
    aliases: ["landscape", "landform", "scenery"],
  }),
  tag("valley", {
    label: "Valley",
    aliases: ["basin"],
    parents: ["terrain"],
    implies: ["terrain"],
  }),
  tag("volcano", {
    label: "Volcano",
    aliases: ["volcanic mountain"],
    parents: ["terrain"],
    implies: ["terrain", "rock", "fire"],
  }),
  tag("waterfall", {
    label: "Waterfall",
    aliases: ["falls", "cascade"],
    parents: ["terrain"],
    implies: ["terrain", "water"],
  }),
];
