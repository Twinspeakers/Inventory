import { tag } from "../../../tag";

export const accessoryTags = [
  tag("accessory", {
    label: "Accessory",
    aliases: ["fashion accessory"],
    parents: ["clothing"],
    implies: ["clothing", "prop"],
  }),
  tag("belt", {
    label: "Belt",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
  tag("bracelet", {
    label: "Bracelet",
    parents: ["jewellery"],
    implies: ["jewellery", "accessory", "clothing", "prop"],
  }),
  tag("earrings", {
    label: "Earrings",
    parents: ["jewellery"],
    implies: ["jewellery", "accessory", "clothing", "prop"],
  }),
  tag("handbag", {
    label: "Handbag",
    aliases: ["purse"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
  tag("jewellery", {
    label: "Jewellery",
    aliases: ["jewelry"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
  tag("necklace", {
    label: "Necklace",
    parents: ["jewellery"],
    implies: ["jewellery", "accessory", "clothing", "prop"],
  }),
  tag("ring", {
    label: "Ring",
    parents: ["jewellery"],
    implies: ["jewellery", "accessory", "clothing", "prop"],
  }),
  tag("scarf", {
    label: "Scarf",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
  tag("tie", {
    label: "Tie",
    aliases: ["necktie"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
  tag("watch", {
    label: "Watch",
    aliases: ["wristwatch"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
];
