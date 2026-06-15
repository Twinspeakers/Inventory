import { tag } from "../../../tag";

export const headwearTags = [
  tag("beanie", {
    label: "Beanie",
    aliases: ["knit cap"],
    parents: ["hat"],
    implies: ["hat", "accessory", "clothing", "prop", "fabric"],
  }),
  tag("hat", {
    label: "Hat",
    aliases: ["cap", "helmet", "headwear"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
];
