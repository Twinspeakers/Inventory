import { tag } from "../tag";

export const placeTags = [
  tag("nature", {
    label: "Nature",
    aliases: ["natural", "outdoors", "environment"],
  }),
  tag("building", {
    label: "Building",
    aliases: ["structure", "house", "shop"],
    parents: ["architecture"],
  }),
  tag("city", {
    label: "City",
    aliases: ["urban", "town", "street"],
    related: ["building", "road", "vehicle"],
  }),
  tag("road", {
    label: "Road",
    aliases: ["street", "path", "sidewalk"],
    related: ["city", "transport"],
  }),
];
