import { tag } from "../../tag";

export const kitchenwareTags = [
  tag("kitchenware", {
    label: "Kitchenware",
    aliases: ["kitchen item", "kitchen equipment"],
    parents: ["prop", "kitchen"],
    implies: ["prop", "kitchen"],
  }),
  tag("cookware", {
    label: "Cookware",
    aliases: ["cooking vessel", "pots and pans"],
    parents: ["kitchenware"],
    implies: ["kitchenware", "prop", "cooking"],
  }),
  tag("utensil", {
    label: "Utensil",
    aliases: ["cutlery", "silverware", "flatware"],
    parents: ["kitchenware", "tool"],
    implies: ["kitchenware", "tool", "prop"],
  }),
  tag("bowl", {
    label: "Bowl",
    aliases: ["mixing bowl"],
    parents: ["kitchenware"],
    implies: ["kitchenware", "prop", "ceramic"],
  }),
  tag("cup", {
    label: "Cup",
    aliases: ["mug", "glass", "teacup"],
    parents: ["kitchenware"],
    implies: ["kitchenware", "prop"],
  }),
  tag("fork", {
    label: "Fork",
    aliases: ["dinner fork"],
    parents: ["utensil"],
    implies: ["utensil", "kitchenware", "prop"],
  }),
  tag("knife", {
    label: "Knife",
    aliases: ["dagger", "kitchen knife"],
    parents: ["tool", "utensil"],
    implies: ["tool", "utensil", "metal"],
  }),
  tag("pan", {
    label: "Pan",
    aliases: ["frying pan", "skillet", "saucepan"],
    parents: ["cookware"],
    implies: ["cookware", "kitchenware", "prop", "metal"],
  }),
  tag("plate", {
    label: "Plate",
    aliases: ["dish", "serving plate"],
    parents: ["kitchenware"],
    implies: ["kitchenware", "prop", "ceramic"],
  }),
  tag("pot", {
    label: "Pot",
    aliases: ["cooking pot", "stockpot", "plant pot", "flower pot"],
    parents: ["cookware", "storage"],
    implies: ["cookware", "kitchenware", "storage", "prop"],
  }),
  tag("spoon", {
    label: "Spoon",
    aliases: ["teaspoon", "tablespoon", "ladle"],
    parents: ["utensil"],
    implies: ["utensil", "kitchenware", "prop"],
  }),
];
