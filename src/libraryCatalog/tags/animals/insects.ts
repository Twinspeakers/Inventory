import { tag } from "../../tag";

export const insectTags = [
  tag("ant", {
    label: "Ant",
    aliases: ["termite"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("bee", {
    label: "Bee",
    aliases: ["wasp", "hornet"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("beetle", {
    label: "Beetle",
    aliases: ["ladybug", "scarab"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("butterfly", {
    label: "Butterfly",
    aliases: ["moth", "caterpillar"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("dragonfly", {
    label: "Dragonfly",
    aliases: ["damselfly"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("fly", {
    label: "Fly",
    aliases: ["mosquito", "gnat"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("grasshopper", {
    label: "Grasshopper",
    aliases: ["cricket", "locust"],
    parents: ["insect"],
    implies: ["insect", "animal"],
  }),
  tag("insect", {
    label: "Insect",
    aliases: ["bug", "beetle", "butterfly", "moth"],
    parents: ["animal"],
    implies: ["animal"],
  }),
];
