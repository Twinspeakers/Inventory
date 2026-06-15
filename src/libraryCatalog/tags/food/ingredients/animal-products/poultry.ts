import { tag } from "../../../../tag";

export const poultryTags = [
  tag("chicken-meat", {
    label: "Chicken",
    aliases: ["chicken breast", "chicken thigh"],
    parents: ["poultry"],
    implies: ["poultry", "meat", "food", "ingredient", "protein"],
  }),
  tag("chicken-drumstick", {
    label: "Chicken Drumstick",
    aliases: ["drumstick"],
    parents: ["chicken-meat"],
    implies: ["chicken-meat", "poultry", "meat", "food"],
  }),
  tag("chicken-wing", {
    label: "Chicken Wing",
    parents: ["chicken-meat"],
    implies: ["chicken-meat", "poultry", "meat", "food"],
  }),
  tag("duck-meat", {
    label: "Duck",
    aliases: ["duck breast"],
    parents: ["poultry"],
    implies: ["poultry", "meat", "food", "ingredient", "protein"],
  }),
  tag("goose-meat", {
    label: "Goose",
    parents: ["poultry"],
    implies: ["poultry", "meat", "food", "ingredient", "protein"],
  }),
  tag("quail-meat", {
    label: "Quail",
    parents: ["poultry"],
    implies: ["poultry", "meat", "food", "ingredient", "protein"],
  }),
  tag("roast-chicken", {
    label: "Roast Chicken",
    parents: ["chicken-meat"],
    implies: ["chicken-meat", "poultry", "meat", "food", "cooking"],
  }),
  tag("turkey-meat", {
    label: "Turkey",
    aliases: ["turkey breast"],
    parents: ["poultry"],
    implies: ["poultry", "meat", "food", "ingredient", "protein"],
  }),
];
