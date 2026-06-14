import { tag } from "../../tag";

export const sweetTags = [
  tag("biscuits", {
    label: "Biscuits",
    aliases: ["cookies"],
    parents: ["baked-good", "sweet-food", "snack"],
    implies: ["baked-good", "sweet-food", "snack", "food"],
  }),
  tag("brownie", {
    label: "Brownie",
    parents: ["baked-good", "dessert"],
    implies: ["baked-good", "dessert", "sweet-food", "food"],
  }),
  tag("cake", {
    label: "Cake",
    parents: ["baked-good", "dessert"],
    implies: ["baked-good", "dessert", "sweet-food", "food"],
  }),
  tag("cheesecake", {
    label: "Cheesecake",
    parents: ["cake", "dessert"],
    implies: ["cake", "dessert", "sweet-food", "dairy", "food"],
    related: ["country-united-states"],
  }),
  tag("chocolate", {
    label: "Chocolate",
    parents: ["sweet-food", "snack"],
    implies: ["sweet-food", "snack", "dessert", "food"],
  }),
  tag("cupcake", {
    label: "Cupcake",
    parents: ["cake", "baked-good"],
    implies: ["cake", "baked-good", "dessert", "sweet-food", "food"],
  }),
  tag("custard", {
    label: "Custard",
    parents: ["dessert"],
    implies: ["dessert", "sweet-food", "dairy", "food"],
  }),
  tag("doughnut", {
    label: "Doughnut",
    aliases: ["donut"],
    parents: ["baked-good", "sweet-food"],
    implies: ["baked-good", "sweet-food", "food"],
    related: ["country-united-states"],
  }),
  tag("ice-cream-dessert", {
    label: "Ice Cream Dessert",
    aliases: ["sundae"],
    parents: ["dessert"],
    implies: ["dessert", "sweet-food", "dairy", "food"],
  }),
  tag("lollies", {
    label: "Lollies",
    aliases: ["candy", "sweets"],
    parents: ["sweet-food", "snack"],
    implies: ["sweet-food", "snack", "food"],
  }),
  tag("macaron", {
    label: "Macaron",
    parents: ["sweet-food", "baked-good"],
    implies: ["sweet-food", "baked-good", "food"],
    related: ["country-france"],
  }),
  tag("muffin", {
    label: "Muffin",
    parents: ["baked-good", "sweet-food"],
    implies: ["baked-good", "sweet-food", "food"],
  }),
  tag("pancake", {
    label: "Pancake",
    parents: ["sweet-food", "breakfast"],
    implies: ["sweet-food", "breakfast", "food"],
    related: ["country-united-states"],
  }),
  tag("pastry", {
    label: "Pastry",
    parents: ["baked-good"],
    implies: ["baked-good", "food"],
  }),
  tag("pudding-dessert", {
    label: "Pudding",
    aliases: ["dessert pudding"],
    parents: ["dessert"],
    implies: ["dessert", "sweet-food", "food"],
  }),
  tag("scone", {
    label: "Scone",
    parents: ["baked-good", "afternoon-tea"],
    implies: ["baked-good", "afternoon-tea", "food"],
    related: ["country-united-kingdom"],
  }),
  tag("sweet-pie", {
    label: "Sweet Pie",
    aliases: ["fruit pie", "dessert pie"],
    parents: ["baked-good", "dessert"],
    implies: ["baked-good", "dessert", "sweet-food", "food"],
  }),
  tag("tart", {
    label: "Tart",
    parents: ["baked-good", "dessert"],
    implies: ["baked-good", "dessert", "sweet-food", "food"],
    related: ["country-france"],
  }),
  tag("waffle", {
    label: "Waffle",
    parents: ["sweet-food", "breakfast"],
    implies: ["sweet-food", "breakfast", "food"],
    related: ["country-belgium"],
  }),
];
