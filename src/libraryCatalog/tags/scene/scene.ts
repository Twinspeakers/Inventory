import { tag } from "../../tag";

export const sceneTags = [
  tag("autumn", {
    label: "Autumn",
    aliases: ["fall season", "fall"],
  }),
  tag("cozy", {
    label: "Cozy",
    aliases: ["snug", "comfortable"],
  }),
  tag("crowded-scene", {
    label: "Crowded",
    aliases: ["busy scene", "packed scene"],
  }),
  tag("daytime", {
    label: "Day",
    aliases: ["daytime", "daylight"],
    related: ["sunrise", "sunset"],
  }),
  tag("empty-scene", {
    label: "Empty Scene",
    aliases: ["vacant scene", "unoccupied scene"],
  }),
  tag("foggy", {
    label: "Foggy",
    aliases: ["misty", "hazy"],
  }),
  tag("indoor-scene", {
    label: "Indoor",
    aliases: ["inside", "interior scene"],
    related: ["room", "building"],
  }),
  tag("moody", {
    label: "Moody",
    aliases: ["atmospheric", "dramatic mood"],
  }),
  tag("nighttime", {
    label: "Night",
    aliases: ["nighttime", "after dark"],
    related: ["moon", "stars"],
  }),
  tag("outdoor-scene", {
    label: "Outdoor",
    aliases: ["outside", "exterior scene"],
    related: ["terrain", "location"],
  }),
  tag("overcast", {
    label: "Overcast",
    aliases: ["cloudy", "gray sky"],
  }),
  tag("rainy", {
    label: "Rain",
    aliases: ["rainy", "raining"],
  }),
  tag("snowy", {
    label: "Snow",
    aliases: ["snowy", "snowing"],
    implies: ["winter"],
  }),
  tag("spring", {
    label: "Spring",
    aliases: ["spring season"],
  }),
  tag("stormy", {
    label: "Storm",
    aliases: ["stormy", "thunderstorm"],
  }),
  tag("summer", {
    label: "Summer",
    aliases: ["summer season"],
  }),
  tag("tense", {
    label: "Tense",
    aliases: ["uneasy", "high tension"],
  }),
  tag("warm-light", {
    label: "Warm Light",
    aliases: ["warm lighting", "golden light"],
    related: ["sunset", "candle", "fireplace"],
  }),
  tag("winter", {
    label: "Winter",
    aliases: ["winter season"],
  }),
  tag("cool-light", {
    label: "Cool Light",
    aliases: ["cool lighting", "blue light"],
    related: ["nighttime", "overcast"],
  }),
];
