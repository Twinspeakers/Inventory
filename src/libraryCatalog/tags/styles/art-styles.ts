import { tag } from "../../tag";

export const artStyleTags = [
  tag("hand-painted", {
    label: "Hand Painted",
    kind: "style",
    aliases: ["handpainted", "painted"],
  }),
  tag("pixel-art", {
    label: "Pixel Art",
    kind: "style",
    aliases: ["pixel", "8 bit", "16 bit", "sprite"],
  }),
  tag("realistic", {
    label: "Realistic",
    kind: "style",
    aliases: ["grounded", "natural", "believable"],
  }),
  tag("sketch", {
    label: "Sketch",
    kind: "style",
    aliases: ["sketched", "line art", "drawing"],
  }),
  tag("stylized", {
    label: "Stylized",
    kind: "style",
    aliases: ["cartoon", "painterly"],
  }),
];
