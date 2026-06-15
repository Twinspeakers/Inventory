import { tag } from "../../../tag";

export const bottomTags = [
  tag("jeans", {
    label: "Jeans",
    aliases: ["denim jeans"],
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
  tag("leggings", {
    label: "Leggings",
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
  tag("pants", {
    label: "Pants",
    aliases: ["trousers"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("shorts", {
    label: "Shorts",
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
  tag("skirt", {
    label: "Skirt",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("sweatpants", {
    label: "Sweatpants",
    aliases: ["track pants", "joggers"],
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
];
