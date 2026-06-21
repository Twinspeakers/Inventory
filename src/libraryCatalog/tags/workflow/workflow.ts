import { tag } from "../../tag";

export const workflowTags = [
  tag("approved", {
    label: "Approved",
    kind: "workflow",
    aliases: ["signed off", "accepted"],
  }),
  tag("archived-item", {
    label: "Archived",
    kind: "workflow",
    aliases: ["archive status", "stored away"],
  }),
  tag("deprecated-item", {
    label: "Deprecated",
    kind: "workflow",
    aliases: ["obsolete", "superseded"],
  }),
  tag("draft", {
    label: "Draft",
    kind: "workflow",
    aliases: ["early draft", "rough draft"],
  }),
  tag("exported", {
    label: "Exported",
    kind: "workflow",
    aliases: ["rendered out", "baked out"],
  }),
  tag("final-asset", {
    label: "Final",
    kind: "workflow",
    aliases: ["final version", "shipping"],
  }),
  tag("needs-cleanup", {
    label: "Needs Cleanup",
    kind: "workflow",
    aliases: ["cleanup needed", "messy"],
  }),
  tag("needs-export", {
    label: "Needs Export",
    kind: "workflow",
    aliases: ["export pending"],
  }),
  tag("needs-retopo", {
    label: "Needs Retopo",
    kind: "workflow",
    aliases: ["retopology needed", "retopo pending"],
    locksToFileTypes: ["3D"],
  }),
  tag("needs-rig", {
    label: "Needs Rig",
    kind: "workflow",
    aliases: ["rig pending", "unrigged"],
    locksToFileTypes: ["3D"],
  }),
  tag("needs-texture", {
    label: "Needs Texture",
    kind: "workflow",
    aliases: ["texture pending", "untextured"],
    locksToFileTypes: ["3D"],
  }),
  tag("needs-uv", {
    label: "Needs UV",
    kind: "workflow",
    aliases: ["uv pending", "needs unwrapping"],
    locksToFileTypes: ["3D"],
  }),
  tag("placeholder", {
    label: "Placeholder",
    kind: "workflow",
    aliases: ["temp stand-in", "proxy"],
  }),
  tag("ready-for-engine", {
    label: "Ready for Engine",
    kind: "workflow",
    aliases: ["engine ready", "game ready"],
    locksToFileTypes: ["3D", "Image", "Audio", "Source"],
  }),
  tag("ready-for-print", {
    label: "Ready for Print",
    kind: "workflow",
    aliases: ["print ready"],
    locksToFileTypes: ["Document", "Image", "Source"],
  }),
  tag("reference-asset", {
    label: "Reference",
    kind: "workflow",
    aliases: ["reference material", "moodboard source"],
  }),
  tag("review", {
    label: "Review",
    kind: "workflow",
    aliases: ["in review", "for review"],
  }),
  tag("source-of-truth", {
    label: "Source of Truth",
    kind: "workflow",
    aliases: ["master asset", "canonical version"],
    locksToFileTypes: ["Document", "Image", "3D", "Source"],
  }),
  tag("temporary", {
    label: "Temporary",
    kind: "workflow",
    aliases: ["temp", "short term"],
  }),
  tag("wip", {
    label: "Work in Progress",
    kind: "workflow",
    aliases: ["work in progress", "in progress"],
  }),
];
