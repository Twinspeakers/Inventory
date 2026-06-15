import { tag } from "../../tag";

export const craftedMaterialTags = [
  tag("cardboard", {
    label: "Cardboard",
    parents: ["crafted-material", "paper"],
    implies: ["crafted-material", "paper", "material"],
  }),
  tag("ceramic", {
    label: "Ceramic",
    aliases: ["pottery", "porcelain", "earthenware"],
    parents: ["crafted-material"],
    implies: ["crafted-material", "material"],
  }),
  tag("crafted-material", {
    label: "Crafted Material",
    aliases: ["processed material", "manufactured material"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("glass", {
    label: "Glass",
    aliases: ["crystal"],
    parents: ["crafted-material"],
    implies: ["crafted-material", "material"],
  }),
  tag("paper", {
    label: "Paper",
    aliases: ["paper sheet"],
    parents: ["crafted-material"],
    implies: ["crafted-material", "material"],
  }),
  tag("plastic", {
    label: "Plastic",
    parents: ["crafted-material"],
    implies: ["crafted-material", "material"],
  }),
  tag("rubber", {
    label: "Rubber",
    aliases: ["latex"],
    parents: ["crafted-material"],
    implies: ["crafted-material", "material"],
  }),
];
