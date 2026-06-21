import { tag } from "../../tag";

export const genreTags = [
  tag("cyberpunk", {
    label: "Cyberpunk",
    aliases: ["neon dystopia", "high tech low life"],
    parents: ["science-fiction"],
    implies: ["science-fiction", "modern-setting"],
  }),
  tag("fantasy-genre", {
    label: "Fantasy",
    aliases: ["fantasy setting", "magic setting"],
    implies: ["fictional-setting"],
    related: ["fantasy-people", "magic"],
  }),
  tag("fictional-setting", {
    label: "Fictional Setting",
    aliases: ["imaginary world", "fictional world"],
  }),
  tag("historical-setting", {
    label: "Historical",
    aliases: ["period setting", "history inspired"],
    implies: ["past-era"],
  }),
  tag("horror-genre", {
    label: "Horror",
    aliases: ["horror setting", "frightening"],
    implies: ["fictional-setting"],
    related: ["undead-humanoid", "moody", "tense"],
  }),
  tag("medieval-setting", {
    label: "Medieval",
    aliases: ["middle ages", "medieval world"],
    parents: ["historical-setting"],
    implies: ["historical-setting", "past-era"],
    related: ["castle", "sword"],
  }),
  tag("modern-setting", {
    label: "Modern",
    aliases: ["contemporary", "present day"],
  }),
  tag("past-era", {
    label: "Past Era",
    aliases: ["historic era", "earlier period"],
  }),
  tag("post-apocalyptic", {
    label: "Post-Apocalyptic",
    aliases: ["after the fall", "ruined future"],
    parents: ["science-fiction"],
    implies: ["science-fiction", "fictional-setting"],
    related: ["damaged", "worn"],
  }),
  tag("science-fiction", {
    label: "Science Fiction",
    aliases: ["sci-fi", "scifi", "futuristic"],
    implies: ["fictional-setting"],
  }),
  tag("steampunk", {
    label: "Steampunk",
    aliases: ["victorian sci-fi", "retrofuturism"],
    parents: ["science-fiction"],
    implies: ["science-fiction", "historical-setting", "fictional-setting"],
    related: ["machine", "metal"],
  }),
  tag("western-genre", {
    label: "Western",
    aliases: ["old west", "frontier western"],
    implies: ["historical-setting", "past-era"],
    related: ["desert", "horse"],
  }),
];
