import type { LibraryTagDefinition } from "../../../types";
import { tag } from "../../../tag";
import { pantryTags } from "./pantry/pantry";
import { preserveTags } from "./pantry/preserves";
import { spiceTags } from "./pantry/spices";

export const pantryIngredientTags: LibraryTagDefinition[] = [
  tag("pantry", {
    label: "Pantry",
    aliases: ["dry goods", "cupboard food"],
    parents: ["non-perishable", "ingredient"],
    implies: ["non-perishable", "food", "ingredient"],
  }),
  tag("preserve", {
    label: "Preserve",
    aliases: ["preservation", "canning"],
    related: ["food-storage", "non-perishable"],
  }),
  tag("preserved-food", {
    label: "Preserved Food",
    aliases: ["preserves"],
    parents: ["non-perishable"],
    implies: ["non-perishable", "food", "preserve"],
  }),
  tag("sauce", {
    label: "Sauce",
    aliases: ["condiment"],
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "ingredient"],
  }),
  tag("spice", {
    label: "Spice",
    aliases: ["seasoning"],
    parents: ["ingredient", "non-perishable"],
    implies: ["ingredient", "food", "non-perishable"],
  }),
  ...pantryTags,
  ...spiceTags,
  ...preserveTags,
];

export { pantryTags, preserveTags, spiceTags };
