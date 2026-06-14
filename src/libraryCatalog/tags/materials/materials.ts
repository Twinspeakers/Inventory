import { tag } from "../../tag";

export const materialTags = [
  tag("bone", {
    label: "Bone",
    aliases: ["ivory", "skull"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("ceramic", {
    label: "Ceramic",
    aliases: ["clay", "pottery", "porcelain"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("dirt", {
    label: "Dirt",
    aliases: ["soil", "mud", "earth"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("fabric", {
    label: "Fabric",
    aliases: ["cloth", "textile", "linen", "cotton", "wool", "silk"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("fire", {
    label: "Fire",
    aliases: ["flame", "embers", "smoke"],
    parents: ["nature"],
    implies: ["nature"],
  }),
  tag("glass", {
    label: "Glass",
    aliases: ["crystal"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("ice", {
    label: "Ice",
    aliases: ["frost", "frozen"],
    parents: ["material", "water"],
    implies: ["material", "water"],
  }),
  tag("leather", {
    label: "Leather",
    aliases: ["hide"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("material", {
    label: "Material",
    aliases: ["materials", "substance"],
  }),
  tag("metal", {
    label: "Metal",
    aliases: ["metallic", "iron", "steel", "copper", "bronze", "gold", "silver"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("sand", {
    label: "Sand",
    aliases: ["sandy"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("stone", {
    label: "Stone",
    aliases: ["rock", "rocky"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("wood", {
    label: "Wood",
    aliases: ["timber", "wooden"],
    parents: ["material"],
    implies: ["material"],
  }),
];
