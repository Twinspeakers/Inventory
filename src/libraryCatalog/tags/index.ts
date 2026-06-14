import type { LibraryTagDefinition } from "../types";
import { hobbyTags, professionTags, skillTags, sportTags } from "./activities";
import {
  attractionTags,
  biomeTags,
  buildingTags,
  cityTags,
  countryTags,
  destinationTags,
  locationTags,
  roomTags,
} from "./environment";
import {
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
} from "./food";
import { clothesTags, footwearTags, furnitureTags, houseRoomTags } from "./household";
import { materialTags } from "./materials/materials";
import { landscapeTags } from "./nature/landscapes";
import { naturalObjectTags } from "./nature/naturalObjects";
import { natureGroupTags } from "./nature/natureGroups";
import { plantTags } from "./nature/plants";
import { skyWeatherWaterTags } from "./nature/skyWeatherWater";
import { objectTags } from "./objects/objects";
import {
  amphibianTags,
  birdTags,
  ethnicityTags,
  fishTags,
  genderTags,
  humanoidTags,
  insectTags,
  invertebrateTags,
  mammalTags,
  reptileTags,
  rootAnimalTags,
} from "./species";
import { styleTags } from "./styles/styles";
import { systemTags } from "./system/system";

export type LibraryTagSourceFile = {
  id: string;
  label: string;
  tags: LibraryTagDefinition[];
};

export type LibraryTagSourceFolder = {
  files: LibraryTagSourceFile[];
  folders?: LibraryTagSourceFolder[];
  id: string;
  label: string;
};

export type LibraryTagSourceSection = LibraryTagSourceFolder;

export const libraryTagSourceSections: LibraryTagSourceSection[] = [
  {
    id: "system",
    label: "System",
    files: [{ id: "system", label: "system.ts", tags: systemTags }],
  },
  {
    id: "species",
    label: "Species",
    files: [],
    folders: [
      {
        id: "animals",
        label: "Animals",
        files: [{ id: "animals", label: "animals.ts", tags: rootAnimalTags }],
        folders: [
          {
            id: "amphibians",
            label: "Amphibians",
            files: [{ id: "amphibians", label: "amphibians.ts", tags: amphibianTags }],
          },
          {
            id: "birds",
            label: "Birds",
            files: [{ id: "birds", label: "birds.ts", tags: birdTags }],
          },
          {
            id: "fish",
            label: "Fish",
            files: [{ id: "fish", label: "fish.ts", tags: fishTags }],
          },
          {
            id: "insects",
            label: "Insects",
            files: [{ id: "insects", label: "insects.ts", tags: insectTags }],
          },
          {
            id: "invertebrates",
            label: "Invertebrates",
            files: [{ id: "invertebrates", label: "invertebrates.ts", tags: invertebrateTags }],
          },
          {
            id: "mammals",
            label: "Mammals",
            files: [{ id: "mammals", label: "mammals.ts", tags: mammalTags }],
          },
          {
            id: "reptiles",
            label: "Reptiles",
            files: [{ id: "reptiles", label: "reptiles.ts", tags: reptileTags }],
          },
        ],
      },
      {
        id: "people",
        label: "People",
        files: [
          { id: "ethnicities", label: "ethnicities.ts", tags: ethnicityTags },
          { id: "genders", label: "genders.ts", tags: genderTags },
          { id: "humanoids", label: "humanoids.ts", tags: humanoidTags },
        ],
      },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    files: [
      { id: "landscapes", label: "landscapes.ts", tags: landscapeTags },
      { id: "naturalObjects", label: "naturalObjects.ts", tags: naturalObjectTags },
      { id: "natureGroups", label: "natureGroups.ts", tags: natureGroupTags },
      { id: "plants", label: "plants.ts", tags: plantTags },
      { id: "skyWeatherWater", label: "skyWeatherWater.ts", tags: skyWeatherWaterTags },
    ],
  },
  {
    id: "food",
    label: "Food",
    files: [
      { id: "food", label: "food.ts", tags: foodTags },
      { id: "courses", label: "courses.ts", tags: courseTags },
      { id: "dayparts", label: "dayparts.ts", tags: daypartTags },
      { id: "meals", label: "meals.ts", tags: mealTags },
      { id: "savoury", label: "savoury.ts", tags: savouryTags },
      { id: "sweet", label: "sweet.ts", tags: sweetTags },
    ],
    folders: [
      {
        id: "perishables",
        label: "Perishables",
        files: [
          { id: "berries", label: "berries.ts", tags: berryTags },
          { id: "dairy", label: "dairy.ts", tags: dairyTags },
          { id: "fruits", label: "fruits.ts", tags: fruitTags },
          { id: "vegetables", label: "vegetables.ts", tags: vegetableTags },
          { id: "meat", label: "meat.ts", tags: meatTags },
          { id: "poultry", label: "poultry.ts", tags: poultryTags },
        ],
      },
      {
        id: "non-perishables",
        label: "Non-Perishables",
        files: [
          { id: "pantry", label: "pantry.ts", tags: pantryTags },
          { id: "spices", label: "spices.ts", tags: spiceTags },
          { id: "preserves", label: "preserves.ts", tags: preserveTags },
          { id: "beverages", label: "beverages.ts", tags: beverageTags },
          { id: "snacks", label: "snacks.ts", tags: snackTags },
          { id: "household", label: "household.ts", tags: householdTags },
        ],
      },
    ],
  },
  {
    id: "materials",
    label: "Materials",
    files: [{ id: "materials", label: "materials.ts", tags: materialTags }],
  },
  {
    id: "household",
    label: "Household",
    files: [
      { id: "furniture", label: "furniture.ts", tags: furnitureTags },
      { id: "house-rooms", label: "house-rooms.ts", tags: houseRoomTags },
    ],
    folders: [
      {
        id: "bedroom",
        label: "Bedroom",
        files: [],
        folders: [
          {
            id: "wardrobe",
            label: "Wardrobe",
            files: [
              { id: "clothes", label: "clothes.ts", tags: clothesTags },
              { id: "footwear", label: "footwear.ts", tags: footwearTags },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    files: [
      { id: "hobbies", label: "hobbies.ts", tags: hobbyTags },
      { id: "professions", label: "professions.ts", tags: professionTags },
      { id: "sports", label: "sports.ts", tags: sportTags },
      { id: "skills", label: "skills.ts", tags: skillTags },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    files: [{ id: "objects", label: "objects.ts", tags: objectTags }],
  },
  {
    id: "environment",
    label: "Environment",
    files: [
      { id: "buildings", label: "buildings.ts", tags: buildingTags },
      { id: "rooms", label: "rooms.ts", tags: roomTags },
      { id: "locations", label: "locations.ts", tags: locationTags },
      { id: "cities", label: "cities.ts", tags: cityTags },
      { id: "countries", label: "countries.ts", tags: countryTags },
      { id: "attractions", label: "attractions.ts", tags: attractionTags },
      { id: "destinations", label: "destinations.ts", tags: destinationTags },
      { id: "biomes", label: "biomes.ts", tags: biomeTags },
    ],
  },
  {
    id: "styles",
    label: "Styles",
    files: [{ id: "styles", label: "styles.ts", tags: styleTags }],
  },
];

export const libraryTagDefinitions: LibraryTagDefinition[] = [
  ...libraryTagSourceSections.flatMap((section) => getSourceFolderTags(section)),
];

function getSourceFolderTags(folder: LibraryTagSourceFolder): LibraryTagDefinition[] {
  return [
    ...folder.files.flatMap((file) => file.tags),
    ...(folder.folders ?? []).flatMap((childFolder) => getSourceFolderTags(childFolder)),
  ];
}
