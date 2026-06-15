import { tag } from "../../tag";

export const weaponTags = [
  tag("weapon", {
    label: "Weapon",
    aliases: ["armament"],
    parents: ["tool"],
    implies: ["tool"],
  }),
  tag("arrow", {
    label: "Arrow",
    aliases: ["bolt"],
    parents: ["weapon"],
    implies: ["weapon", "tool", "wood"],
  }),
  tag("bow", {
    label: "Bow",
    aliases: ["longbow", "shortbow"],
    parents: ["weapon"],
    implies: ["weapon", "tool", "wood"],
  }),
  tag("shield", {
    label: "Shield",
    aliases: ["buckler", "kite shield", "round shield"],
    parents: ["weapon"],
    implies: ["weapon", "tool", "metal"],
  }),
  tag("sword", {
    label: "Sword",
    aliases: ["blade"],
    parents: ["weapon"],
    implies: ["weapon", "tool", "metal"],
  }),
];
