import { tag } from "../../tag";

export const electronicsTags = [
  tag("electronic-device", {
    label: "Electronic Device",
    aliases: ["electronics", "electronic item", "device", "gadget", "tech item"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("camera", {
    label: "Camera",
    aliases: ["cam", "camcorder", "webcam"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("computer", {
    label: "Computer",
    aliases: ["pc", "desktop", "workstation", "terminal"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("game-console", {
    label: "Game Console",
    aliases: ["console", "gaming console", "video game console"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("gamepad", {
    label: "Gamepad",
    aliases: ["controller", "joypad", "game pad"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("headphones", {
    label: "Headphones",
    aliases: ["headset", "earphones", "earbuds"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("keyboard", {
    label: "Keyboard",
    aliases: ["keypad"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("laptop", {
    label: "Laptop",
    aliases: ["notebook computer", "notebook", "portable computer"],
    parents: ["computer"],
    implies: ["computer", "electronic-device", "prop"],
  }),
  tag("monitor", {
    label: "Monitor",
    aliases: ["screen", "display", "display screen"],
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
    aliases: ["telephone", "mobile phone", "cell phone", "cellphone", "smartphone", "mobile"],
    parents: ["electronic-device"],
    implies: ["electronic-device", "prop"],
  }),
  tag("speaker", {
    label: "Speaker",
    aliases: ["loudspeaker", "audio speaker", "speaker set"],
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
