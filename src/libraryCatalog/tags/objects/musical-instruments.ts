import { tag } from "../../tag";

export const musicalInstrumentTags = [
  tag("musical-instrument", {
    label: "Musical Instrument",
    aliases: ["instrument"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("drum", {
    label: "Drum",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop"],
  }),
  tag("flute", {
    label: "Flute",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop"],
  }),
  tag("guitar", {
    label: "Guitar",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop", "wood"],
  }),
  tag("piano", {
    label: "Piano",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop"],
  }),
  tag("trumpet", {
    label: "Trumpet",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop", "metal"],
  }),
  tag("violin", {
    label: "Violin",
    parents: ["musical-instrument"],
    implies: ["musical-instrument", "prop", "wood"],
  }),
];
