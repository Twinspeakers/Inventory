import { tag } from "../../../tag";

export const genderTags = [
  tag("agender", {
    label: "Agender",
    aliases: ["genderless"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
  tag("androgynous", {
    label: "Androgynous",
    aliases: ["gender ambiguous", "androgyne"],
    parents: ["gender-presentation"],
    implies: ["gender-presentation", "person"],
  }),
  tag("feminine", {
    label: "Feminine",
    aliases: ["femme", "feminine presentation"],
    parents: ["gender-presentation"],
    implies: ["gender-presentation", "person"],
  }),
  tag("gender", {
    label: "Gender",
    aliases: ["gender identity"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("gender-presentation", {
    label: "Gender Presentation",
    aliases: ["presentation", "gender expression"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("genderfluid", {
    label: "Genderfluid",
    aliases: ["fluid gender"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
  tag("man", {
    label: "Man",
    aliases: ["male", "masculine person"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
  tag("masculine", {
    label: "Masculine",
    aliases: ["masc", "masculine presentation"],
    parents: ["gender-presentation"],
    implies: ["gender-presentation", "person"],
  }),
  tag("nonbinary", {
    label: "Nonbinary",
    aliases: ["non-binary", "enby"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
  tag("transgender", {
    label: "Transgender",
    aliases: ["trans"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
  tag("woman", {
    label: "Woman",
    aliases: ["female", "feminine person"],
    parents: ["gender"],
    implies: ["gender", "person"],
  }),
];
