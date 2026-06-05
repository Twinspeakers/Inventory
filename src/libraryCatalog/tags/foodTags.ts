import { tag } from "../tag";

export const foodTags = [
  tag("food", {
    label: "Food",
    aliases: ["edible", "meal"],
  }),
  tag("ingredient", {
    label: "Ingredient",
    aliases: ["component", "raw ingredient"],
    parents: ["food"],
    implies: ["food"],
  }),
  tag("fruit", {
    label: "Fruit",
    aliases: ["berry", "citrus"],
    parents: ["food", "ingredient"],
    implies: ["food", "ingredient"],
  }),
  tag("vegetable", {
    label: "Vegetable",
    aliases: ["veg", "produce"],
    parents: ["food", "ingredient"],
    implies: ["food", "ingredient"],
  }),
  tag("meat", {
    label: "Meat",
    aliases: ["protein", "poultry"],
    parents: ["food", "ingredient"],
    implies: ["food", "ingredient"],
  }),
  tag("cooking", {
    label: "Cooking",
    aliases: ["cook", "kitchen"],
    related: ["food", "ingredient", "crafting-station"],
  }),
];
