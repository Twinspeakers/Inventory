import { tag } from "../../tag";

export const foliageTags = [
  tag("branch", {
    label: "Branch",
    aliases: ["twig", "bough"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life", "wood"],
  }),
  tag("bush", {
    label: "Bush",
    aliases: ["shrub", "hedge"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
  tag("fern", {
    label: "Fern",
    aliases: ["frond plant"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
  tag("foliage", {
    label: "Foliage",
    aliases: ["leafage", "plant growth"],
    parents: ["plant-life"],
    implies: ["plant-life"],
  }),
  tag("grass", {
    label: "Grass",
    aliases: ["lawn", "turf"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
  tag("leaf", {
    label: "Leaf",
    aliases: ["leaves"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
  tag("moss", {
    label: "Moss",
    aliases: ["ground cover"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
  tag("plant-life", {
    label: "Plant Life",
    aliases: ["flora", "vegetation", "greenery"],
  }),
  tag("sapling", {
    label: "Sapling",
    aliases: ["young tree", "seedling"],
    parents: ["tree"],
    implies: ["tree", "plant-life"],
  }),
  tag("seed", {
    label: "Seed",
    aliases: ["seeds", "plant seed"],
    parents: ["plant-life", "ingredient"],
    implies: ["plant-life", "ingredient"],
  }),
  tag("vine", {
    label: "Vine",
    aliases: ["creeper", "ivy"],
    parents: ["foliage"],
    implies: ["foliage", "plant-life"],
  }),
];
