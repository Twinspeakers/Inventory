import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export async function readPreviewBytes(path: string) {
  const data = await invoke<number[] | Uint8Array | ArrayBuffer>("read_file_bytes", { path });
  return toUint8Array(data);
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function toUint8Array(data: number[] | Uint8Array | ArrayBuffer) {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(data);
}

export function getAssetResourcePath(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));

  if (separatorIndex === -1) {
    return "";
  }

  return convertFileSrc(path.slice(0, separatorIndex + 1));
}

export function getAssetFileUrl(path: string) {
  return convertFileSrc(path);
}

export function getImageMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "gif":
      return "image/gif";
    case "ico":
      return "image/x-icon";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
