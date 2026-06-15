import { tag } from "../../tag";

export const electronicsTags = [
  tag("electronic-device", {
    label: "Electronic Device",
    aliases: ["electronics", "electronic item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("camera", {
    label: "Camera",
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("computer", {
    label: "Computer",
    aliases: ["pc"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("game-console", {
    label: "Game Console",
    aliases: ["console"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("headphones", {
    label: "Headphones",
    aliases: ["headset"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("keyboard", {
    label: "Keyboard",
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("monitor", {
    label: "Monitor",
    aliases: ["screen"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("mouse-device", {
    label: "Mouse",
    aliases: ["computer mouse"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("phone", {
    label: "Phone",
    aliases: ["telephone", "mobile phone"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("speaker", {
    label: "Speaker",
    aliases: ["loudspeaker"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("tablet-device", {
    label: "Tablet",
    aliases: ["tablet computer"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("television", {
    label: "Television",
    aliases: ["tv"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
];
