import { tag } from "../../tag";

export const naturalMaterialTags = [
  tag("clay", {
    label: "Clay",
    aliases: ["clay deposit"],
    parents: ["natural-material"],
    implies: ["natural-material", "material", "dirt"],
  }),
  tag("coal", {
    label: "Coal",
    aliases: ["coal seam"],
    parents: ["natural-material"],
    implies: ["natural-material", "material"],
  }),
  tag("dirt", {
    label: "Dirt",
    aliases: ["soil", "mud", "earth"],
    parents: ["natural-material"],
    implies: ["natural-material", "material"],
  }),
  tag("fire", {
    label: "Fire",
    aliases: ["flame", "embers", "smoke"],
    parents: ["natural-material"],
    implies: ["natural-material"],
  }),
  tag("granite", {
    label: "Granite",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("ice", {
    label: "Ice",
    aliases: ["frost", "frozen"],
    parents: ["natural-material", "water"],
    implies: ["natural-material", "material", "water"],
  }),
  tag("iron-ore", {
    label: "Iron Ore",
    aliases: ["iron deposit", "hematite", "magnetite"],
    parents: ["natural-material", "metal"],
    implies: ["natural-material", "metal", "material"],
  }),
  tag("limestone", {
    label: "Limestone",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("marble", {
    label: "Marble",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("natural-material", {
    label: "Natural Material",
    aliases: ["raw material", "natural resource"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("obsidian", {
    label: "Obsidian",
    aliases: ["volcanic glass"],
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("quartz", {
    label: "Quartz",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("sand", {
    label: "Sand",
    aliases: ["sandy"],
    parents: ["natural-material"],
    implies: ["natural-material", "material"],
  }),
  tag("sandstone", {
    label: "Sandstone",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material", "sand"],
  }),
  tag("slate", {
    label: "Slate",
    parents: ["stone"],
    implies: ["stone", "natural-material", "material"],
  }),
  tag("stone", {
    label: "Stone",
    aliases: ["rock material"],
    parents: ["natural-material"],
    implies: ["natural-material", "material"],
  }),
  tag("wood", {
    label: "Wood",
    aliases: ["timber", "wooden"],
    parents: ["natural-material"],
    implies: ["natural-material", "material"],
  }),
];
