import { tag } from "../../tag";

export const celestialTags = [
  tag("celestial", {
    label: "Celestial",
    aliases: ["sky object", "heavenly"],
  }),
  tag("cloud", {
    label: "Cloud",
    aliases: ["clouds"],
    parents: ["sky"],
    implies: ["sky", "celestial"],
  }),
  tag("constellation", {
    label: "Constellation",
    aliases: ["star pattern"],
    parents: ["stars"],
    implies: ["stars", "celestial"],
  }),
  tag("moon", {
    label: "Moon",
    parents: ["celestial"],
    implies: ["celestial"],
  }),
  tag("planet", {
    label: "Planet",
    parents: ["celestial"],
    implies: ["celestial"],
  }),
  tag("sky", {
    label: "Sky",
    parents: ["celestial"],
    implies: ["celestial"],
  }),
  tag("stars", {
    label: "Stars",
    aliases: ["starfield"],
    parents: ["celestial"],
    implies: ["celestial"],
  }),
  tag("sun", {
    label: "Sun",
    parents: ["celestial"],
    implies: ["celestial"],
  }),
  tag("sunrise", {
    label: "Sunrise",
    aliases: ["dawn"],
    parents: ["sky"],
    implies: ["sky", "sun", "celestial"],
  }),
  tag("sunset", {
    label: "Sunset",
    aliases: ["dusk"],
    parents: ["sky"],
    implies: ["sky", "sun", "celestial"],
  }),
];
