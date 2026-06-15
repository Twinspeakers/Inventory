import { tag } from "../../tag";

export const foodTags = [
  tag("baked-good", {
    label: "Baked Good",
    aliases: ["baked goods", "bakery item"],
    parents: ["food"],
    implies: ["food", "baking"],
  }),
  tag("baking", {
    label: "Baking",
    aliases: ["bake", "oven cooking"],
    parents: ["cooking"],
    implies: ["cooking"],
  }),
  tag("cooking", {
    label: "Cooking",
    aliases: ["cookery", "kitchen work"],
    related: ["food", "ingredient", "crafting-station"],
  }),
  tag("drink", {
    label: "Drink",
    aliases: ["beverage"],
    parents: ["food"],
    implies: ["food", "hydration"],
  }),
  tag("eating", {
    label: "Eating",
    aliases: ["dining", "consumption"],
    related: ["food", "meal"],
  }),
  tag("food", {
    label: "Food",
    aliases: ["edible", "meal", "cuisine"],
  }),
  tag("ingredient", {
    label: "Ingredient",
    aliases: ["component", "raw ingredient"],
    parents: ["food"],
    implies: ["food"],
  }),
  tag("recipe", {
    label: "Recipe",
    aliases: ["instructions", "formula"],
    related: ["cooking", "ingredient", "meal"],
  }),
];
