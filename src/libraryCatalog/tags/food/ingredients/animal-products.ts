import type { LibraryTagDefinition } from "../../../types";
import { tag } from "../../../tag";
import { dairyTags } from "./animal-products/dairy";
import { meatTags } from "./animal-products/meat";
import { poultryTags } from "./animal-products/poultry";

export const animalProductTags: LibraryTagDefinition[] = [
  tag("dairy", {
    label: "Dairy",
    aliases: ["milk products"],
    parents: ["perishable", "ingredient"],
    implies: ["perishable", "food", "ingredient"],
  }),
  tag("meat", {
    label: "Meat",
    aliases: ["red meat", "animal protein"],
    parents: ["perishable", "ingredient"],
    implies: ["perishable", "food", "ingredient", "protein"],
  }),
  tag("poultry", {
    label: "Poultry",
    aliases: ["white meat"],
    parents: ["meat"],
    implies: ["meat", "perishable", "food", "ingredient", "protein"],
  }),
  tag("seafood", {
    label: "Seafood",
    aliases: ["fish meat", "shellfish"],
    parents: ["perishable", "ingredient"],
    implies: ["perishable", "food", "ingredient", "protein", "fish"],
  }),
  ...dairyTags,
  ...meatTags,
  ...poultryTags,
];

export { dairyTags, meatTags, poultryTags };
