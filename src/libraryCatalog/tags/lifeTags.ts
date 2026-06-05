import { tag } from "../tag";

export const lifeTags = [
  tag("person", {
    label: "Person",
    aliases: ["human", "people", "humanoid"],
  }),
  tag("character", {
    label: "Character",
    aliases: ["npc", "avatar", "hero", "protagonist"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("player", {
    label: "Player",
    aliases: ["playable character", "main character"],
    parents: ["character"],
    implies: ["character", "person"],
  }),
  tag("animal", {
    label: "Animal",
    aliases: ["creature", "fauna", "wildlife"],
  }),
  tag("bird", {
    label: "Bird",
    aliases: ["avian", "fowl"],
    parents: ["animal"],
    implies: ["animal"],
  }),
  tag("farm-animal", {
    label: "Farm Animal",
    aliases: ["livestock", "barnyard"],
    parents: ["animal"],
    implies: ["animal", "farm"],
  }),
  tag("chicken", {
    label: "Chicken",
    aliases: ["hen", "rooster", "chick"],
    parents: ["bird", "farm-animal"],
    implies: ["bird", "farm-animal", "animal"],
    related: ["egg", "feather", "farm"],
  }),
  tag("plant", {
    label: "Plant",
    aliases: ["flora", "foliage"],
    parents: ["nature"],
    implies: ["nature"],
  }),
  tag("tree", {
    label: "Tree",
    aliases: ["sapling", "trunk"],
    parents: ["plant", "nature"],
    implies: ["plant", "nature", "wood"],
  }),
  tag("log", {
    label: "Log",
    aliases: ["timber"],
    parents: ["wood", "nature"],
    implies: ["wood", "tree", "nature"],
  }),
  tag("rock", {
    label: "Rock",
    aliases: ["stone", "boulder", "pebble"],
    parents: ["nature"],
    implies: ["stone", "nature"],
  }),
];
