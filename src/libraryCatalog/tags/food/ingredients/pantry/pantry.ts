import { tag } from "../../../../tag";

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
  tag("breadcrumbs", {
    label: "Breadcrumbs",
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "grain"],
  }),
  tag("cake-mix", {
    label: "Cake Mix",
    aliases: ["baking mix"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "baking"],
  }),
  tag("cereal", {
    label: "Cereal",
    aliases: ["breakfast cereal"],
    parents: ["pantry"],
    implies: ["pantry", "food"],
  }),
  tag("cornflour", {
    label: "Cornflour",
    aliases: ["cornstarch"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
  }),
  tag("couscous", {
    label: "Couscous",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
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
  tag("instant-noodles", {
    label: "Instant Noodles",
    aliases: ["ramen"],
    parents: ["pantry"],
    implies: ["pantry", "food", "grain"],
  }),
  tag("oats", {
    label: "Oats",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
  }),
  tag("packet-soup", {
    label: "Packet Soup",
    aliases: ["soup mix"],
    parents: ["pantry"],
    implies: ["pantry", "food"],
  }),
  tag("pasta", {
    label: "Pasta",
    aliases: ["noodles"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
  }),
  tag("powdered-milk", {
    label: "Powdered Milk",
    aliases: ["milk powder"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient", "dairy"],
  }),
  tag("quinoa", {
    label: "Quinoa",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
  }),
  tag("rice", {
    label: "Rice",
    parents: ["grain"],
    implies: ["grain", "pantry", "food", "ingredient"],
  }),
  tag("stock-cubes", {
    label: "Stock Cubes",
    aliases: ["bouillon cubes"],
    parents: ["pantry"],
    implies: ["pantry", "food", "ingredient"],
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
