import { tag } from "../../../tag";

export const invertebrateTags = [
  tag("coral", {
    label: "Coral",
    aliases: ["reef"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("crab", {
    label: "Crab",
    aliases: ["hermit crab"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("invertebrate", {
    label: "Invertebrate",
    aliases: ["worm", "snail", "slug", "jellyfish", "starfish"],
    parents: ["animal"],
    implies: ["animal"],
  }),
  tag("jellyfish", {
    label: "Jellyfish",
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("lobster", {
    label: "Lobster",
    aliases: ["crayfish", "crawfish"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("octopus", {
    label: "Octopus",
    aliases: ["squid", "cuttlefish"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("scorpion", {
    label: "Scorpion",
    parents: ["invertebrate"],
    implies: ["invertebrate", "animal"],
  }),
  tag("shellfish", {
    label: "Shellfish",
    aliases: ["clam", "oyster", "mussel", "scallop"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("shrimp", {
    label: "Shrimp",
    aliases: ["prawn", "krill"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("snail", {
    label: "Snail",
    aliases: ["slug"],
    parents: ["invertebrate"],
    implies: ["invertebrate", "animal"],
  }),
  tag("spider", {
    label: "Spider",
    aliases: ["arachnid", "tarantula"],
    parents: ["invertebrate"],
    implies: ["invertebrate", "animal"],
  }),
  tag("starfish", {
    label: "Starfish",
    aliases: ["sea star"],
    parents: ["invertebrate", "water"],
    implies: ["invertebrate", "animal", "water"],
  }),
  tag("worm", {
    label: "Worm",
    aliases: ["earthworm", "leech"],
    parents: ["invertebrate"],
    implies: ["invertebrate", "animal"],
  }),
];
