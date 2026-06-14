import { tag } from "../../../tag";

export const preserveTags = [
  tag("canned-food", {
    label: "Canned Food",
    aliases: ["tinned food"],
    parents: ["preserved-food"],
    implies: ["preserved-food", "food", "preserve"],
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
  tag("mustard", {
    label: "Mustard",
    parents: ["sauce"],
    implies: ["sauce", "preserved-food", "food"],
    related: ["country-france"],
  }),
  tag("pickles", {
    label: "Pickles",
    aliases: ["pickled vegetables"],
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
