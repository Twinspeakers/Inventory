import { tag } from "../../tag";

export const rockTags = [
  tag("boulder", {
    label: "Boulder",
    parents: ["rock"],
    implies: ["rock", "rock-formation", "stone"],
  }),
  tag("pebble", {
    label: "Pebble",
    aliases: ["small stone"],
    parents: ["rock"],
    implies: ["rock", "rock-formation", "stone"],
  }),
  tag("rock", {
    label: "Rock",
    aliases: ["rocky surface"],
    parents: ["rock-formation"],
    implies: ["rock-formation", "stone"],
  }),
  tag("rock-formation", {
    label: "Rock Formation",
    aliases: ["stone formation", "outcrop"],
  }),
];
