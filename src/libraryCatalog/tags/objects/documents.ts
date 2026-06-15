import { tag } from "../../tag";

export const documentTags = [
  tag("paper-document", {
    label: "Document",
    aliases: ["document", "record", "paperwork"],
    parents: ["prop"],
    implies: ["prop", "paper"],
  }),
  tag("blueprint-sheet", {
    label: "Blueprint",
    aliases: ["blueprint", "plan drawing"],
    parents: ["paper-document"],
    implies: ["paper-document", "prop", "paper"],
  }),
  tag("book", {
    label: "Book",
    aliases: ["notebook", "journal", "tome"],
    parents: ["paper-document"],
    implies: ["paper-document", "prop", "paper"],
  }),
  tag("letter", {
    label: "Letter",
    aliases: ["mail", "written letter"],
    parents: ["paper-document"],
    implies: ["paper-document", "prop", "paper"],
  }),
  tag("map", {
    label: "Map",
    parents: ["paper-document"],
    implies: ["paper-document", "prop", "paper"],
    related: ["location"],
  }),
  tag("passport", {
    label: "Passport",
    parents: ["paper-document"],
    implies: ["paper-document", "prop", "paper"],
  }),
  tag("sign", {
    label: "Sign",
    aliases: ["signage", "placard", "poster"],
    parents: ["paper-document"],
    implies: ["paper-document", "prop"],
  }),
];
