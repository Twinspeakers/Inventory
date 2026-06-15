import type { LibraryTagDefinition } from "../../types";
import { animalMaterialTags } from "./animal-materials";
import { craftedMaterialTags } from "./crafted-materials";
import { fabricTags } from "./fabrics";
import { generalMaterialTags } from "./general";
import { metalTags } from "./metals";
import { naturalMaterialTags } from "./natural-materials";

export const materialTags: LibraryTagDefinition[] = [
  ...animalMaterialTags,
  ...craftedMaterialTags,
  ...fabricTags,
  ...generalMaterialTags,
  ...metalTags,
  ...naturalMaterialTags,
];

export {
  animalMaterialTags,
  craftedMaterialTags,
  fabricTags,
  generalMaterialTags,
  metalTags,
  naturalMaterialTags,
};
