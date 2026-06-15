import type { LibraryTagDefinition } from "../../types";
import { beverageTags } from "./beverages";
import { dietNutritionTags } from "./diets-nutrition";
import { courseTags } from "./dishes/courses";
import { mealTags } from "./dishes/meals";
import { savouryTags } from "./dishes/savoury";
import { snackTags } from "./dishes/snacks";
import { sweetTags } from "./dishes/sweet";
import { foodTags } from "./general";
import {
  animalProductTags,
  dairyTags,
  meatTags,
  poultryTags,
} from "./ingredients/animal-products";
import {
  pantryIngredientTags,
  pantryTags,
  preserveTags,
  spiceTags,
} from "./ingredients/pantry";
import { berryTags, fruitTags, produceTags, vegetableTags } from "./ingredients/produce";
import { storageTags } from "./storage";

export const allFoodTags: LibraryTagDefinition[] = [
  ...foodTags,
  ...produceTags,
  ...animalProductTags,
  ...pantryIngredientTags,
  ...courseTags,
  ...mealTags,
  ...savouryTags,
  ...sweetTags,
  ...snackTags,
  ...beverageTags,
  ...dietNutritionTags,
  ...storageTags,
];

export {
  animalProductTags,
  beverageTags,
  berryTags,
  courseTags,
  dairyTags,
  dietNutritionTags,
  foodTags,
  fruitTags,
  mealTags,
  meatTags,
  pantryIngredientTags,
  pantryTags,
  poultryTags,
  preserveTags,
  produceTags,
  savouryTags,
  snackTags,
  spiceTags,
  storageTags,
  sweetTags,
  vegetableTags,
};
