import { rootAnimalTags } from "./animals";
import { amphibianTags } from "./amphibians";
import { birdTags } from "./birds";
import { catTags } from "./cats";
import { dogTags } from "./dogs";
import { fishTags } from "./fish";
import { insectTags } from "./insects";
import { invertebrateTags } from "./invertebrates";
import { mammalTags } from "./mammals";
import { reptileTags } from "./reptiles";

export const animalTags = [
  ...rootAnimalTags,
  ...amphibianTags,
  ...birdTags,
  ...catTags,
  ...dogTags,
  ...fishTags,
  ...insectTags,
  ...invertebrateTags,
  ...mammalTags,
  ...reptileTags,
];

export {
  amphibianTags,
  birdTags,
  catTags,
  dogTags,
  fishTags,
  insectTags,
  invertebrateTags,
  mammalTags,
  reptileTags,
  rootAnimalTags,
};
