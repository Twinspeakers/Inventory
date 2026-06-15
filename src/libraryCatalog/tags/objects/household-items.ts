import { tag } from "../../tag";

export const householdItemTags = [
  tag("household-item", {
    label: "Household Item",
    aliases: ["home item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("broom", {
    label: "Broom",
    parents: ["household-item", "tool"],
    implies: ["household-item", "tool", "prop"],
  }),
  tag("clock", {
    label: "Clock",
    aliases: ["watch", "timepiece"],
    parents: ["household-item"],
    implies: ["household-item", "prop"],
  }),
  tag("dustpan", {
    label: "Dustpan",
    parents: ["household-item", "tool"],
    implies: ["household-item", "tool", "prop"],
  }),
  tag("hanger", {
    label: "Hanger",
    aliases: ["coat hanger", "clothes hanger"],
    parents: ["household-item"],
    implies: ["household-item", "prop"],
  }),
  tag("ironing-board", {
    label: "Ironing Board",
    parents: ["household-item"],
    implies: ["household-item", "prop"],
  }),
  tag("mop", {
    label: "Mop",
    parents: ["household-item", "tool"],
    implies: ["household-item", "tool", "prop"],
  }),
  tag("trash-can", {
    label: "Trash Can",
    aliases: ["bin", "rubbish bin"],
    parents: ["household-item", "storage"],
    implies: ["household-item", "storage", "prop"],
  }),
  tag("umbrella", {
    label: "Umbrella",
    parents: ["household-item"],
    implies: ["household-item", "prop", "fabric"],
  }),
];
