import { tag } from "../../tag";

export const fabricTags = [
  tag("cotton", {
    label: "Cotton",
    parents: ["fabric"],
    implies: ["fabric", "material"],
  }),
  tag("denim", {
    label: "Denim",
    parents: ["fabric"],
    implies: ["fabric", "material"],
  }),
  tag("fabric", {
    label: "Fabric",
    aliases: ["cloth", "textile"],
    parents: ["material"],
    implies: ["material"],
  }),
  tag("linen", {
    label: "Linen",
    parents: ["fabric"],
    implies: ["fabric", "material"],
  }),
  tag("silk", {
    label: "Silk",
    parents: ["fabric"],
    implies: ["fabric", "material"],
  }),
  tag("wool", {
    label: "Wool",
    parents: ["fabric"],
    implies: ["fabric", "material"],
  }),
];
