import { tag } from "../../tag";

export const surfaceTags = [
  tag("brushed-finish", {
    label: "Brushed",
    aliases: ["brushed surface", "satin brushed"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
    related: ["metal"],
  }),
  tag("glossy-finish", {
    label: "Glossy",
    aliases: ["high gloss", "gloss finish", "shiny"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
    related: ["reflective-surface"],
  }),
  tag("matte-finish", {
    label: "Matte",
    aliases: ["flat finish", "non-gloss"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("opaque-surface", {
    label: "Opaque",
    aliases: ["non-transparent", "solid opacity"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("patterned-surface", {
    label: "Patterned",
    aliases: ["decorative pattern", "printed surface"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("polished-finish", {
    label: "Polished",
    aliases: ["buffed", "polished surface"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
    related: ["reflective-surface"],
  }),
  tag("reflective-surface", {
    label: "Reflective",
    aliases: ["mirror-like", "reflective finish"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("rough-surface", {
    label: "Rough",
    aliases: ["coarse", "textured roughness"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("smooth-surface", {
    label: "Smooth",
    aliases: ["sleek", "even surface"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("surface-finish", {
    label: "Surface Finish",
    aliases: ["surface quality", "finish"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("textured-surface", {
    label: "Textured",
    aliases: ["surface texture", "embossed"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
  }),
  tag("translucent-surface", {
    label: "Translucent",
    aliases: ["semi-transparent", "light passing through"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
    related: ["glass"],
  }),
  tag("transparent-surface", {
    label: "Transparent",
    aliases: ["see-through", "clear surface"],
    parents: ["surface-finish"],
    implies: ["surface-finish"],
    related: ["glass"],
  }),
  tag("weathered-finish", {
    label: "Weathered",
    aliases: ["sun worn", "aged surface"],
    parents: ["surface-finish"],
    implies: ["surface-finish", "worn"],
    related: ["rough-surface"],
  }),
];
