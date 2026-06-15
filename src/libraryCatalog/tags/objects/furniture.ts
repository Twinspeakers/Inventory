import { tag } from "../../tag";

export const furnitureTags = [
  tag("armchair", {
    label: "Armchair",
    aliases: ["easy chair"],
    parents: ["seating"],
    implies: ["seating", "furniture", "prop"],
  }),
  tag("bed", {
    label: "Bed",
    parents: ["furniture"],
    implies: ["furniture", "prop"],
  }),
  tag("bedside-table", {
    label: "Bedside Table",
    aliases: ["nightstand"],
    parents: ["table"],
    implies: ["table", "furniture", "prop"],
  }),
  tag("bench", {
    label: "Bench",
    parents: ["seating"],
    implies: ["seating", "furniture", "prop"],
  }),
  tag("bookcase", {
    label: "Bookcase",
    aliases: ["bookshelf"],
    parents: ["shelf"],
    implies: ["shelf", "furniture", "storage", "prop"],
  }),
  tag("cabinet", {
    label: "Cabinet",
    aliases: ["cupboard", "locker"],
    parents: ["furniture", "storage"],
    implies: ["furniture", "storage", "prop"],
  }),
  tag("chair", {
    label: "Chair",
    aliases: ["stool"],
    parents: ["seating"],
    implies: ["seating", "furniture", "prop"],
  }),
  tag("chest-of-drawers", {
    label: "Chest of Drawers",
    aliases: ["dresser", "drawers"],
    parents: ["furniture", "storage"],
    implies: ["furniture", "storage", "prop"],
  }),
  tag("coffee-table", {
    label: "Coffee Table",
    parents: ["table"],
    implies: ["table", "furniture", "prop"],
  }),
  tag("cot", {
    label: "Cot",
    aliases: ["crib"],
    parents: ["bed"],
    implies: ["bed", "furniture", "prop"],
  }),
  tag("desk", {
    label: "Desk",
    parents: ["table"],
    implies: ["table", "furniture", "prop", "work"],
  }),
  tag("dining-chair", {
    label: "Dining Chair",
    parents: ["chair"],
    implies: ["chair", "seating", "furniture", "prop"],
  }),
  tag("dining-table", {
    label: "Dining Table",
    parents: ["table"],
    implies: ["table", "furniture", "prop"],
  }),
  tag("dresser", {
    label: "Dresser",
    aliases: ["dressing table", "vanity"],
    parents: ["table"],
    implies: ["table", "furniture", "prop"],
  }),
  tag("furniture", {
    label: "Furniture",
    aliases: ["furnishing", "furnishings"],
    parents: ["prop"],
    implies: ["prop"],
  }),
  tag("mirror", {
    label: "Mirror",
    aliases: ["looking glass", "wall mirror", "reflection"],
    parents: ["furniture"],
    implies: ["furniture", "prop", "glass"],
  }),
  tag("ottoman", {
    label: "Ottoman",
    aliases: ["footstool"],
    parents: ["seating"],
    implies: ["seating", "furniture", "prop"],
  }),
  tag("recliner", {
    label: "Recliner",
    aliases: ["reclining chair"],
    parents: ["chair"],
    implies: ["chair", "seating", "furniture", "prop"],
  }),
  tag("seating", {
    label: "Seating",
    aliases: ["seat"],
    parents: ["furniture"],
    implies: ["furniture", "prop"],
  }),
  tag("shelf", {
    label: "Shelf",
    aliases: ["shelves"],
    parents: ["furniture", "storage"],
    implies: ["furniture", "storage", "prop"],
  }),
  tag("sideboard", {
    label: "Sideboard",
    aliases: ["buffet"],
    parents: ["cabinet"],
    implies: ["cabinet", "furniture", "storage", "prop"],
  }),
  tag("sofa", {
    label: "Sofa",
    aliases: ["couch"],
    parents: ["seating"],
    implies: ["seating", "furniture", "prop"],
  }),
  tag("table", {
    label: "Table",
    parents: ["furniture"],
    implies: ["furniture", "prop"],
  }),
  tag("tv-stand", {
    label: "TV Stand",
    aliases: ["media console", "entertainment unit"],
    parents: ["furniture", "storage"],
    implies: ["furniture", "storage", "prop"],
  }),
  tag("wardrobe", {
    label: "Wardrobe",
    aliases: ["closet", "armoire"],
    parents: ["furniture", "storage"],
    implies: ["furniture", "storage", "prop"],
  }),
];
