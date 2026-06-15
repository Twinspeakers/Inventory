import { tag } from "../../../tag";

export const daypartTags = [
  tag("afternoon-tea", {
    label: "Afternoon Tea",
    aliases: ["tea time", "high tea"],
    parents: ["meal"],
    implies: ["meal", "food", "eating"],
  }),
  tag("breakfast", {
    label: "Breakfast",
    aliases: ["morning meal"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("brunch", {
    label: "Brunch",
    aliases: ["late breakfast"],
    parents: ["meal"],
    implies: ["meal", "food", "breakfast", "lunch"],
  }),
  tag("dinner", {
    label: "Dinner",
    aliases: ["evening meal"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("elevenses", {
    label: "Elevenses",
    aliases: ["morning tea", "mid-morning snack"],
    parents: ["meal"],
    implies: ["meal", "food", "snack"],
  }),
  tag("feast", {
    label: "Feast",
    aliases: ["banquet", "spread"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("lunch", {
    label: "Lunch",
    aliases: ["midday meal"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("meal", {
    label: "Meal",
    aliases: ["dish", "serving"],
    parents: ["food"],
    implies: ["food"],
  }),
  tag("midnight-snack", {
    label: "Midnight Snack",
    aliases: ["late night snack", "night snack"],
    parents: ["snack", "meal"],
    implies: ["snack", "meal", "food"],
  }),
  tag("picnic", {
    label: "Picnic",
    aliases: ["outdoor meal"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
  tag("supper", {
    label: "Supper",
    aliases: ["light dinner", "late meal"],
    parents: ["meal"],
    implies: ["meal", "food"],
  }),
];
