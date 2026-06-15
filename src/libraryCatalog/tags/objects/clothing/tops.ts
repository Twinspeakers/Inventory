import { tag } from "../../../tag";

export const topTags = [
  tag("blazer", {
    label: "Blazer",
    parents: ["jacket"],
    implies: ["jacket", "clothing", "prop", "fabric"],
  }),
  tag("blouse", {
    label: "Blouse",
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
  tag("cardigan", {
    label: "Cardigan",
    parents: ["sweater"],
    implies: ["sweater", "clothing", "prop", "fabric"],
  }),
  tag("coat", {
    label: "Coat",
    aliases: ["overcoat"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("hoodie", {
    label: "Hoodie",
    aliases: ["hooded sweatshirt"],
    parents: ["sweater"],
    implies: ["sweater", "clothing", "prop", "fabric"],
  }),
  tag("jacket", {
    label: "Jacket",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("jumper", {
    label: "Jumper",
    aliases: ["pullover"],
    parents: ["sweater"],
    implies: ["sweater", "clothing", "prop", "fabric"],
  }),
  tag("raincoat", {
    label: "Raincoat",
    parents: ["coat"],
    implies: ["coat", "clothing", "prop", "fabric"],
  }),
  tag("shirt", {
    label: "Shirt",
    aliases: ["top", "tunic"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("sweater", {
    label: "Sweater",
    aliases: ["knitwear"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("t-shirt", {
    label: "T-Shirt",
    aliases: ["tee shirt", "tee"],
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
  tag("vest", {
    label: "Vest",
    aliases: ["waistcoat", "tank top"],
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
];
