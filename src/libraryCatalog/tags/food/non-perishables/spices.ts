import { tag } from "../../../tag";

export const spiceTags = [
  tag("basil", {
    label: "Basil",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("black-pepper", {
    label: "Black Pepper",
    aliases: ["peppercorn"],
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("chilli-powder", {
    label: "Chilli Powder",
    aliases: ["chili powder"],
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("cinnamon", {
    label: "Cinnamon",
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("cumin", {
    label: "Cumin",
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("dill", {
    label: "Dill",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("herb", {
    label: "Herb",
    aliases: ["dried herb"],
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("mixed-spice", {
    label: "Mixed Spice",
    aliases: ["spice blend"],
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("oregano", {
    label: "Oregano",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("paprika", {
    label: "Paprika",
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("rosemary", {
    label: "Rosemary",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("salt", {
    label: "Salt",
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
  tag("tarragon", {
    label: "Tarragon",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("thyme", {
    label: "Thyme",
    parents: ["herb"],
    implies: ["herb", "spice", "ingredient", "food"],
  }),
  tag("turmeric", {
    label: "Turmeric",
    parents: ["spice"],
    implies: ["spice", "ingredient", "food"],
  }),
];
