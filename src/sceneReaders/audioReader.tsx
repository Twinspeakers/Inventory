import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useState } from "react";
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
  return <AudioWaveformShell asset={asset} />;
}

function AudioWaveformShell({ asset }: { asset: AudioAsset }) {
  const { errorMessage, isLoading, peaks } = useAudioWaveform(asset, 56);
  const displayPeaks = peaks.length > 0 ? peaks : fallbackWaveformPeaks;

  return (
    <div className="audio-waveform-shell">
      <div className="audio-waveform-header">
        <span>Waveform</span>
        <span>.wav</span>
      </div>
      <svg className="audio-waveform-svg" viewBox="0 0 112 42" preserveAspectRatio="none" aria-hidden="true">
        {displayPeaks.map((peak, index) => {
          const barWidth = 112 / displayPeaks.length;
          const height = Math.max(2, peak * 38);
          const x = index * barWidth + barWidth * 0.22;
          const y = 21 - height / 2;

          return <rect className="audio-waveform-bar" key={`${asset.id}-${index}`} x={x} y={y} width={Math.max(1.2, barWidth * 0.56)} height={height} rx="0.8" />;
        })}
      </svg>
      <div className="audio-waveform-footer">
        <span>{isLoading ? "Reading audio" : errorMessage ? "Preview unavailable" : "Ready"}</span>
      </div>
    </div>
  );
}

function useAudioWaveform(asset: AudioAsset, barCount: number) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setPeaks([]);
    setErrorMessage(null);
    setIsLoading(true);

    async function loadWaveform() {
      try {
        const bytes = await readPreviewBytes(asset.path);
        const nextPeaks = getWavWaveformPeaks(bytes, barCount);

        if (cancelled) {
          return;
        }

        setPeaks(nextPeaks);
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(String(error));
          setIsLoading(false);
        }
      }
    }

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [asset.path, barCount]);

  return { errorMessage, isLoading, peaks };
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

function getWavWaveformPeaks(bytes: Uint8Array, barCount: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.byteLength < 44 || readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Not a supported WAV file.");
  }

  const formatChunk = findWavChunk(view, "fmt ");
  const dataChunk = findWavChunk(view, "data");

  if (!formatChunk || !dataChunk) {
    throw new Error("WAV file is missing audio data.");
  }

  const audioFormat = view.getUint16(formatChunk.offset, true);
  const channelCount = view.getUint16(formatChunk.offset + 2, true);
  const blockAlign = view.getUint16(formatChunk.offset + 12, true);
  const bitsPerSample = view.getUint16(formatChunk.offset + 14, true);

  if ((audioFormat !== 1 && audioFormat !== 3) || channelCount < 1 || blockAlign < 1 || bitsPerSample < 8) {
    throw new Error("Unsupported WAV encoding.");
  }

  const frameCount = Math.floor(dataChunk.size / blockAlign);

  if (frameCount <= 0) {
    throw new Error("WAV file has no samples.");
  }

  const peaks = Array.from({ length: barCount }, (_, index) => {
    const startFrame = Math.floor((index / barCount) * frameCount);
    const endFrame = Math.max(startFrame + 1, Math.floor(((index + 1) / barCount) * frameCount));
    const step = Math.max(1, Math.floor((endFrame - startFrame) / 128));
    let peak = 0;

    for (let frame = startFrame; frame < endFrame; frame += step) {
      const frameOffset = dataChunk.offset + frame * blockAlign;

      for (let channel = 0; channel < channelCount; channel += 1) {
        peak = Math.max(peak, Math.abs(readWavSample(view, frameOffset, channel, bitsPerSample, audioFormat)));
      }
    }

    return clampNumber(peak, 0.03, 1);
  });

  const maxPeak = Math.max(...peaks);

  if (maxPeak <= 0.03) {
    return peaks;
  }

  return peaks.map((peak) => clampNumber(peak / maxPeak, 0.04, 1));
}

function readWavSample(view: DataView, frameOffset: number, channel: number, bitsPerSample: number, audioFormat: number) {
  const bytesPerSample = bitsPerSample / 8;
  const offset = frameOffset + channel * bytesPerSample;

  if (audioFormat === 3 && bitsPerSample === 32) {
    return view.getFloat32(offset, true);
  }

  switch (bitsPerSample) {
    case 8:
      return (view.getUint8(offset) - 128) / 128;
    case 16:
      return view.getInt16(offset, true) / 32768;
    case 24: {
      const value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
      const signedValue = value & 0x800000 ? value | 0xff000000 : value;
      return signedValue / 8388608;
    }
    case 32:
      return view.getInt32(offset, true) / 2147483648;
    default:
      return 0;
  }
}

function findWavChunk(view: DataView, chunkId: string) {
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;

    if (id === chunkId) {
      return { offset: dataOffset, size };
    }

    offset = dataOffset + size + (size % 2);
  }

  return null;
}

function readAscii(view: DataView, offset: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
