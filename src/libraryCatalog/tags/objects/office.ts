import { tag } from "../../tag";

export const officeTags = [
  tag("office-item", {
    label: "Office Item",
    aliases: ["desk item", "stationery item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("calculator", {
    label: "Calculator",
    parents: ["office-item"],
    implies: ["office-item", "prop"],
  }),
  tag("clipboard", {
    label: "Clipboard",
    parents: ["office-item"],
    implies: ["office-item", "prop"],
  }),
  tag("folder", {
    label: "Folder",
    aliases: ["file folder"],
    parents: ["office-item"],
    implies: ["office-item", "prop", "paper"],
  }),
  tag("paper-clip", {
    label: "Paper Clip",
    parents: ["office-item"],
    implies: ["office-item", "prop", "metal"],
  }),
  tag("pen", {
    label: "Pen",
    aliases: ["ballpoint"],
    parents: ["office-item"],
    implies: ["office-item", "prop"],
  }),
  tag("pencil", {
    label: "Pencil",
    parents: ["office-item"],
    implies: ["office-item", "prop", "wood"],
  }),
  tag("ruler", {
    label: "Ruler",
    aliases: ["straightedge"],
    parents: ["office-item"],
    implies: ["office-item", "prop"],
  }),
  tag("scissors", {
    label: "Scissors",
    parents: ["office-item", "tool"],
    implies: ["office-item", "tool", "prop", "metal"],
  }),
  tag("stapler", {
    label: "Stapler",
    parents: ["office-item"],
    implies: ["office-item", "prop", "metal"],
  }),
];
