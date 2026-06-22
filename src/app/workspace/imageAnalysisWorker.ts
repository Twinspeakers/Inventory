import { pipeline } from "@huggingface/transformers";

type AnalyzeImageMessage = {
  fileUrl: string;
  requestId: number;
  type: "analyze-image";
};

type WorkerResponseMessage =
  | {
      caption: string;
      requestId: number;
      type: "analysis-complete";
    }
  | {
      message: string;
      requestId: number;
      type: "analysis-error";
    };

type ImageCaptioner = Awaited<ReturnType<typeof pipeline<"image-to-text">>>;

let captionerPromise: Promise<ImageCaptioner> | null = null;
let preferredDevice: "webgpu" | "wasm" = typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";

function postWorkerMessage(message: WorkerResponseMessage) {
  self.postMessage(message);
}

async function getCaptioner() {
  if (!captionerPromise) {
    captionerPromise = createCaptioner(preferredDevice).catch(async (error) => {
      if (preferredDevice !== "webgpu") {
        throw error;
      }

      preferredDevice = "wasm";
      captionerPromise = createCaptioner(preferredDevice);
      return captionerPromise;
    });
  }

  return captionerPromise;
}

async function createCaptioner(device: "webgpu" | "wasm") {
  return pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", device === "webgpu" ? { device } : {});
}

function getCaptionFromOutput(output: Awaited<ReturnType<ImageCaptioner>>) {
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .map((entry) => ("generated_text" in entry && typeof entry.generated_text === "string" ? entry.generated_text : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

self.addEventListener("message", async (event: MessageEvent<AnalyzeImageMessage>) => {
  const message = event.data;

  if (message?.type !== "analyze-image") {
    return;
  }

  try {
    const captioner = await getCaptioner();
    const output = await captioner(message.fileUrl);
    const caption = getCaptionFromOutput(output);
    postWorkerMessage({
      caption,
      requestId: message.requestId,
      type: "analysis-complete",
    });
  } catch (error) {
    const workerMessage = error instanceof Error ? error.message : String(error);
    postWorkerMessage({
      message: workerMessage,
      requestId: message.requestId,
      type: "analysis-error",
    });
  }
});
