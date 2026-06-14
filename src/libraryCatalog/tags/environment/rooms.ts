import { tag } from "../../tag";

export const roomTags = [
  tag("ballroom", {
    label: "Ballroom",
    aliases: ["dance hall"],
    parents: ["room"],
    implies: ["room", "building"],
    related: ["dancing"],
  }),
  tag("bathroom", {
    label: "Bathroom",
    aliases: ["washroom", "restroom"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
  tag("bedroom", {
    label: "Bedroom",
    aliases: ["sleeping room"],
    parents: ["room"],
    implies: ["room", "building", "bed"],
  }),
  tag("classroom", {
    label: "Classroom",
    aliases: ["school room"],
    parents: ["room", "school-building"],
    implies: ["room", "building", "education"],
  }),
  tag("closet", {
    label: "Closet",
    aliases: ["wardrobe room", "cupboard"],
    parents: ["storage-room"],
    implies: ["storage-room", "room", "building"],
  }),
  tag("corridor", {
    label: "Corridor",
    aliases: ["passageway", "hall"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
  tag("hallway", {
    label: "Hallway",
    aliases: ["entrance hall", "hall"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
  tag("laboratory", {
    label: "Laboratory",
    aliases: ["lab", "science room"],
    parents: ["room"],
    implies: ["room", "building"],
    related: ["science"],
  }),
  tag("library-room", {
    label: "Library Room",
    aliases: ["reading room", "book room"],
    parents: ["room"],
    implies: ["room", "building", "book"],
  }),
  tag("lobby", {
    label: "Lobby",
    aliases: ["foyer", "reception area"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
  tag("office", {
    label: "Office",
    aliases: ["workspace", "study office"],
    parents: ["room"],
    implies: ["room", "building"],
    related: ["work"],
  }),
  tag("room", {
    label: "Room",
    aliases: ["interior", "indoors", "interior space"],
    parents: ["building"],
    implies: ["building", "architecture"],
  }),
  tag("storage-room", {
    label: "Storage Room",
    aliases: ["storeroom", "supply room"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
  tag("throne-room", {
    label: "Throne Room",
    aliases: ["royal hall", "audience chamber"],
    parents: ["room", "palace"],
    implies: ["room", "building"],
  }),
  tag("waiting-room", {
    label: "Waiting Room",
    aliases: ["waiting area"],
    parents: ["room"],
    implies: ["room", "building"],
  }),
];
