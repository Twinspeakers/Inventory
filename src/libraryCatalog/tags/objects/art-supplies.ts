import { tag } from "../../tag";

export const artSupplyTags = [
  tag("art-supply", {
    label: "Art Supply",
    aliases: ["art material"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("canvas", {
    label: "Canvas",
    parents: ["art-supply"],
    implies: ["art-supply", "prop", "fabric"],
  }),
  tag("easel", {
    label: "Easel",
    parents: ["art-supply"],
    implies: ["art-supply", "prop", "wood"],
  }),
  tag("paint-palette", {
    label: "Paint Palette",
    aliases: ["palette"],
    parents: ["art-supply"],
    implies: ["art-supply", "prop"],
  }),
  tag("paintbrush", {
    label: "Paintbrush",
    aliases: ["brush"],
    parents: ["art-supply"],
    implies: ["art-supply", "prop"],
  }),
  tag("sketchbook", {
    label: "Sketchbook",
    parents: ["art-supply"],
    implies: ["art-supply", "prop", "paper"],
  }),
];
