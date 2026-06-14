import { tag } from "../../../tag";

export const pantryTags = [
  tag("beans", {
    label: "Beans",
    aliases: ["dried beans"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "protein"],
  }),
  tag("bread", {
    label: "Bread",
    aliases: ["loaf"],
    parents: ["pantry"],
    implies: ["pantry", "food", "grain"],
  }),
  tag("cereal", {
    label: "Cereal",
    aliases: ["breakfast cereal"],
    parents: ["pantry"],
    implies: ["pantry", "food"],
  }),
  tag("cooking-oil", {
    label: "Cooking Oil",
    aliases: ["oil"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "fat"],
  }),
  tag("crackers", {
    label: "Crackers",
    parents: ["pantry"],
    implies: ["pantry", "food"],
  }),
  tag("flour", {
    label: "Flour",
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
  }),
  tag("grain", {
    label: "Grain",
    aliases: ["cereal grain"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "crop"],
  }),
  tag("lentils", {
    label: "Lentils",
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "protein"],
  }),
  tag("oats", {
    label: "Oats",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
  }),
  tag("pasta", {
    label: "Pasta",
    aliases: ["noodles"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
  }),
  tag("rice", {
    label: "Rice",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
  }),
  tag("sugar", {
    label: "Sugar",
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "carbohydrates"],
  }),
  tag("vinegar", {
    label: "Vinegar",
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
  }),
];
