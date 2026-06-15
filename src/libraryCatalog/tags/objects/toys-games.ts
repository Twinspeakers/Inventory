import { tag } from "../../tag";

export const toyGameTags = [
  tag("toy-game", {
    label: "Toy or Game",
    aliases: ["toy", "game item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("ball", {
    label: "Ball",
    parents: ["toy-game"],
    implies: ["toy-game", "prop"],
  }),
  tag("board-game", {
    label: "Board Game",
    parents: ["toy-game"],
    implies: ["toy-game", "prop"],
  }),
  tag("dice", {
    label: "Dice",
    aliases: ["die"],
    parents: ["toy-game"],
    implies: ["toy-game", "prop"],
  }),
  tag("doll", {
    label: "Doll",
    parents: ["toy-game"],
    implies: ["toy-game", "prop"],
  }),
  tag("playing-cards", {
    label: "Playing Cards",
    aliases: ["cards", "deck of cards"],
    parents: ["toy-game"],
    implies: ["toy-game", "prop", "paper"],
  }),
  tag("puzzle", {
    label: "Puzzle",
    parents: ["toy-game"],
    implies: ["toy-game", "prop"],
  }),
  tag("teddy-bear", {
    label: "Teddy Bear",
    aliases: ["stuffed bear"],
    parents: ["toy-game"],
    implies: ["toy-game", "prop", "fabric"],
  }),
];
