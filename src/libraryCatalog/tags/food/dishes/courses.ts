import { tag } from "../../../tag";

export const courseTags = [
  tag("appetizer", {
    label: "Appetizer",
    aliases: ["appetiser", "starter"],
    parents: ["course"],
    implies: ["course", "food"],
  }),
  tag("course", {
    label: "Course",
    aliases: ["meal course"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("dessert", {
    label: "Dessert",
    aliases: ["pudding", "sweet course"],
    parents: ["course", "sweet-food"],
    implies: ["course", "sweet-food", "food"],
  }),
  tag("entree", {
    label: "Entree",
    aliases: ["entrée"],
    parents: ["course"],
    implies: ["course", "food"],
  }),
  tag("main-course", {
    label: "Main Course",
    aliases: ["main", "mains"],
    parents: ["course"],
    implies: ["course", "meal", "food"],
  }),
  tag("side-dish", {
    label: "Side Dish",
    aliases: ["side", "sides"],
    parents: ["course"],
    implies: ["course", "food"],
  }),
  tag("small-plate", {
    label: "Small Plate",
    aliases: ["share plate", "tapas"],
    parents: ["course"],
    implies: ["course", "food"],
  }),
  tag("starter", {
    label: "Starter",
    aliases: ["first course"],
    parents: ["appetizer"],
    implies: ["appetizer", "course", "food"],
  }),
];
