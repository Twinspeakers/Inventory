import { tag } from "../../tag";

export const conditionTags = [
  tag("assembled", {
    label: "Assembled",
    aliases: ["put together", "built"],
  }),
  tag("broken", {
    label: "Broken",
    aliases: ["shattered", "not working"],
  }),
  tag("burned", {
    label: "Burned",
    aliases: ["charred", "scorched"],
  }),
  tag("clean-state", {
    label: "Clean",
    aliases: ["spotless", "tidy"],
  }),
  tag("closed-state", {
    label: "Closed",
    aliases: ["shut", "sealed"],
  }),
  tag("cracked", {
    label: "Cracked",
    aliases: ["fractured", "split"],
  }),
  tag("damaged", {
    label: "Damaged",
    aliases: ["worn down", "impaired"],
  }),
  tag("dirty", {
    label: "Dirty",
    aliases: ["grimy", "soiled"],
  }),
  tag("disassembled", {
    label: "Disassembled",
    aliases: ["taken apart", "in pieces"],
  }),
  tag("dry-state", {
    label: "Dry",
    aliases: ["not wet", "parched"],
  }),
  tag("empty-state", {
    label: "Empty",
    aliases: ["vacant", "unfilled"],
  }),
  tag("filled", {
    label: "Full",
    aliases: ["filled", "packed"],
  }),
  tag("frozen-state", {
    label: "Frozen",
    aliases: ["icy", "ice covered"],
  }),
  tag("melted", {
    label: "Melted",
    aliases: ["thawed", "softened by heat"],
  }),
  tag("new-condition", {
    label: "New",
    aliases: ["brand new", "unused"],
  }),
  tag("open-state", {
    label: "Open",
    aliases: ["opened", "ajar"],
  }),
  tag("rusty", {
    label: "Rusty",
    aliases: ["oxidized", "corroded"],
    implies: ["metal"],
    related: ["damaged"],
  }),
  tag("used-condition", {
    label: "Used",
    aliases: ["pre-owned", "handled"],
  }),
  tag("wet-state", {
    label: "Wet",
    aliases: ["soaked", "damp"],
  }),
  tag("worn", {
    label: "Worn",
    aliases: ["weathered", "aged"],
  }),
];
