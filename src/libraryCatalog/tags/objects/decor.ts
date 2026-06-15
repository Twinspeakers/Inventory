import { tag } from "../../tag";

export const decorTags = [
  tag("decor-item", {
    label: "Decor Item",
    aliases: ["decor", "decoration"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("candle", {
    label: "Candle",
    aliases: ["wax candle"],
    parents: ["lighting", "decor-item"],
    implies: ["lighting", "decor-item", "prop"],
  }),
  tag("curtain", {
    label: "Curtain",
    aliases: ["drape", "drapes"],
    parents: ["decor-item"],
    implies: ["decor-item", "prop", "fabric"],
  }),
  tag("fireplace", {
    label: "Fireplace",
    aliases: ["hearth"],
    parents: ["lighting", "decor-item", "building"],
    implies: ["lighting", "decor-item", "prop", "fire", "building"],
  }),
  tag("lantern", {
    label: "Lantern",
    aliases: ["lamp", "light"],
    parents: ["lighting"],
    implies: ["lighting", "prop"],
  }),
  tag("lighting", {
    label: "Lighting",
    aliases: ["light", "illumination"],
    parents: ["decor-item"],
    implies: ["decor-item", "prop"],
  }),
  tag("rug", {
    label: "Rug",
    aliases: ["carpet", "mat"],
    parents: ["decor-item"],
    implies: ["decor-item", "prop", "fabric"],
  }),
  tag("torch", {
    label: "Torch",
    parents: ["lighting"],
    implies: ["lighting", "prop", "fire"],
  }),
  tag("vase", {
    label: "Vase",
    aliases: ["flower vase", "urn"],
    parents: ["decor-item"],
    implies: ["decor-item", "prop", "ceramic"],
  }),
];
