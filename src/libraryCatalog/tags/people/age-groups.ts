import { tag } from "../../tag";

export const ageGroupTags = [
  tag("adult", {
    label: "Adult",
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("age-group", {
    label: "Age Group",
    aliases: ["life stage", "age range"],
    parents: ["person"],
    implies: ["person"],
  }),
  tag("baby", {
    label: "Baby",
    aliases: ["infant", "newborn"],
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("child", {
    label: "Child",
    aliases: ["kid"],
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("elder", {
    label: "Elder",
    aliases: ["senior", "old person"],
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("teenager", {
    label: "Teenager",
    aliases: ["teen", "adolescent"],
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("toddler", {
    label: "Toddler",
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
  tag("young-adult", {
    label: "Young Adult",
    aliases: ["young person"],
    parents: ["age-group"],
    implies: ["age-group", "person"],
  }),
];
