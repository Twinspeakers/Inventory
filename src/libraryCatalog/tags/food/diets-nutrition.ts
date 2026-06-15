import { tag } from "../../tag";

export const dietNutritionTags = [
  tag("allergen", {
    label: "Allergen",
    aliases: ["food allergy", "intolerance"],
    related: ["food", "ingredient"],
  }),
  tag("calories", {
    label: "Calories",
    aliases: ["energy", "kilocalories"],
    related: ["nutrition", "portion"],
  }),
  tag("carbohydrates", {
    label: "Carbohydrates",
    aliases: ["carbs", "starch", "sugar"],
    parents: ["nutrition"],
    implies: ["nutrition"],
  }),
  tag("diet", {
    label: "Diet",
    aliases: ["eating pattern", "food plan"],
    related: ["nutrition", "food", "fasting"],
  }),
  tag("fasting", {
    label: "Fasting",
    aliases: ["not eating", "intermittent fasting"],
    related: ["diet", "eating"],
  }),
  tag("fat", {
    label: "Fat",
    aliases: ["dietary fat", "lipids"],
    parents: ["nutrition"],
    implies: ["nutrition"],
  }),
  tag("fibre", {
    label: "Fibre",
    aliases: ["fiber", "dietary fibre", "roughage"],
    parents: ["nutrition"],
    implies: ["nutrition"],
  }),
  tag("hydration", {
    label: "Hydration",
    aliases: ["fluid intake", "water intake"],
    related: ["nutrition", "drink"],
  }),
  tag("nutrition", {
    label: "Nutrition",
    aliases: ["nutritional value", "dietary value"],
    related: ["food", "calories", "protein"],
  }),
  tag("portion", {
    label: "Portion",
    aliases: ["serving", "helping"],
    related: ["meal", "calories"],
  }),
  tag("protein", {
    label: "Protein",
    aliases: ["dietary protein", "macronutrient"],
    parents: ["nutrition"],
    implies: ["nutrition"],
  }),
];
