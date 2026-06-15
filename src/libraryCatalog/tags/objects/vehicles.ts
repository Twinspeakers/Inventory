import { tag } from "../../tag";

export const vehicleTags = [
  tag("vehicle", {
    label: "Vehicle",
    aliases: ["transport", "transportation"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("airplane", {
    label: "Airplane",
    aliases: ["plane", "aircraft", "jet"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("bicycle", {
    label: "Bicycle",
    aliases: ["bike"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("boat", {
    label: "Boat",
    aliases: ["ship", "vessel"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop", "water"],
  }),
  tag("bus", {
    label: "Bus",
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("car", {
    label: "Car",
    aliases: ["automobile"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("train", {
    label: "Train",
    aliases: ["rail", "railway"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("truck", {
    label: "Truck",
    aliases: ["lorry"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
  tag("wheel", {
    label: "Wheel",
    aliases: ["tire", "tyre"],
    parents: ["vehicle"],
    implies: ["vehicle", "prop"],
  }),
];
