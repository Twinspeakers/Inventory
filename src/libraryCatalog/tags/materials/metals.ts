import { tag } from "../../tag";

export const metalTags = [
  tag("aluminium", {
    label: "Aluminium",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("bronze", {
    label: "Bronze",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("copper", {
    label: "Copper",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("gold", {
    label: "Gold",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("iron", {
    label: "Iron",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("metal", {
    label: "Metal",
    aliases: ["metallic"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("silver", {
    label: "Silver",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("steel", {
    label: "Steel",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
  tag("tin", {
    label: "Tin",
    parents: ["metal"],
    implies: ["metal", "material"],
  }),
];
