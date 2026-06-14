import { tag } from "../../tag";

export const houseRoomTags = [
  tag("attic", {
    label: "Attic",
    aliases: ["loft", "roof space"],
    parents: ["room", "home"],
    implies: ["room", "home", "building"],
  }),
  tag("basement", {
    label: "Basement",
    aliases: ["cellar", "undercroft"],
    parents: ["room", "home"],
    implies: ["room", "home", "building"],
  }),
  tag("dining-room", {
    label: "Dining Room",
    aliases: ["dining area"],
    parents: ["room", "home"],
    implies: ["room", "building", "home"],
  }),
  tag("garage", {
    label: "Garage",
    aliases: ["carport"],
    parents: ["room", "home"],
    implies: ["room", "building", "home", "vehicle"],
  }),
  tag("kitchen", {
    label: "Kitchen",
    aliases: ["cookhouse"],
    parents: ["room", "home"],
    implies: ["room", "building", "home", "cooking"],
  }),
  tag("laundry-room", {
    label: "Laundry Room",
    aliases: ["utility room"],
    parents: ["room", "home"],
    implies: ["room", "building", "home"],
  }),
  tag("living-room", {
    label: "Living Room",
    aliases: ["lounge", "sitting room"],
    parents: ["room", "home"],
    implies: ["room", "building", "home"],
  }),
  tag("nursery-room", {
    label: "Nursery",
    aliases: ["baby room", "child room"],
    parents: ["bedroom"],
    implies: ["bedroom", "room", "home"],
  }),
  tag("study", {
    label: "Study",
    aliases: ["home office", "den"],
    parents: ["room", "home"],
    implies: ["room", "home", "building"],
  }),
];
