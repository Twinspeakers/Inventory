import { tag } from "../../tag";

export const sportTags = [
  tag("archery", {
    label: "Archery",
    aliases: ["bow sport", "target archery"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["bow", "arrow"],
  }),
  tag("athletics", {
    label: "Athletics",
    aliases: ["track and field", "track"],
    parents: ["sport"],
    implies: ["sport", "activity"],
  }),
  tag("ball-sport", {
    label: "Ball Sport",
    aliases: ["ball game", "ballgame"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["ball"],
  }),
  tag("climbing", {
    label: "Climbing",
    aliases: ["rock climbing", "mountaineering"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["mountain", "rock"],
  }),
  tag("cycling", {
    label: "Cycling",
    aliases: ["bicycle", "biking"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["vehicle"],
  }),
  tag("martial-arts", {
    label: "Martial Arts",
    aliases: ["martial art", "combat sport"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["combat"],
  }),
  tag("racing", {
    label: "Racing",
    aliases: ["race", "competition"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["vehicle", "track"],
  }),
  tag("running", {
    label: "Running",
    aliases: ["jogging", "sprinting"],
    parents: ["athletics"],
    implies: ["athletics", "sport", "activity"],
  }),
  tag("sport", {
    label: "Sport",
    aliases: ["sports", "game", "competition"],
    parents: ["activity"],
    implies: ["activity"],
  }),
  tag("swimming", {
    label: "Swimming",
    aliases: ["swim"],
    parents: ["water-sport"],
    implies: ["water-sport", "sport", "activity"],
    related: ["water"],
  }),
  tag("team-sport", {
    label: "Team Sport",
    aliases: ["team game"],
    parents: ["sport"],
    implies: ["sport", "activity"],
  }),
  tag("water-sport", {
    label: "Water Sport",
    aliases: ["watersport", "aquatic sport"],
    parents: ["sport"],
    implies: ["sport", "activity"],
    related: ["water"],
  }),
];
