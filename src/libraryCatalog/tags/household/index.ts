import type { LibraryTagDefinition } from "../../types";
import { bedroomTags, clothesTags, footwearTags } from "./bedroom";
import { furnitureTags } from "./furniture";
import { houseRoomTags } from "./house-rooms";

export const householdTags: LibraryTagDefinition[] = [...houseRoomTags, ...furnitureTags, ...bedroomTags];

export { bedroomTags, clothesTags, footwearTags, furnitureTags, houseRoomTags };
