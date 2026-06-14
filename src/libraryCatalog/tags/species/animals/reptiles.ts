import { tag } from "../../../tag";

export const reptileTags = [
  tag("crocodile", {
    label: "Crocodile",
    aliases: ["alligator", "caiman", "gharial"],
    parents: ["reptile", "water"],
    implies: ["reptile", "animal", "water"],
  }),
  tag("dinosaur", {
    label: "Dinosaur",
    aliases: ["tyrannosaurus", "triceratops", "raptor", "sauropod"],
    parents: ["reptile"],
    implies: ["reptile", "animal"],
  }),
  tag("lizard", {
    label: "Lizard",
    aliases: ["gecko", "iguana", "chameleon", "monitor lizard"],
    parents: ["reptile"],
    implies: ["reptile", "animal"],
  }),
  tag("reptile", {
    label: "Reptile",
    aliases: ["lizard", "snake", "turtle", "crocodile"],
    parents: ["animal"],
    implies: ["animal"],
  }),
  tag("snake", {
    label: "Snake",
    aliases: ["python", "cobra", "viper", "boa"],
    parents: ["reptile"],
    implies: ["reptile", "animal"],
  }),
  tag("turtle", {
    label: "Turtle",
    aliases: ["tortoise", "terrapin"],
    parents: ["reptile"],
    implies: ["reptile", "animal"],
  }),
];
