import { tag } from "../../tag";

export const fishTags = [
  tag("eel", {
    label: "Eel",
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
  tag("fish", {
    label: "Fish",
    aliases: ["aquatic animal"],
    parents: ["animal", "water"],
    implies: ["animal", "water"],
  }),
  tag("freshwater-fish", {
    label: "Freshwater Fish",
    aliases: ["trout", "salmon", "bass", "carp", "catfish", "pike"],
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
  tag("ocean-fish", {
    label: "Ocean Fish",
    aliases: ["tuna", "cod", "herring", "sardine", "mackerel", "anchovy"],
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
  tag("ray", {
    label: "Ray",
    aliases: ["stingray", "manta ray"],
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
  tag("seahorse", {
    label: "Seahorse",
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
  tag("shark", {
    label: "Shark",
    aliases: ["great white", "hammerhead"],
    parents: ["fish"],
    implies: ["fish", "animal", "water"],
    matches: ["fish"],
  }),
];
