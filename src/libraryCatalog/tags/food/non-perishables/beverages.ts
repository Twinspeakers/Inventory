import { tag } from "../../../tag";

export const beverageTags = [
  tag("coffee", {
    label: "Coffee",
    parents: ["drink"],
    implies: ["drink", "food"],
    related: ["country-ethiopia"],
  }),
  tag("cordial", {
    label: "Cordial",
    aliases: ["squash"],
    parents: ["drink"],
    implies: ["drink", "food"],
  }),
  tag("energy-drink", {
    label: "Energy Drink",
    parents: ["drink"],
    implies: ["drink", "food"],
  }),
  tag("juice", {
    label: "Juice",
    aliases: ["fruit juice"],
    parents: ["drink"],
    implies: ["drink", "food"],
  }),
  tag("powdered-drink", {
    label: "Powdered Drink",
    aliases: ["drink mix"],
    parents: ["drink", "pantry"],
    implies: ["drink", "pantry", "food"],
  }),
  tag("soft-drink", {
    label: "Soft Drink",
    aliases: ["soda", "pop"],
    parents: ["drink"],
    implies: ["drink", "food"],
    related: ["country-united-states"],
  }),
  tag("sports-drink", {
    label: "Sports Drink",
    aliases: ["electrolyte drink"],
    parents: ["drink"],
    implies: ["drink", "hydration"],
  }),
  tag("tea", {
    label: "Tea",
    parents: ["drink"],
    implies: ["drink", "food"],
    related: ["country-china", "country-united-kingdom"],
  }),
  tag("water-drink", {
    label: "Water",
    aliases: ["drinking water"],
    parents: ["drink"],
    implies: ["drink", "hydration"],
  }),
];
