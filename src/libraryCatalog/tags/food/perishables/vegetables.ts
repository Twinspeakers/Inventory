import { tag } from "../../../tag";

export const vegetableTags = [
  tag("asparagus", {
    label: "Asparagus",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("beetroot", {
    label: "Beetroot",
    aliases: ["beet"],
    parents: ["root-vegetable"],
    implies: ["root-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("broccoli", {
    label: "Broccoli",
    parents: ["cruciferous-vegetable"],
    implies: ["cruciferous-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("cabbage", {
    label: "Cabbage",
    parents: ["cruciferous-vegetable"],
    implies: ["cruciferous-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("capsicum", {
    label: "Capsicum",
    aliases: ["bell pepper", "pepper"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("carrot", {
    label: "Carrot",
    parents: ["root-vegetable"],
    implies: ["root-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("cauliflower", {
    label: "Cauliflower",
    parents: ["cruciferous-vegetable"],
    implies: ["cruciferous-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("celery", {
    label: "Celery",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("corn", {
    label: "Corn",
    aliases: ["maize"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient", "crop"],
  }),
  tag("cruciferous-vegetable", {
    label: "Cruciferous Vegetable",
    aliases: ["brassica"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("cucumber", {
    label: "Cucumber",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("eggplant", {
    label: "Eggplant",
    aliases: ["aubergine"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("garlic", {
    label: "Garlic",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("leafy-greens", {
    label: "Leafy Greens",
    aliases: ["greens"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("lettuce", {
    label: "Lettuce",
    parents: ["leafy-greens"],
    implies: ["leafy-greens", "vegetable", "food", "ingredient"],
  }),
  tag("mushroom", {
    label: "Mushroom",
    aliases: ["fungus", "fungi"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("onion", {
    label: "Onion",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("peas", {
    label: "Peas",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("potato", {
    label: "Potato",
    parents: ["root-vegetable"],
    implies: ["root-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("pumpkin", {
    label: "Pumpkin",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("root-vegetable", {
    label: "Root Vegetable",
    aliases: ["root veg"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("spinach", {
    label: "Spinach",
    parents: ["leafy-greens"],
    implies: ["leafy-greens", "vegetable", "food", "ingredient"],
  }),
  tag("sweet-potato", {
    label: "Sweet Potato",
    parents: ["root-vegetable"],
    implies: ["root-vegetable", "vegetable", "food", "ingredient"],
  }),
  tag("tomato", {
    label: "Tomato",
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
  tag("zucchini", {
    label: "Zucchini",
    aliases: ["courgette"],
    parents: ["vegetable"],
    implies: ["vegetable", "food", "ingredient"],
  }),
];
