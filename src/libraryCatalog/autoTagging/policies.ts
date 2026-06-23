export const MAX_IMAGE_AUTO_TAGS = 4;

export const allowedImageAutoTagIds = new Set([
  "animal",
  "beach",
  "building",
  "food",
  "flower",
  "fruit",
  "paper-document",
  "plant-life",
  "road",
  "room",
  "terrain",
  "tree",
  "vehicle",
]);

export const blockedImageAutoTagIds = new Set([
  "activity",
  "architecture",
  "city",
  "country",
  "event",
  "landmark",
  "location",
  "meal",
  "person",
  "place",
  "role",
  "style",
]);

export const imageAutoTagMinScores: Record<string, number> = {
  animal: 0.18,
  beach: 0.2,
  building: 0.18,
  food: 0.18,
  flower: 0.18,
  fruit: 0.16,
  "paper-document": 0.28,
  "plant-life": 0.22,
  road: 0.18,
  room: 0.18,
  terrain: 0.18,
  tree: 0.18,
  vehicle: 0.18,
};
