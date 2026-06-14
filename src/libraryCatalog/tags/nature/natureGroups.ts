import { tag } from "../../tag";

export const natureGroupTags = [
  tag("landscape", {
    label: "Landscape",
    aliases: ["scenery", "vista", "terrain"],
    parents: ["nature"],
    implies: ["nature"],
  }),
  tag("nature", {
    label: "Nature",
    aliases: ["natural", "outdoors", "environment"],
  }),
  tag("plant", {
    label: "Plant",
    aliases: ["flora", "foliage"],
    parents: ["nature"],
    implies: ["nature"],
  }),
];
