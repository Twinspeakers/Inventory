import { tag } from "../../tag";

export const renderStyleTags = [
  tag("blueprint", {
    label: "Blueprint",
    kind: "style",
    aliases: ["technical drawing", "diagram", "schematic"],
  }),
  tag("high-poly", {
    label: "High Poly",
    kind: "style",
    aliases: ["highpoly", "high poly", "dense mesh"],
  }),
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
  tag("voxel", {
    label: "Voxel",
    kind: "style",
    aliases: ["voxels", "blocky"],
  }),
];
