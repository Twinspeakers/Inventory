import { tag } from "../tag";

export const systemTags = [
  tag("3d", {
    label: "3D",
    kind: "system",
    aliases: ["model", "mesh", "glb", "gltf", "obj", "stl"],
    locksToFileTypes: ["3D"],
  }),
  tag("image", {
    label: "Image",
    kind: "system",
    aliases: ["raster", "vector", "png", "jpg", "jpeg", "svg", "avif"],
    locksToFileTypes: ["Image"],
  }),
  tag("audio", {
    label: "Audio",
    kind: "system",
    aliases: ["sound", "wav", "mp3", "ogg", "flac"],
    locksToFileTypes: ["Audio"],
  }),
  tag("document", {
    label: "Document",
    kind: "system",
    aliases: ["doc", "pdf", "markdown", "md", "txt"],
    locksToFileTypes: ["Document"],
  }),
  tag("archive", {
    label: "Archive",
    kind: "system",
    aliases: ["zip", "rar", "7z", "bundle", "pack"],
    locksToFileTypes: ["Archive"],
  }),
];
