import { tag } from "../../../tag";

export const fullBodyClothingTags = [
  tag("apron", {
    label: "Apron",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("bodysuit", {
    label: "Bodysuit",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("clothing", {
    label: "Clothing",
    aliases: ["clothes", "garment", "apparel", "costume"],
    parents: ["prop"],
    implies: ["prop", "fabric"],
  }),
  tag("costume", {
    label: "Costume",
    aliases: ["fancy dress"],
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
  tag("overalls", {
    label: "Overalls",
    aliases: ["dungarees"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("pajamas", {
    label: "Pajamas",
    aliases: ["pyjamas", "sleepwear"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("suit", {
    label: "Suit",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("swimsuit", {
    label: "Swimsuit",
    aliases: ["swimwear", "bathing suit"],
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("tracksuit", {
    label: "Tracksuit",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
  tag("uniform", {
    label: "Uniform",
    parents: ["clothing"],
    implies: ["clothing", "prop", "fabric"],
  }),
];
