import { tag } from "../../tag";

export const eventTags = [
  tag("birthday-event", {
    label: "Birthday",
    aliases: ["birthday party", "birthday celebration"],
    parents: ["celebration-event"],
    implies: ["celebration-event"],
    related: ["cake", "party-event"],
  }),
  tag("celebration-event", {
    label: "Celebration",
    aliases: ["celebration", "festivity"],
  }),
  tag("ceremony-event", {
    label: "Ceremony",
    aliases: ["formal ceremony", "ritual event"],
    related: ["gathering-event"],
  }),
  tag("concert-event", {
    label: "Concert",
    aliases: ["live music", "music event"],
    parents: ["performance-event"],
    implies: ["performance-event", "gathering-event"],
    related: ["music", "stage"],
  }),
  tag("festival-event", {
    label: "Festival",
    aliases: ["festival", "fair"],
    parents: ["celebration-event"],
    implies: ["celebration-event", "gathering-event"],
    related: ["market-event", "parade-event"],
  }),
  tag("funeral-event", {
    label: "Funeral",
    aliases: ["memorial service", "mourning event"],
    parents: ["ceremony-event"],
    implies: ["ceremony-event", "gathering-event"],
  }),
  tag("gathering-event", {
    label: "Gathering",
    aliases: ["social gathering", "assembly"],
  }),
  tag("holiday-event", {
    label: "Holiday",
    aliases: ["holiday occasion", "seasonal holiday"],
    parents: ["celebration-event"],
    implies: ["celebration-event"],
    related: ["winter", "autumn"],
  }),
  tag("market-event", {
    label: "Market Day",
    aliases: ["market", "street market"],
    parents: ["gathering-event"],
    implies: ["gathering-event"],
    related: ["market", "crowded-scene"],
  }),
  tag("parade-event", {
    label: "Parade",
    aliases: ["procession", "street parade"],
    parents: ["performance-event"],
    implies: ["performance-event", "gathering-event"],
    related: ["street", "crowded-scene"],
  }),
  tag("party-event", {
    label: "Party",
    aliases: ["celebration party", "social party"],
    parents: ["celebration-event"],
    implies: ["celebration-event", "gathering-event"],
  }),
  tag("performance-event", {
    label: "Performance",
    aliases: ["show", "public performance"],
    parents: ["gathering-event"],
    implies: ["gathering-event"],
  }),
  tag("wedding-event", {
    label: "Wedding",
    aliases: ["marriage ceremony", "wedding ceremony"],
    parents: ["ceremony-event", "celebration-event"],
    implies: ["ceremony-event", "celebration-event", "gathering-event"],
  }),
];
