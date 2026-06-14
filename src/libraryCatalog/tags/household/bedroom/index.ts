import type { LibraryTagDefinition } from "../../../types";
import { clothesTags } from "./wardrobe/clothes";
import { footwearTags } from "./wardrobe/footwear";

export const bedroomTags: LibraryTagDefinition[] = [...clothesTags, ...footwearTags];

export { clothesTags, footwearTags };
