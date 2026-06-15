import { tag } from "../../tag";

export const medicalTags = [
  tag("medical-item", {
    label: "Medical Item",
    aliases: ["medical supply"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("bandage", {
    label: "Bandage",
    parents: ["medical-item"],
    implies: ["medical-item", "prop", "fabric"],
  }),
  tag("first-aid-kit", {
    label: "First Aid Kit",
    parents: ["medical-item", "storage"],
    implies: ["medical-item", "storage", "prop"],
  }),
  tag("medicine-bottle", {
    label: "Medicine Bottle",
    parents: ["medical-item", "storage"],
    implies: ["medical-item", "storage", "prop", "glass"],
  }),
  tag("stethoscope", {
    label: "Stethoscope",
    parents: ["medical-item"],
    implies: ["medical-item", "prop"],
  }),
  tag("syringe", {
    label: "Syringe",
    parents: ["medical-item"],
    implies: ["medical-item", "prop"],
  }),
  tag("wheelchair", {
    label: "Wheelchair",
    parents: ["medical-item", "vehicle"],
    implies: ["medical-item", "vehicle", "prop"],
  }),
];
