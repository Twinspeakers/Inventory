import { tag } from "../../tag";

export const landscapeTags = [
  tag("beach", {
    label: "Beach",
    aliases: ["shore", "coast", "coastline"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "sand", "water"],
  }),
  tag("cave", {
    label: "Cave",
    aliases: ["cavern", "grotto"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "rock"],
  }),
  tag("desert", {
    label: "Desert",
    aliases: ["dune", "sand"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "sand"],
  }),
  tag("field", {
    label: "Field",
    aliases: ["meadow", "grassland", "plain"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "grass"],
  }),
  tag("forest", {
    label: "Forest",
    aliases: ["woods", "woodland"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "tree"],
  }),
  tag("mountain", {
    label: "Mountain",
    aliases: ["peak", "cliff", "hill"],
    parents: ["landscape", "nature"],
    implies: ["landscape", "nature", "rock"],
  }),
];
