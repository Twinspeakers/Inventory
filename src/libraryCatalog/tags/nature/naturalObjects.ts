import { tag } from "../../tag";

export const naturalObjectTags = [
  tag("leaf", {
    label: "Leaf",
    aliases: ["leaves"],
    parents: ["plant"],
    implies: ["plant", "nature"],
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
  tag("seed", {
    label: "Seed",
    aliases: ["seeds"],
    parents: ["plant", "ingredient"],
    implies: ["plant", "nature", "ingredient"],
  }),
];
