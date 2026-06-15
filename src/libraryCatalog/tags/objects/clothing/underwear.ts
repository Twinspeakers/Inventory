import { tag } from "../../../tag";

export const underwearTags = [
  tag("bra", {
    label: "Bra",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("corset", {
    label: "Corset",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("lingerie", {
    label: "Lingerie",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("stockings", {
    label: "Stockings",
    aliases: ["hosiery"],
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("tights", {
    label: "Tights",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("underwear", {
    label: "Underwear",
    aliases: ["underclothes"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
];
