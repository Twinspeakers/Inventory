import { tag } from "../../../../tag";

export const preserveTags = [
  tag("canned-food", {
    label: "Canned Food",
    aliases: ["tinned food"],
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
  }),
  tag("canned-soup", {
    label: "Canned Soup",
    aliases: ["tinned soup"],
    parents: ["canned-food"],
    implies: ["canned-food", "preserved-food", "food", "preserve"],
  }),
  tag("canned-tomatoes", {
    label: "Canned Tomatoes",
    aliases: ["tinned tomatoes"],
    parents: ["canned-food"],
    implies: ["canned-food", "preserved-food", "food", "preserve", "vegetable"],
  }),
  tag("chutney", {
    label: "Chutney",
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
    related: ["country-india"],
  }),
  tag("honey", {
    label: "Honey",
    parents: ["preserved-food"],
    implies: ["preserved-food", "food"],
  }),
  tag("jam", {
    label: "Jam",
    aliases: ["jelly", "fruit preserve"],
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
  }),
  tag("marmalade", {
    label: "Marmalade",
    parents: ["jam"],
    implies: ["jam", "preserved-food", "food"],
    related: ["country-united-kingdom"],
  }),
  tag("mayonnaise", {
    label: "Mayonnaise",
    aliases: ["mayo"],
    parents: ["sauce"],
    implies: ["sauce", "preserved-food", "food"],
    related: ["country-france"],
  }),
  tag("mustard", {
    label: "Mustard",
    parents: ["sauce"],
    implies: ["sauce", "preserved-food", "food"],
    related: ["country-france"],
  }),
  tag("olives", {
    label: "Olives",
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
  }),
  tag("pickles", {
    label: "Pickles",
    aliases: ["pickled vegetables"],
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
  }),
  tag("relish", {
    label: "Relish",
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
  }),
  tag("soy-sauce", {
    label: "Soy Sauce",
    parents: ["sauce"],
    implies: ["sauce", "preserved-food", "food"],
    related: ["country-china", "country-japan"],
  }),
  tag("tomato-sauce", {
    label: "Tomato Sauce",
    aliases: ["ketchup"],
    parents: ["sauce"],
    implies: ["sauce", "preserved-food", "food"],
    related: ["country-united-states"],
  }),
];
