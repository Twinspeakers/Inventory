import type { LibraryTagDefinition } from "../types";
import { hobbyTags, skillTags, sportTags } from "./activities";
import {
  amphibianTags,
  birdTags,
  fishTags,
  insectTags,
  invertebrateTags,
  mammalTags,
  reptileTags,
  rootAnimalTags,
} from "./animals";
import {
  animalProductTags,
  beverageTags,
  courseTags,
  dietNutritionTags,
  foodTags,
  mealTags,
  pantryIngredientTags,
  produceTags,
  savouryTags,
  snackTags,
  storageTags,
  sweetTags,
} from "./food";
import {
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
} from "./objects";
import { ageGroupTags, humanoidTags, relationshipTags, roleTags } from "./people";
import {
  attractionTags,
  buildingTags,
  cityTags,
  countryTags,
  destinationTags,
  locationTags,
  roomTags,
} from "./environment";
import {
  celestialTags,
  ecosystemTags,
  flowerTags,
  foliageTags,
  rockTags,
  terrainTags,
  treeTags,
} from "./natural-world";
import {
  animalMaterialTags,
  craftedMaterialTags,
  fabricTags,
  generalMaterialTags,
  metalTags,
  naturalMaterialTags,
} from "./materials";
import { styleTags } from "./styles/styles";
import { systemTags } from "./system/system";

export type LibraryTagSourceFile = {
  aliases?: string[];
  category?: string;
  description?: string;
  id: string;
  label: string;
  tags: LibraryTagDefinition[];
};

export type LibraryTagSourceFolder = {
  aliases?: string[];
  category?: string;
  description?: string;
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
    id: "people",
    label: "People",
    aliases: ["persons", "characters", "humans"],
    category: "Taxonomy",
    description: "People-focused folders sourced from the tag library, including roles, relationships, age groups, and humanoids.",
    files: [
      { id: "age-groups", label: "age-groups.ts", tags: ageGroupTags },
      { id: "humanoids", label: "humanoids.ts", tags: humanoidTags },
      { id: "relationships", label: "relationships.ts", tags: relationshipTags },
      {
        id: "roles",
        label: "roles.ts",
        aliases: ["jobs", "professions"],
        tags: roleTags,
      },
    ],
  },
  {
    id: "animals",
    label: "Animals",
    aliases: ["creatures", "wildlife", "fauna"],
    category: "Taxonomy",
    description: "Animal-focused folders sourced from the tag library, covering broad animal groups and species clusters.",
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
    id: "food",
    label: "Food",
    aliases: ["cooking", "ingredients", "dishes"],
    category: "Taxonomy",
    description: "Food-focused folders sourced from the tag library, including ingredients, dishes, storage, and beverages.",
    files: [
      { id: "general", label: "general.ts", tags: foodTags },
      { id: "beverages", label: "beverages.ts", tags: beverageTags },
      { id: "diets-nutrition", label: "diets-nutrition.ts", tags: dietNutritionTags },
      { id: "storage", label: "storage.ts", tags: storageTags },
    ],
    folders: [
      {
        id: "ingredients",
        label: "Ingredients",
        files: [
          { id: "produce", label: "produce.ts", tags: produceTags },
          { id: "animal-products", label: "animal-products.ts", tags: animalProductTags },
          { id: "pantry", label: "pantry.ts", tags: pantryIngredientTags },
        ],
      },
      {
        id: "dishes",
        label: "Dishes",
        files: [
          { id: "courses", label: "courses.ts", tags: courseTags },
          { id: "meals", label: "meals.ts", tags: mealTags },
          { id: "savoury", label: "savoury.ts", tags: savouryTags },
          { id: "sweet", label: "sweet.ts", tags: sweetTags },
          { id: "snacks", label: "snacks.ts", tags: snackTags },
        ],
      },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    aliases: ["places", "locations", "built environment"],
    category: "Taxonomy",
    description: "Place-focused folders sourced from the tag library, from rooms and buildings to cities and destinations.",
    files: [
      { id: "buildings", label: "buildings.ts", tags: buildingTags },
      { id: "rooms", label: "rooms.ts", tags: roomTags },
      { id: "locations", label: "locations.ts", tags: locationTags },
      { id: "cities", label: "cities.ts", tags: cityTags },
      { id: "countries", label: "countries.ts", tags: countryTags },
      { id: "attractions", label: "attractions.ts", tags: attractionTags },
      { id: "destinations", label: "destinations.ts", tags: destinationTags },
    ],
  },
  {
    id: "natural-world",
    label: "Natural World",
    aliases: ["nature", "outdoors"],
    category: "Taxonomy",
    description: "Natural-world folders sourced from the tag library, covering terrain, ecosystems, celestial subjects, plants, and rocks.",
    files: [
      { id: "celestial", label: "celestial.ts", tags: celestialTags },
      { id: "ecosystems", label: "ecosystems.ts", tags: ecosystemTags },
      { id: "flowers", label: "flowers.ts", tags: flowerTags },
      { id: "foliage", label: "foliage.ts", tags: foliageTags },
      { id: "rocks", label: "rocks.ts", tags: rockTags },
      { id: "terrain", label: "terrain.ts", tags: terrainTags },
      { id: "trees", label: "trees.ts", tags: treeTags },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    aliases: ["props", "items"],
    category: "Taxonomy",
    description: "Object-focused folders sourced from the tag library, covering practical object groupings and clothing.",
    files: [
      { id: "objects", label: "objects.ts", tags: objectTags },
      { id: "containers", label: "containers.ts", tags: containerTags },
      { id: "tools", label: "tools.ts", tags: toolTags },
      { id: "vehicles", label: "vehicles.ts", tags: vehicleTags },
      { id: "kitchenware", label: "kitchenware.ts", tags: kitchenwareTags },
      { id: "office", label: "office.ts", tags: officeTags },
      { id: "documents", label: "documents.ts", tags: documentTags },
      { id: "electronics", label: "electronics.ts", tags: electronicsTags },
      { id: "toys-games", label: "toys-games.ts", tags: toyGameTags },
      { id: "musical-instruments", label: "musical-instruments.ts", tags: musicalInstrumentTags },
      { id: "art-supplies", label: "art-supplies.ts", tags: artSupplyTags },
      { id: "weapons", label: "weapons.ts", tags: weaponTags },
      { id: "medical", label: "medical.ts", tags: medicalTags },
      { id: "decor", label: "decor.ts", tags: decorTags },
      { id: "household-items", label: "household-items.ts", tags: householdItemTags },
      { id: "industrial", label: "industrial.ts", tags: industrialTags },
      { id: "furniture", label: "furniture.ts", tags: furnitureTags },
    ],
    folders: [
      {
        id: "clothing",
        label: "Clothing",
        aliases: ["apparel", "garments"],
        description: "Clothing folders sourced from the tag library, including accessories, tops, bottoms, footwear, and more.",
        files: [
          { id: "accessories", label: "accessories.ts", tags: accessoryTags },
          { id: "headwear", label: "headwear.ts", tags: headwearTags },
          { id: "tops", label: "tops.ts", tags: topTags },
          { id: "handwear", label: "handwear.ts", tags: handwearTags },
          { id: "bottoms", label: "bottoms.ts", tags: bottomTags },
          { id: "underwear", label: "underwear.ts", tags: underwearTags },
          { id: "full-body-clothing", label: "full-body-clothing.ts", tags: fullBodyClothingTags },
          { id: "footwear", label: "footwear.ts", tags: footwearTags },
        ],
      },
    ],
  },
  {
    id: "materials",
    label: "Materials",
    aliases: ["substances", "resources"],
    category: "Taxonomy",
    description: "Material-focused folders sourced from the tag library, including natural, crafted, fabric, metal, and animal materials.",
    files: [
      { id: "general", label: "general.ts", tags: generalMaterialTags },
      { id: "animal-materials", label: "animal-materials.ts", tags: animalMaterialTags },
      { id: "crafted-materials", label: "crafted-materials.ts", tags: craftedMaterialTags },
      { id: "fabrics", label: "fabrics.ts", tags: fabricTags },
      { id: "metals", label: "metals.ts", tags: metalTags },
      { id: "natural-materials", label: "natural-materials.ts", tags: naturalMaterialTags },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    aliases: ["skills", "sports", "hobbies"],
    category: "Taxonomy",
    description: "Activity-focused folders sourced from the tag library, including hobbies, sports, and skills.",
    files: [
      { id: "hobbies", label: "hobbies.ts", tags: hobbyTags },
      { id: "sports", label: "sports.ts", tags: sportTags },
      { id: "skills", label: "skills.ts", tags: skillTags },
    ],
  },
  {
    id: "styles",
    label: "Styles",
    aliases: ["looks", "aesthetics"],
    category: "Taxonomy",
    description: "Style-focused folders sourced from the tag library.",
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
