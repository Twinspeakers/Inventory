import { tag } from "../../../tag";

export const householdTags = [
  tag("aluminium-foil", {
    label: "Aluminium Foil",
    aliases: ["aluminum foil", "foil"],
    parents: ["household-grocery"],
    implies: ["household-grocery", "food-storage"],
  }),
  tag("baking-paper", {
    label: "Baking Paper",
    aliases: ["parchment paper"],
    parents: ["household-grocery"],
    implies: ["household-grocery", "baking"],
  }),
  tag("cling-wrap", {
    label: "Cling Wrap",
    aliases: ["plastic wrap", "food wrap"],
    parents: ["household-grocery"],
    implies: ["household-grocery", "food-storage"],
  }),
  tag("cleaning-spray", {
    label: "Cleaning Spray",
    aliases: ["surface spray"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("dish-soap", {
    label: "Dish Soap",
    aliases: ["dishwashing liquid"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("dishwasher-tablets", {
    label: "Dishwasher Tablets",
    aliases: ["dishwasher pods"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("food-storage-bag", {
    label: "Food Storage Bag",
    aliases: ["zip bag", "freezer bag"],
    parents: ["household-grocery"],
    implies: ["household-grocery", "food-storage"],
  }),
  tag("laundry-detergent", {
    label: "Laundry Detergent",
    aliases: ["washing powder", "laundry liquid"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("napkins", {
    label: "Napkins",
    aliases: ["serviettes"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("paper-towels", {
    label: "Paper Towels",
    aliases: ["kitchen roll"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("rubber-gloves", {
    label: "Rubber Gloves",
    aliases: ["cleaning gloves"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("rubbish-bags", {
    label: "Rubbish Bags",
    aliases: ["trash bags", "bin bags"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("sponge", {
    label: "Sponge",
    aliases: ["kitchen sponge"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("tissues", {
    label: "Tissues",
    aliases: ["facial tissues"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
  tag("toilet-paper", {
    label: "Toilet Paper",
    aliases: ["toilet roll"],
    parents: ["household-grocery"],
    implies: ["household-grocery"],
  }),
];
