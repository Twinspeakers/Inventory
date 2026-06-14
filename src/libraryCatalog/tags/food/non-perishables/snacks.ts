import { tag } from "../../../tag";

export const snackTags = [
  tag("chips", {
    label: "Chips",
    aliases: ["crisps", "potato chips"],
    parents: ["snack"],
    implies: ["snack", "food"],
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
  tag("trail-mix", {
    label: "Trail Mix",
    aliases: ["scroggin"],
    parents: ["snack"],
    implies: ["snack", "food"],
  }),
];
