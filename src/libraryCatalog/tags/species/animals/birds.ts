import { tag } from "../../../tag";

export const birdTags = [
  tag("bird", {
    label: "Bird",
    aliases: ["avian", "fowl"],
    parents: ["animal"],
    implies: ["animal"],
  }),
  tag("chicken", {
    label: "Chicken",
    aliases: ["hen", "rooster", "chick"],
    parents: ["bird", "farm-animal"],
    implies: ["bird", "farm-animal", "animal"],
    related: ["egg", "feather", "farm"],
  }),
  tag("crow", {
    label: "Crow",
    aliases: ["raven"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("duck", {
    label: "Duck",
    aliases: ["duckling"],
    parents: ["bird", "farm-animal", "water"],
    implies: ["bird", "farm-animal", "animal", "water"],
  }),
  tag("eagle", {
    label: "Eagle",
    aliases: ["hawk", "falcon", "vulture", "condor", "raptor"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("goose", {
    label: "Goose",
    aliases: ["gosling", "geese"],
    parents: ["bird", "farm-animal", "water"],
    implies: ["bird", "farm-animal", "animal", "water"],
  }),
  tag("ostrich", {
    label: "Ostrich",
    aliases: ["emu", "cassowary"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("owl", {
    label: "Owl",
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("parrot", {
    label: "Parrot",
    aliases: ["macaw", "cockatoo", "budgie"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("penguin", {
    label: "Penguin",
    parents: ["bird", "water"],
    implies: ["bird", "animal", "water"],
  }),
  tag("pigeon", {
    label: "Pigeon",
    aliases: ["dove"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("seabird", {
    label: "Seabird",
    aliases: ["gull", "pelican", "albatross", "puffin"],
    parents: ["bird", "water"],
    implies: ["bird", "animal", "water"],
  }),
  tag("songbird", {
    label: "Songbird",
    aliases: ["sparrow", "robin", "finch", "swallow", "blackbird", "bluebird"],
    parents: ["bird"],
    implies: ["bird", "animal"],
  }),
  tag("turkey", {
    label: "Turkey",
    parents: ["bird", "farm-animal"],
    implies: ["bird", "farm-animal", "animal"],
  }),
  tag("wading-bird", {
    label: "Wading Bird",
    aliases: ["heron", "egret", "crane", "stork", "flamingo"],
    parents: ["bird", "water"],
    implies: ["bird", "animal", "water"],
  }),
];
