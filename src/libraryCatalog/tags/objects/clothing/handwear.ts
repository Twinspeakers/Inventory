import { tag } from "../../../tag";

export const handwearTags = [
  tag("gloves", {
    label: "Gloves",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
];
