import type { LibraryTagDefinition } from "../../types";
import { courseTags } from "./courses";
import { daypartTags } from "./dayparts";
import { mealTags } from "./meals";
import { beverageTags } from "./non-perishables/beverages";
import { householdTags } from "./non-perishables/household";
import { pantryTags } from "./non-perishables/pantry";
import { preserveTags } from "./non-perishables/preserves";
import { snackTags } from "./non-perishables/snacks";
import { spiceTags } from "./non-perishables/spices";
import { foodTags } from "./food";
import { savouryTags } from "./savoury";
import { sweetTags } from "./sweet";
import { berryTags } from "./perishables/berries";
import { dairyTags } from "./perishables/dairy";
import { fruitTags } from "./perishables/fruits";
import { meatTags } from "./perishables/meat";
import { poultryTags } from "./perishables/poultry";
import { vegetableTags } from "./perishables/vegetables";

export const allFoodTags: LibraryTagDefinition[] = [
  ...foodTags,
  ...courseTags,
  ...daypartTags,
  ...mealTags,
  ...sweetTags,
  ...savouryTags,
  ...berryTags,
  ...dairyTags,
  ...fruitTags,
  ...vegetableTags,
  ...meatTags,
  ...poultryTags,
  ...pantryTags,
  ...spiceTags,
  ...preserveTags,
  ...beverageTags,
  ...snackTags,
  ...householdTags,
];

export {
  beverageTags,
  berryTags,
  courseTags,
  dairyTags,
  daypartTags,
  foodTags,
  fruitTags,
  householdTags,
  mealTags,
  meatTags,
  pantryTags,
  poultryTags,
  preserveTags,
  savouryTags,
  snackTags,
  spiceTags,
  sweetTags,
  vegetableTags,
};
