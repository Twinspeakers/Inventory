import { tag } from "../../../tag";

export const meatTags = [
  tag("bacon", {
    label: "Bacon",
    parents: ["pork"],
    implies: ["pork", "meat", "food", "ingredient", "protein"],
  }),
  tag("beef", {
    label: "Beef",
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("fish-fillet", {
    label: "Fish Fillet",
    aliases: ["fillet"],
    parents: ["seafood"],
    implies: ["seafood", "food", "ingredient", "protein"],
  }),
  tag("goat-meat", {
    label: "Goat Meat",
    aliases: ["chevon"],
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("ham", {
    label: "Ham",
    parents: ["pork"],
    implies: ["pork", "meat", "food", "ingredient", "protein"],
  }),
  tag("lamb-meat", {
    label: "Lamb",
    aliases: ["lamb meat"],
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("mince", {
    label: "Mince",
    aliases: ["ground meat"],
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("pork", {
    label: "Pork",
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("prawns", {
    label: "Prawns",
    aliases: ["shrimp"],
    parents: ["seafood"],
    implies: ["seafood", "food", "ingredient", "protein"],
  }),
  tag("salmon-fillet", {
    label: "Salmon Fillet",
    parents: ["fish-fillet"],
    implies: ["fish-fillet", "seafood", "food", "ingredient", "protein"],
  }),
  tag("sausage", {
    label: "Sausage",
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("steak", {
    label: "Steak",
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
  tag("tuna", {
    label: "Tuna",
    parents: ["seafood"],
    implies: ["seafood", "food", "ingredient", "protein"],
  }),
  tag("venison", {
    label: "Venison",
    parents: ["meat"],
    implies: ["meat", "food", "ingredient", "protein"],
  }),
];
