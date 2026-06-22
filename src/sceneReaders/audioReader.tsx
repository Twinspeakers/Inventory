import type { MouseEvent as ReactMouseEvent } from "react";
import { Play } from "lucide-react";
import { readPreviewBytes, toArrayBuffer } from "./previewIo";

export type AudioAsset = {
  extension: string;
  id: number | string;
  name: string;
  path: string;
  type: string;
};

const fallbackWaveformPeaks = Array.from({ length: 56 }, (_, index) => 0.18 + Math.abs(Math.sin(index * 0.55)) * 0.46);

export function isWaveAudioAsset(asset: AudioAsset) {
  return asset.type === "Audio" && asset.extension.toLowerCase() === "wav";
}

export function isPlayableAudioAsset(asset: AudioAsset) {
  return asset.type === "Audio";
}

export async function playAssetAudioOnce(asset: AudioAsset) {
  const bytes = await readPreviewBytes(asset.path);
  const blob = new Blob([toArrayBuffer(bytes)], { type: getAudioMimeType(asset.extension) });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);

  audio.preload = "auto";

  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      URL.revokeObjectURL(objectUrl);
    }

    audio.addEventListener(
      "ended",
      () => {
        cleanup();
        resolve();
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("The audio decoder could not play this file."));
      },
      { once: true },
    );

    void audio.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

export function AudioCardActions<TAsset extends AudioAsset>({
  asset,
  onPlayAudio,
}: {
  asset: TAsset;
  onPlayAudio: (asset: TAsset) => void;
}) {
  function handlePlay(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onPlayAudio(asset);
  }

  return (
    <div className="audio-card-actions" aria-hidden={false}>
      <button className="audio-card-action-button audio-card-play-button" type="button" aria-label={`Play ${asset.name}`} title="Play once" onClick={handlePlay}>
        <Play size={24} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AudioThumbnail({ asset }: { asset: AudioAsset }) {
  const extensionLabel = asset.extension ? `.${asset.extension.toLowerCase()}` : "audio";

  return (
    <div className="audio-waveform-shell">
      <div className="audio-waveform-header">
        <span>Audio</span>
        <span>{extensionLabel}</span>
      </div>
      <svg className="audio-waveform-svg" viewBox="0 0 112 42" preserveAspectRatio="none" aria-hidden="true">
        {fallbackWaveformPeaks.map((peak, index) => {
          const barWidth = 112 / fallbackWaveformPeaks.length;
          const height = Math.max(2, peak * 38);
          const x = index * barWidth + barWidth * 0.22;
          const y = 21 - height / 2;

          return <rect className="audio-waveform-bar" key={`${asset.id}-${index}`} x={x} y={y} width={Math.max(1.2, barWidth * 0.56)} height={height} rx="0.8" />;
        })}
      </svg>
      <div className="audio-waveform-footer">
        <span>Play on demand</span>
      </div>
    </div>
  );
}

function getAudioMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case "aif":
    case "aiff":
      return "audio/aiff";
    case "flac":
      return "audio/flac";
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}
