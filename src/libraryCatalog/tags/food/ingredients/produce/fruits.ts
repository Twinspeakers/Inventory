import { tag } from "../../../../tag";

export const fruitTags = [
  tag("apple", {
    label: "Apple",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("apricot", {
    label: "Apricot",
    parents: ["stone-fruit"],
    implies: ["stone-fruit", "fruit", "food", "ingredient"],
  }),
  tag("avocado", {
    label: "Avocado",
    parents: ["fruit"],
    implies: ["fruit", "fat", "food", "ingredient"],
  }),
  tag("banana", {
    label: "Banana",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("cherry", {
    label: "Cherry",
    parents: ["stone-fruit"],
    implies: ["stone-fruit", "fruit", "food", "ingredient"],
  }),
  tag("citrus-fruit", {
    label: "Citrus",
    aliases: ["citrus fruit"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("clementine", {
    label: "Clementine",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("coconut", {
    label: "Coconut",
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("date-fruit", {
    label: "Date",
    aliases: ["dates"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("dragon-fruit", {
    label: "Dragon Fruit",
    aliases: ["pitaya"],
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("fig", {
    label: "Fig",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("grape", {
    label: "Grape",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("grapefruit", {
    label: "Grapefruit",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("guava", {
    label: "Guava",
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("kiwi-fruit", {
    label: "Kiwi Fruit",
    aliases: ["kiwifruit"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("kumquat", {
    label: "Kumquat",
    aliases: ["calquat"],
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("lemon", {
    label: "Lemon",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("lime", {
    label: "Lime",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("mandarin", {
    label: "Mandarin",
    aliases: ["mandarin orange"],
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("mango", {
    label: "Mango",
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("melon", {
    label: "Melon",
    aliases: ["watermelon", "cantaloupe", "honeydew"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("nectarine", {
    label: "Nectarine",
    parents: ["stone-fruit"],
    implies: ["stone-fruit", "fruit", "food", "ingredient"],
  }),
  tag("orange", {
    label: "Orange",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("papaya", {
    label: "Papaya",
    aliases: ["pawpaw"],
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("passionfruit", {
    label: "Passionfruit",
    aliases: ["passion fruit"],
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("peach", {
    label: "Peach",
    parents: ["stone-fruit"],
    implies: ["stone-fruit", "fruit", "food", "ingredient"],
  }),
  tag("pear", {
    label: "Pear",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("pineapple", {
    label: "Pineapple",
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("plum", {
    label: "Plum",
    parents: ["stone-fruit"],
    implies: ["stone-fruit", "fruit", "food", "ingredient"],
  }),
  tag("pomegranate", {
    label: "Pomegranate",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("pomelo", {
    label: "Pomelo",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("quince", {
    label: "Quince",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("rambutan", {
    label: "Rambutan",
    parents: ["tropical-fruit"],
    implies: ["tropical-fruit", "fruit", "food", "ingredient"],
  }),
  tag("stone-fruit", {
    label: "Stone Fruit",
    aliases: ["drupe"],
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("tangerine", {
    label: "Tangerine",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
  tag("tropical-fruit", {
    label: "Tropical Fruit",
    parents: ["fruit"],
    implies: ["fruit", "food", "ingredient"],
  }),
  tag("watermelon", {
    label: "Watermelon",
    parents: ["melon"],
    implies: ["melon", "fruit", "food", "ingredient"],
  }),
  tag("yuzu", {
    label: "Yuzu",
    parents: ["citrus-fruit"],
    implies: ["citrus-fruit", "fruit", "food", "ingredient"],
  }),
];
