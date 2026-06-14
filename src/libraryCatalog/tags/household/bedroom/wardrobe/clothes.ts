import { tag } from "../../../../tag";

export const clothesTags = [
  tag("accessory", {
    label: "Accessory",
    aliases: ["fashion accessory"],
    parents: ["clothing"],
    implies: ["clothing", "prop"],
  }),
  tag("apron", {
    label: "Apron",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("belt", {
    label: "Belt",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
  }),
  tag("blouse", {
    label: "Blouse",
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
  tag("bra", {
    label: "Bra",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("cardigan", {
    label: "Cardigan",
    parents: ["sweater"],
    implies: ["sweater", "clothing", "prop", "fabric"],
  }),
  tag("clothing", {
    label: "Clothing",
    aliases: ["clothes", "garment", "apparel", "costume"],
    parents: ["prop"],
    implies: ["prop", "fabric"],
  }),
  tag("coat", {
    label: "Coat",
    aliases: ["overcoat"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("dress", {
    label: "Dress",
    aliases: ["gown"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("dressing-gown", {
    label: "Dressing Gown",
    aliases: ["bathrobe", "robe"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("gloves", {
    label: "Gloves",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
  tag("hat", {
    label: "Hat",
    aliases: ["cap", "helmet", "headwear"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop"],
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
  tag("jeans", {
    label: "Jeans",
    aliases: ["denim jeans"],
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
  tag("jumper", {
    label: "Jumper",
    aliases: ["pullover"],
    parents: ["sweater"],
    implies: ["sweater", "clothing", "prop", "fabric"],
  }),
  tag("leggings", {
    label: "Leggings",
    parents: ["pants"],
    implies: ["pants", "clothing", "prop", "fabric"],
  }),
  tag("lingerie", {
    label: "Lingerie",
    parents: ["underwear"],
    implies: ["underwear", "clothing", "prop", "fabric"],
  }),
  tag("pajamas", {
    label: "Pajamas",
    aliases: ["pyjamas", "sleepwear"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("pants", {
    label: "Pants",
    aliases: ["trousers"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("raincoat", {
    label: "Raincoat",
    parents: ["coat"],
    implies: ["coat", "clothing", "prop", "fabric"],
  }),
  tag("scarf", {
    label: "Scarf",
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
  tag("shirt", {
    label: "Shirt",
    aliases: ["top", "tunic"],
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
  tag("suit", {
    label: "Suit",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("sweater", {
    label: "Sweater",
    aliases: ["knitwear"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("swimsuit", {
    label: "Swimsuit",
    aliases: ["swimwear", "bathing suit"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("t-shirt", {
    label: "T-Shirt",
    aliases: ["tee shirt", "tee"],
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
  tag("tie", {
    label: "Tie",
    aliases: ["necktie"],
    parents: ["accessory"],
    implies: ["accessory", "clothing", "prop", "fabric"],
  }),
  tag("underwear", {
    label: "Underwear",
    aliases: ["underclothes"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("uniform", {
    label: "Uniform",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("vest", {
    label: "Vest",
    aliases: ["waistcoat", "tank top"],
    parents: ["shirt"],
    implies: ["shirt", "clothing", "prop", "fabric"],
  }),
];
