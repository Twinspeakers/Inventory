import type { LibraryTagDefinition } from "../../types";
import { artSupplyTags } from "./art-supplies";
import { accessoryTags } from "./clothing/accessories";
import { bottomTags } from "./clothing/bottoms";
import { footwearTags } from "./clothing/footwear";
import { fullBodyClothingTags } from "./clothing/full-body-clothing";
import { handwearTags } from "./clothing/handwear";
import { headwearTags } from "./clothing/headwear";
import { topTags } from "./clothing/tops";
import { underwearTags } from "./clothing/underwear";
import { containerTags } from "./containers";
import { decorTags } from "./decor";
import { documentTags } from "./documents";
import { electronicsTags } from "./electronics";
import { furnitureTags } from "./furniture";
import { householdItemTags } from "./household-items";
import { industrialTags } from "./industrial";
import { kitchenwareTags } from "./kitchenware";
import { medicalTags } from "./medical";
import { musicalInstrumentTags } from "./musical-instruments";
import { officeTags } from "./office";
import { objectTags } from "./objects";
import { toolTags } from "./tools";
import { toyGameTags } from "./toys-games";
import { vehicleTags } from "./vehicles";
import { weaponTags } from "./weapons";

export const clothingTags: LibraryTagDefinition[] = [
  ...accessoryTags,
  ...headwearTags,
  ...topTags,
  ...handwearTags,
  ...bottomTags,
  ...underwearTags,
  ...fullBodyClothingTags,
  ...footwearTags,
];

export const allObjectTags: LibraryTagDefinition[] = [
  ...objectTags,
  ...containerTags,
  ...toolTags,
  ...vehicleTags,
  ...kitchenwareTags,
  ...officeTags,
  ...documentTags,
  ...electronicsTags,
  ...toyGameTags,
  ...musicalInstrumentTags,
  ...artSupplyTags,
  ...weaponTags,
  ...medicalTags,
  ...decorTags,
  ...householdItemTags,
  ...industrialTags,
  ...furnitureTags,
  ...clothingTags,
];

export {
  accessoryTags,
  artSupplyTags,
  bottomTags,
  containerTags,
  decorTags,
  documentTags,
  electronicsTags,
  footwearTags,
  fullBodyClothingTags,
  furnitureTags,
  handwearTags,
  headwearTags,
  householdItemTags,
  industrialTags,
  kitchenwareTags,
  medicalTags,
  musicalInstrumentTags,
  objectTags,
  officeTags,
  topTags,
  toolTags,
  toyGameTags,
  underwearTags,
  vehicleTags,
  weaponTags,
};
