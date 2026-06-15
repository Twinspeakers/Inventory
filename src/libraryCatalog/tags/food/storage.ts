import { tag } from "../../tag";
import { householdTags } from "./storage/household";

export const storageTags = [
  tag("food-storage", {
    label: "Storage",
    aliases: ["food storage", "keeping"],
    related: ["perishable", "non-perishable", "preserve"],
  }),
  tag("household-grocery", {
    label: "Household Grocery",
    aliases: ["household supplies"],
    parents: ["non-perishable"],
    related: ["pantry", "food-storage"],
  }),
  tag("non-perishable", {
    label: "Non-Perishable",
    aliases: ["shelf stable", "long shelf life"],
    related: ["food", "food-storage", "pantry"],
  }),
  tag("perishable", {
    label: "Perishable",
    aliases: ["fresh", "short shelf life"],
    related: ["food", "food-storage"],
  }),
  ...householdTags,
];
