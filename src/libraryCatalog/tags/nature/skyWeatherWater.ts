import { tag } from "../../tag";

export const skyWeatherWaterTags = [
  tag("sky", {
    label: "Sky",
    aliases: ["cloud", "clouds", "sun", "moon", "stars"],
    parents: ["nature"],
    implies: ["nature"],
  }),
  tag("water", {
    label: "Water",
    aliases: ["river", "lake", "pond", "stream", "sea", "ocean"],
    parents: ["nature"],
    implies: ["nature"],
  }),
  tag("weather", {
    label: "Weather",
    aliases: ["rain", "snow", "storm", "fog", "wind"],
    parents: ["nature"],
    implies: ["nature"],
  }),
];
