import { tag } from "../../tag";

export const skillTags = [
  tag("activity", {
    label: "Activity",
    aliases: ["action", "task"],
  }),
  tag("combat", {
    label: "Combat",
    aliases: ["battle", "fight", "fighting", "attack"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["weapon", "sword", "shield", "armor"],
  }),
  tag("digging", {
    label: "Digging",
    aliases: ["excavation", "dig"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["shovel", "dirt", "soil"],
  }),
  tag("navigation", {
    label: "Navigation",
    aliases: ["wayfinding", "map reading", "pathfinding"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["map", "road", "travel"],
  }),
  tag("repair", {
    label: "Repair",
    aliases: ["fixing", "mending", "maintenance"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["tool", "machine"],
  }),
  tag("research", {
    label: "Research",
    aliases: ["investigation", "study", "analysis"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["book", "document"],
  }),
  tag("scouting", {
    label: "Scouting",
    aliases: ["reconnaissance", "surveying", "lookout"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["travel", "map"],
  }),
  tag("skill", {
    label: "Skill",
    aliases: ["ability", "technique", "competency"],
    parents: ["activity"],
    implies: ["activity"],
  }),
  tag("stealth", {
    label: "Stealth",
    aliases: ["sneaking", "hiding", "covert"],
    parents: ["skill"],
    implies: ["skill", "activity"],
  }),
  tag("survival", {
    label: "Survival",
    aliases: ["bushcraft", "wilderness survival", "foraging"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["camp", "food", "water"],
  }),
  tag("tool-use", {
    label: "Tool Use",
    aliases: ["tool handling", "equipment use"],
    parents: ["skill"],
    implies: ["skill", "activity"],
    related: ["tool"],
  }),
  tag("travel", {
    label: "Travel",
    aliases: ["journey", "exploration"],
    parents: ["activity"],
    implies: ["activity"],
    related: ["road", "vehicle", "map", "navigation"],
  }),
];
