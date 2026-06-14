import type { LibraryTagDefinition } from "../../types";
import {
  amphibianTags,
  animalTags,
  birdTags,
  fishTags,
  insectTags,
  invertebrateTags,
  mammalTags,
  reptileTags,
  rootAnimalTags,
} from "./animals";
import { ethnicityTags, genderTags, humanoidTags, peopleTags } from "./people";

export const speciesTags: LibraryTagDefinition[] = [
  ...animalTags,
  ...peopleTags,
];

export {
  amphibianTags,
  animalTags,
  birdTags,
  ethnicityTags,
  fishTags,
  genderTags,
  humanoidTags,
  insectTags,
  invertebrateTags,
  mammalTags,
  peopleTags,
  reptileTags,
  rootAnimalTags,
};
