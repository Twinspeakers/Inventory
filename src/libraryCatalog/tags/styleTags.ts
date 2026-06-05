import { tag } from "../tag";

export const styleTags = [
  tag("low-poly", {
    label: "Low Poly",
    kind: "style",
    aliases: ["lowpoly", "low poly", "flat shaded"],
  }),
  tag("mid-poly", {
    label: "Mid Poly",
    kind: "style",
    aliases: ["medium-poly", "medium poly"],
  }),
  tag("high-poly", {
    label: "High Poly",
    kind: "style",
    aliases: ["highpoly", "high poly", "dense mesh"],
  }),
  tag("stylized", {
    label: "Stylized",
    kind: "style",
    aliases: ["cartoon", "painterly"],
  }),
  tag("realistic", {
    label: "Realistic",
    kind: "style",
    aliases: ["grounded", "natural", "believable"],
  }),
];
