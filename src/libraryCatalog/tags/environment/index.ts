import type { LibraryTagDefinition } from "../../types";
import { attractionTags } from "./attractions";
import { biomeTags } from "./biomes";
import { buildingTags } from "./buildings";
import { cityTags } from "./cities";
import { countryTags } from "./countries";
import { destinationTags } from "./destinations";
import { locationTags } from "./locations";
import { roomTags } from "./rooms";

export const environmentTags: LibraryTagDefinition[] = [
  ...buildingTags,
  ...roomTags,
  ...locationTags,
  ...cityTags,
  ...countryTags,
  ...attractionTags,
  ...destinationTags,
  ...biomeTags,
];

export {
  attractionTags,
  biomeTags,
  buildingTags,
  cityTags,
  countryTags,
  destinationTags,
  locationTags,
  roomTags,
};
