import { tag } from "../../../../tag";

export const footwearTags = [
  tag("ankle-boots", {
    label: "Ankle Boots",
    parents: ["boots"],
    implies: ["boots", "footwear", "clothing", "prop"],
  }),
  tag("boots", {
    label: "Boots",
    aliases: ["boot"],
    parents: ["shoe"],
    implies: ["shoe", "footwear", "clothing", "prop"],
  }),
  tag("dress-shoes", {
    label: "Dress Shoes",
    parents: ["shoe"],
    implies: ["shoe", "footwear", "clothing", "prop"],
  }),
  tag("flip-flops", {
    label: "Flip-Flops",
    aliases: ["thongs"],
    parents: ["sandals"],
    implies: ["sandals", "footwear", "clothing", "prop"],
  }),
  tag("footwear", {
    label: "Footwear",
    aliases: ["shoes"],
    parents: ["clothing"],
    implies: ["clothing", "prop"],
  }),
  tag("heels", {
    label: "Heels",
    aliases: ["high heels"],
    parents: ["shoe"],
    implies: ["shoe", "footwear", "clothing", "prop"],
  }),
  tag("loafers", {
    label: "Loafers",
    parents: ["shoe"],
    implies: ["shoe", "footwear", "clothing", "prop"],
  }),
  tag("sandals", {
    label: "Sandals",
    parents: ["footwear"],
    implies: ["footwear", "clothing", "prop"],
  }),
  tag("shoe", {
    label: "Shoe",
    aliases: ["sneaker", "trainer"],
    parents: ["footwear"],
    implies: ["footwear", "clothing", "prop"],
  }),
  tag("slippers", {
    label: "Slippers",
    parents: ["footwear"],
    implies: ["footwear", "clothing", "prop", "fabric"],
  }),
  tag("sneakers", {
    label: "Sneakers",
    aliases: ["trainers", "runners"],
    parents: ["shoe"],
    implies: ["shoe", "footwear", "clothing", "prop"],
  }),
  tag("socks", {
    label: "Socks",
    parents: ["footwear"],
    implies: ["footwear", "clothing", "prop", "fabric"],
  }),
  tag("work-boots", {
    label: "Work Boots",
    parents: ["boots"],
    implies: ["boots", "footwear", "clothing", "prop"],
  }),
];
