import { tag } from "../../tag";

export const presentationTags = [
  tag("back-view", {
    label: "Back View",
    kind: "style",
    aliases: ["backview", "rear"],
  }),
  tag("front-view", {
    label: "Front View",
    kind: "style",
    aliases: ["frontview", "frontal"],
  }),
  tag("isometric", {
    label: "Isometric",
    kind: "style",
    aliases: ["iso"],
  }),
  tag("side-view", {
    label: "Side View",
    kind: "style",
    aliases: ["sideview", "profile"],
  }),
  tag("top-down", {
    label: "Top Down",
    kind: "style",
    aliases: ["topdown", "overhead"],
  }),
];
