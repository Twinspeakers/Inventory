import { tag } from "../../tag";

export const containerTags = [
  tag("storage", {
    label: "Storage",
    aliases: ["container", "containers"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("bag", {
    label: "Bag",
    aliases: ["pouch", "sack"],
    parents: ["storage"],
    implies: ["storage", "prop"],
  }),
  tag("barrel", {
    label: "Barrel",
    aliases: ["cask"],
    parents: ["storage"],
    implies: ["storage", "prop"],
  }),
  tag("basket", {
    label: "Basket",
    parents: ["storage"],
    implies: ["storage", "prop"],
  }),
  tag("bottle", {
    label: "Bottle",
    aliases: ["flask", "vial"],
    parents: ["storage"],
    implies: ["storage", "prop", "glass"],
  }),
  tag("box", {
    label: "Box",
    aliases: ["crate"],
    parents: ["storage"],
    implies: ["storage", "prop"],
  }),
  tag("bucket", {
    label: "Bucket",
    aliases: ["pail"],
    parents: ["storage"],
    implies: ["storage", "tool", "prop"],
  }),
  tag("jar", {
    label: "Jar",
    parents: ["storage"],
    implies: ["storage", "prop", "glass"],
  }),
];
