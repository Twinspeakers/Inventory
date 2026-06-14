import { tag } from "../../../tag";

export const ethnicityTags = [
  tag("african", {
    label: "African",
    aliases: ["african ethnicity", "african heritage"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("asian", {
    label: "Asian",
    aliases: ["asian ethnicity", "asian heritage"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("black-heritage", {
    label: "Black",
    aliases: ["black person", "black heritage"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("ethnicity", {
    label: "Ethnicity",
    aliases: ["ethnic group", "heritage", "ancestry"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("european", {
    label: "European",
    aliases: ["european ethnicity", "european heritage"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("indigenous", {
    label: "Indigenous",
    aliases: ["first nations", "native peoples", "aboriginal"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("latine", {
    label: "Latine",
    aliases: ["latino", "latina", "latinx", "latin american"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("middle-eastern", {
    label: "Middle Eastern",
    aliases: ["middle eastern ethnicity", "west asian", "north african"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("multiracial", {
    label: "Multiracial",
    aliases: ["mixed race", "multiethnic"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("pacific-islander", {
    label: "Pacific Islander",
    aliases: ["pasifika", "oceanian"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
  tag("south-asian", {
    label: "South Asian",
    aliases: ["indian subcontinent", "desi"],
    parents: ["asian"],
    implies: ["asian", "ethnicity", "person"],
  }),
  tag("white-heritage", {
    label: "White",
    aliases: ["white person", "caucasian"],
    parents: ["ethnicity"],
    implies: ["ethnicity", "person"],
  }),
];
