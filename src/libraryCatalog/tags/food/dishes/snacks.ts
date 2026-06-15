import { tag } from "../../../tag";

export const snackTags = [
  tag("snack", {
    label: "Snack",
    aliases: ["snack food"],
    parents: ["food"],
    implies: ["food"],
  }),
  tag("chips", {
    label: "Chips",
    aliases: ["crisps", "potato chips"],
    parents: ["snack"],
    implies: ["snack", "food"],
  }),
  tag("chocolate-bar", {
    label: "Chocolate Bar",
    aliases: ["candy bar"],
    parents: ["snack"],
    implies: ["snack", "food", "sweet-food"],
  }),
  tag("dried-fruit", {
    label: "Dried Fruit",
    aliases: ["dehydrated fruit"],
    parents: ["snack"],
    implies: ["snack", "food", "fruit", "preserve"],
  }),
  tag("granola-bar", {
    label: "Granola Bar",
    aliases: ["muesli bar"],
    parents: ["snack"],
    implies: ["snack", "food", "grain"],
  }),
  tag("nuts", {
    label: "Nuts",
    aliases: ["mixed nuts"],
    parents: ["snack"],
    implies: ["snack", "food", "protein", "fat"],
  }),
  tag("popcorn", {
    label: "Popcorn",
    parents: ["snack"],
    implies: ["snack", "food", "grain"],
  }),
  tag("pretzels", {
    label: "Pretzels",
    parents: ["snack"],
    implies: ["snack", "food", "grain"],
  }),
  tag("rice-crackers", {
    label: "Rice Crackers",
    parents: ["crackers"],
    implies: ["crackers", "snack", "food", "grain"],
  }),
  tag("trail-mix", {
    label: "Trail Mix",
    aliases: ["scroggin"],
    parents: ["snack"],
    implies: ["snack", "food"],
  }),
];
