export type AmbiguousSenseDefinition = {
  defaultPriority?: number;
  id: string;
  negativeTerms?: string[];
  positiveTerms: string[];
  tagIds: string[];
};

export type AmbiguousSenseRule = {
  defaultSenseId?: string;
  id: string;
  senses: AmbiguousSenseDefinition[];
  triggerTerms: string[];
};

export const safeCrossDomainCollisionTerms = new Set([
  "architecture",
  "baking",
  "celestial",
  "closet",
  "cooking",
  "cultivation",
  "cupboard",
  "dish",
  "document",
  "drawing",
  "glass",
  "instrument",
  "letter",
  "light",
  "lookout",
  "reef",
  "sand",
  "sketch",
  "station",
  "storage",
  "study",
  "timber",
]);

// Only use defaultPriority when one sense should consistently win on sparse evidence.
// Leave it undefined for truly balanced ambiguities so filename context, tags, and parent
// placement can break ties naturally as the library grows.
export const ambiguousSenseRules: AmbiguousSenseRule[] = [
  {
    id: "bicycle",
    triggerTerms: ["bicycle"],
    defaultSenseId: "object",
    senses: [
      {
        id: "object",
        tagIds: ["bicycle"],
        positiveTerms: ["handlebar", "pedal", "road", "seat", "vehicle", "wheel"],
        defaultPriority: 1,
      },
      {
        id: "sport",
        tagIds: ["cycling"],
        positiveTerms: ["cycling", "helmet", "race", "sport", "trail"],
      },
    ],
  },
  {
    id: "blueprint",
    triggerTerms: ["blueprint"],
    defaultSenseId: "document",
    senses: [
      {
        id: "document",
        tagIds: ["blueprint-sheet"],
        positiveTerms: ["diagram", "drawing", "floorplan", "plan", "sheet"],
        defaultPriority: 1,
      },
      {
        id: "style",
        tagIds: ["blueprint"],
        positiveTerms: ["style", "theme", "ui", "visual"],
      },
    ],
  },
  {
    id: "chicken",
    triggerTerms: ["chicken"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["chicken"],
        positiveTerms: ["bird", "farm", "animal", "feather", "hen", "rooster", "coop"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["chicken-meat"],
        positiveTerms: ["breast", "drumstick", "fillet", "food", "fried", "ingredient", "meal", "meat", "recipe", "roast", "wing"],
      },
    ],
  },
  {
    id: "duck",
    triggerTerms: ["duck"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["duck"],
        positiveTerms: ["bird", "farm", "feather", "pond", "water"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["duck-meat"],
        positiveTerms: ["breast", "confit", "food", "ingredient", "meal", "meat", "recipe", "roast"],
      },
    ],
  },
  {
    id: "garden",
    triggerTerms: ["garden"],
    defaultSenseId: "place",
    senses: [
      {
        id: "place",
        tagIds: ["garden"],
        positiveTerms: ["bench", "flower", "hedge", "path", "place", "yard"],
        defaultPriority: 1,
      },
      {
        id: "activity",
        tagIds: ["gardening"],
        positiveTerms: ["activity", "cultivation", "gardening", "planting", "tool"],
      },
    ],
  },
  {
    id: "gathering",
    triggerTerms: ["gathering"],
    defaultSenseId: "event",
    senses: [
      {
        id: "event",
        tagIds: ["gathering-event"],
        positiveTerms: ["assembly", "celebration", "ceremony", "crowd", "event", "festival", "party", "social"],
        defaultPriority: 2,
      },
      {
        id: "activity",
        tagIds: ["collecting"],
        positiveTerms: ["archive", "collection", "curating", "gather", "hobby", "inventory", "sorting"],
      },
    ],
  },
  {
    id: "goose",
    triggerTerms: ["goose"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["goose"],
        positiveTerms: ["bird", "farm", "feather", "flock", "pond"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["goose-meat"],
        positiveTerms: ["breast", "food", "ingredient", "meal", "meat", "recipe", "roast"],
      },
    ],
  },
  {
    id: "kid",
    triggerTerms: ["kid"],
    defaultSenseId: "person",
    senses: [
      {
        id: "person",
        tagIds: ["child"],
        positiveTerms: ["boy", "child", "girl", "person", "school", "student"],
        defaultPriority: 1,
      },
      {
        id: "animal",
        tagIds: ["goat"],
        positiveTerms: ["farm", "goat", "horn", "hoof", "pasture"],
      },
    ],
  },
  {
    id: "lamb",
    triggerTerms: ["lamb"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["sheep"],
        positiveTerms: ["animal", "farm", "flock", "pasture", "wool"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["lamb-meat"],
        positiveTerms: ["chop", "food", "ingredient", "meal", "meat", "rack", "recipe", "roast"],
      },
    ],
  },
  {
    id: "mouse",
    triggerTerms: ["mouse"],
    senses: [
      {
        id: "animal",
        tagIds: ["rodent"],
        positiveTerms: ["animal", "rodent", "tail", "trap", "whisker"],
      },
      {
        id: "device",
        tagIds: ["mouse-device"],
        positiveTerms: ["click", "computer", "cursor", "gaming", "hardware", "usb"],
      },
    ],
  },
  {
    id: "forge",
    triggerTerms: ["forge"],
    defaultSenseId: "place",
    senses: [
      {
        id: "place",
        tagIds: ["workshop"],
        positiveTerms: ["anvil", "blacksmith", "building", "room", "shop", "smithy", "studio", "workroom", "workshop"],
        defaultPriority: 1,
      },
      {
        id: "object",
        tagIds: ["furnace"],
        positiveTerms: ["crafting", "furnace", "industrial", "metalworking", "prop", "smelter", "station"],
      },
    ],
  },
  {
    id: "frozen",
    triggerTerms: ["frozen"],
    defaultSenseId: "condition",
    senses: [
      {
        id: "condition",
        tagIds: ["frozen-state"],
        positiveTerms: ["cold", "ice covered", "state", "still frozen", "winter"],
        defaultPriority: 1,
      },
      {
        id: "material",
        tagIds: ["ice"],
        positiveTerms: ["frost", "glacier", "ice", "material", "snow", "water"],
      },
    ],
  },
  {
    id: "market",
    triggerTerms: ["market"],
    defaultSenseId: "place",
    senses: [
      {
        id: "place",
        tagIds: ["market"],
        positiveTerms: ["bazaar", "marketplace", "place", "shop", "stall", "street", "vendor"],
        defaultPriority: 2,
      },
      {
        id: "event",
        tagIds: ["market-event"],
        positiveTerms: ["crowd", "day", "event", "festival", "gathering", "seasonal", "street market"],
      },
    ],
  },
  {
    id: "metallic",
    triggerTerms: ["metallic"],
    defaultSenseId: "material",
    senses: [
      {
        id: "material",
        tagIds: ["metal"],
        positiveTerms: ["alloy", "iron", "material", "metal", "ore", "steel"],
        defaultPriority: 1,
      },
      {
        id: "texture",
        tagIds: ["metallic-map"],
        positiveTerms: ["map", "metalness", "pbr", "shader", "texture"],
      },
    ],
  },
  {
    id: "orange",
    triggerTerms: ["orange"],
    defaultSenseId: "style",
    senses: [
      {
        id: "style",
        tagIds: ["orange-color"],
        positiveTerms: ["cloth", "clothing", "color", "fabric", "palette", "shirt", "swatch", "ui"],
        defaultPriority: 1,
      },
      {
        id: "food",
        tagIds: ["orange"],
        positiveTerms: ["citrus", "food", "fruit", "ingredient", "juice", "peel", "slice"],
      },
    ],
  },
  {
    id: "salmon",
    triggerTerms: ["salmon"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["freshwater-fish"],
        positiveTerms: ["animal", "fish", "river", "water"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["salmon-fillet"],
        positiveTerms: ["fillet", "food", "ingredient", "meal", "recipe", "seafood"],
      },
    ],
  },
  {
    id: "shellfish",
    triggerTerms: ["shellfish"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["shellfish"],
        positiveTerms: ["animal", "crustacean", "ocean", "sea", "water"],
        defaultPriority: 1,
      },
      {
        id: "food",
        tagIds: ["seafood"],
        positiveTerms: ["food", "ingredient", "meal", "recipe", "seafood"],
      },
    ],
  },
  {
    id: "shrimp",
    triggerTerms: ["shrimp"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["shrimp"],
        positiveTerms: ["animal", "crustacean", "ocean", "sea", "water"],
        defaultPriority: 1,
      },
      {
        id: "food",
        tagIds: ["prawns"],
        positiveTerms: ["food", "fried", "ingredient", "meal", "prawn", "recipe", "seafood"],
      },
    ],
  },
  {
    id: "silver",
    triggerTerms: ["silver"],
    defaultSenseId: "style",
    senses: [
      {
        id: "style",
        tagIds: ["gray"],
        positiveTerms: ["color", "palette", "shirt", "swatch", "tone", "ui"],
        defaultPriority: 1,
      },
      {
        id: "material",
        tagIds: ["silver"],
        positiveTerms: ["ingot", "jewelry", "metal", "ore", "ring"],
      },
    ],
  },
  {
    id: "weathered",
    triggerTerms: ["weathered"],
    defaultSenseId: "surface",
    senses: [
      {
        id: "surface",
        tagIds: ["weathered-finish"],
        positiveTerms: ["finish", "patina", "rough", "sun worn", "surface", "texture"],
        defaultPriority: 1,
      },
      {
        id: "condition",
        tagIds: ["worn"],
        positiveTerms: ["aged", "condition", "damaged", "used", "worn"],
      },
    ],
  },
  {
    id: "sprite",
    triggerTerms: ["sprite"],
    defaultSenseId: "style",
    senses: [
      {
        id: "style",
        tagIds: ["pixel-art"],
        positiveTerms: ["16 bit", "8 bit", "game", "pixel", "sheet", "ui"],
        defaultPriority: 1,
      },
      {
        id: "person",
        tagIds: ["fairy"],
        positiveTerms: ["fae", "fantasy", "fairy", "forest", "winged"],
      },
    ],
  },
  {
    id: "tuna",
    triggerTerms: ["tuna"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["ocean-fish"],
        positiveTerms: ["animal", "fish", "ocean", "sea", "water"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["tuna"],
        positiveTerms: ["can", "food", "ingredient", "meal", "recipe", "sandwich", "seafood"],
      },
    ],
  },
  {
    id: "turkey",
    triggerTerms: ["turkey"],
    defaultSenseId: "animal",
    senses: [
      {
        id: "animal",
        tagIds: ["turkey"],
        positiveTerms: ["bird", "farm", "feather", "flock"],
        defaultPriority: 2,
      },
      {
        id: "food",
        tagIds: ["turkey-meat"],
        positiveTerms: ["breast", "food", "ingredient", "meal", "meat", "recipe", "roast", "sandwich"],
      },
      {
        id: "place",
        tagIds: ["country-turkiye"],
        positiveTerms: ["country", "flag", "istanbul", "map", "travel", "turkiye"],
      },
    ],
  },
];
