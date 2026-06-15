import type { LibraryNodeTemplate } from "../types";

type LibraryNodeTemplateOverride = Partial<LibraryNodeTemplate>;

export const libraryNodeTemplateOverrides: Record<string, LibraryNodeTemplateOverride> = {
  "3d-objects": {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:food",
      "tag:environment",
      "tag:natural-world",
      "tag:objects",
      "tag:materials",
      "tag:styles",
    ],
    childSuggestions: [],
  },
  animals: {
    childSuggestionIds: ["tag:animals"],
  },
  archives: {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:food",
      "tag:environment",
      "tag:natural-world",
      "tag:objects",
      "tag:materials",
      "tag:activities",
      "tag:styles",
    ],
  },
  audio: {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:environment",
      "tag:natural-world",
      "tag:activities",
      "tag:styles",
    ],
  },
  characters: {
    childSuggestionIds: ["tag:people", "tag:objects/clothing"],
  },
  creatures: {
    childSuggestionIds: ["tag:animals", "tag:natural-world"],
  },
  documents: {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:food",
      "tag:environment",
      "tag:natural-world",
      "tag:objects",
      "tag:materials",
      "tag:activities",
      "tag:styles",
    ],
  },
  "environment-pieces": {
    childSuggestionIds: ["tag:environment", "tag:natural-world", "tag:objects"],
  },
  food: {
    childSuggestionIds: [
      "tag:food",
      "tag:food/dishes",
      "tag:food/ingredients",
      "tag:food/beverages",
      "tag:food/storage",
    ],
  },
  images: {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:food",
      "tag:environment",
      "tag:natural-world",
      "tag:objects",
      "tag:materials",
      "tag:styles",
    ],
  },
  items: {
    childSuggestionIds: ["tag:objects", "tag:materials", "tag:food"],
  },
  nature: {
    childSuggestionIds: [
      "tag:natural-world",
      "tag:natural-world/flowers",
      "tag:natural-world/foliage",
      "tag:natural-world/rocks",
      "tag:natural-world/terrain",
      "tag:natural-world/trees",
    ],
  },
  props: {
    childSuggestionIds: ["tag:objects", "tag:materials", "tag:food"],
  },
  "source-files": {
    childSuggestionIds: [
      "tag:people",
      "tag:animals",
      "tag:food",
      "tag:environment",
      "tag:natural-world",
      "tag:objects",
      "tag:materials",
      "tag:activities",
      "tag:styles",
    ],
  },
  trees: {
    childSuggestionIds: ["tag:natural-world/trees", "tag:natural-world/foliage"],
  },
  "tag:activities": {
    aliases: ["skills", "sports", "hobbies"],
    category: "Taxonomy",
    description: "Activity-focused folders generated from the tag library, including hobbies, sports, and skills.",
  },
  "tag:animals": {
    aliases: ["creatures", "wildlife", "fauna"],
    category: "Taxonomy",
    description: "Animal-focused folders generated from the tag library, covering broad animal groups and species clusters.",
  },
  "tag:environment": {
    aliases: ["places", "locations", "built environment"],
    category: "Taxonomy",
    description: "Place-focused folders generated from the tag library, from rooms and buildings to cities and destinations.",
  },
  "tag:food": {
    aliases: ["cooking", "ingredients", "dishes"],
    category: "Taxonomy",
    description: "Food-focused folders generated from the tag library, including ingredients, dishes, storage, and beverages.",
  },
  "tag:materials": {
    aliases: ["substances", "resources"],
    category: "Taxonomy",
    description: "Material-focused folders generated from the tag library, including natural, crafted, fabric, metal, and animal materials.",
  },
  "tag:natural-world": {
    aliases: ["nature", "outdoors"],
    category: "Taxonomy",
    description: "Natural-world folders generated from the tag library, covering terrain, ecosystems, celestial subjects, plants, and rocks.",
  },
  "tag:objects": {
    aliases: ["props", "items"],
    category: "Taxonomy",
    description: "Object-focused folders generated from the tag library, covering practical object groupings and clothing.",
  },
  "tag:objects/clothing": {
    aliases: ["apparel", "garments"],
    description: "Clothing folders generated from the tag library, including accessories, tops, bottoms, footwear, and more.",
  },
  "tag:people": {
    aliases: ["persons", "characters", "humans"],
    category: "Taxonomy",
    description: "People-focused folders generated from the tag library, including roles, relationships, age groups, and humanoids.",
  },
  "tag:people/roles": {
    aliases: ["jobs", "professions"],
  },
  "tag:styles": {
    aliases: ["looks", "aesthetics"],
    category: "Taxonomy",
    description: "Style-focused folders generated from the tag library.",
  },
};
