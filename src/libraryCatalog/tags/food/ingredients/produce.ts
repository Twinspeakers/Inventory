import type { LibraryTagDefinition } from "../../../types";
import { tag } from "../../../tag";
import { berryTags } from "./produce/berries";
import { fruitTags } from "./produce/fruits";
import { vegetableTags } from "./produce/vegetables";

export const produceTags: LibraryTagDefinition[] = [
  tag("berry", {
    label: "Berry",
    aliases: ["berries"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("fruit", {
    label: "Fruit",
    aliases: ["produce"],
    parents: ["perishable", "ingredient"],
    implies: ["perishable", "food", "ingredient"],
  }),
  tag("vegetable", {
    label: "Vegetable",
    aliases: ["veg", "produce"],
    parents: ["perishable", "ingredient"],
    implies: ["perishable", "food", "ingredient"],
  }),
  ...berryTags,
  ...fruitTags,
  ...vegetableTags,
];

export { berryTags, fruitTags, vegetableTags };
