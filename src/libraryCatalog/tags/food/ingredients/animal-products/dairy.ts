import { tag } from "../../../../tag";

export const dairyTags = [
  tag("butter", {
    label: "Butter",
    parents: ["dairy"],
    implies: ["dairy", "fat", "food", "ingredient"],
  }),
  tag("cheddar", {
    label: "Cheddar",
    aliases: ["cheddar cheese"],
    parents: ["cheese"],
    implies: ["cheese", "dairy", "food", "ingredient"],
  }),
  tag("cheese", {
    label: "Cheese",
    aliases: ["curd cheese"],
    parents: ["dairy"],
    implies: ["dairy", "food", "ingredient"],
  }),
  tag("cream", {
    label: "Cream",
    aliases: ["heavy cream", "double cream"],
    parents: ["dairy"],
    implies: ["dairy", "food", "ingredient"],
  }),
  tag("cream-cheese", {
    label: "Cream Cheese",
    parents: ["cheese"],
    implies: ["cheese", "dairy", "food", "ingredient"],
  }),
  tag("feta", {
    label: "Feta",
    parents: ["cheese"],
    implies: ["cheese", "dairy", "food", "ingredient"],
  }),
  tag("ice-cream", {
    label: "Ice Cream",
    aliases: ["gelato"],
    parents: ["dairy"],
    implies: ["dairy", "dessert", "food"],
  }),
  tag("milk", {
    label: "Milk",
    aliases: ["cow milk"],
    parents: ["dairy"],
    implies: ["dairy", "food", "ingredient"],
  }),
  tag("mozzarella", {
    label: "Mozzarella",
    parents: ["cheese"],
    implies: ["cheese", "dairy", "food", "ingredient"],
  }),
  tag("parmesan", {
    label: "Parmesan",
    aliases: ["parmigiano"],
    parents: ["cheese"],
    implies: ["cheese", "dairy", "food", "ingredient"],
  }),
  tag("sour-cream", {
    label: "Sour Cream",
    aliases: ["cultured cream"],
    parents: ["dairy"],
    implies: ["dairy", "food", "ingredient"],
  }),
  tag("yogurt", {
    label: "Yogurt",
    aliases: ["yoghurt"],
    parents: ["dairy"],
    implies: ["dairy", "food"],
  }),
];
