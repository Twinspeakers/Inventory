import { pipeline } from "@huggingface/transformers";
import { imageClassifierCandidateLabels } from "../../libraryCatalog/autoTagging/modelConceptMap";

type AnalyzeImageMessage = {
  fileUrl: string;
  requestId: number;
  type: "analyze-image";
};

type WorkerResponseMessage =
  | {
      caption: string;
      concepts: Array<{
        label: string;
        score: number;
      }>;
      requestId: number;
      type: "analysis-complete";
    }
  | {
      message: string;
      requestId: number;
      type: "analysis-error";
    };

type ImageCaptioner = Awaited<ReturnType<typeof pipeline<"image-to-text">>>;
type ZeroShotImageClassifier = Awaited<ReturnType<typeof pipeline<"zero-shot-image-classification">>>;
type WorkerImageConcept = {
  label: string;
  score: number;
};

let captionerPromise: Promise<ImageCaptioner> | null = null;
let classifierPromise: Promise<ZeroShotImageClassifier> | null = null;
let preferredDevice: "webgpu" | "wasm" = typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";

function postWorkerMessage(message: WorkerResponseMessage) {
  self.postMessage(message);
}

async function getCaptioner() {
  if (!captionerPromise) {
    captionerPromise = getOrCreatePipeline(() => createCaptioner(preferredDevice), (nextDevice) => createCaptioner(nextDevice));
  }

  return captionerPromise;
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = getOrCreatePipeline(() => createClassifier(preferredDevice), (nextDevice) => createClassifier(nextDevice));
  }

  return classifierPromise;
}

async function createCaptioner(device: "webgpu" | "wasm") {
  return pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning", device === "webgpu" ? { device } : {});
}

async function createClassifier(device: "webgpu" | "wasm") {
  return pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32", device === "webgpu" ? { device } : {});
}

async function getOrCreatePipeline<T>(createWithCurrentDevice: () => Promise<T>, createWithDevice: (device: "webgpu" | "wasm") => Promise<T>) {
  return createWithCurrentDevice().catch(async (error) => {
    if (preferredDevice !== "webgpu") {
      throw error;
    }

    preferredDevice = "wasm";
    return createWithDevice(preferredDevice);
  });
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

function normalizeClassifierOutput(output: Awaited<ReturnType<ZeroShotImageClassifier>>) {
  const concepts = flattenClassifierOutput(output);

  return concepts
    .sort((first, second) => second.score - first.score)
    .slice(0, 12);
}

function flattenClassifierOutput(output: Awaited<ReturnType<ZeroShotImageClassifier>>): WorkerImageConcept[] {
  if (!Array.isArray(output)) {
    return [];
  }

  const flattened = output.length > 0 && Array.isArray(output[0]) ? output[0] : output;
  return flattened.flatMap((concept) =>
    isWorkerImageConcept(concept)
      ? [{
          label: concept.label,
          score: concept.score,
        }]
      : [],
  );
}

function isWorkerImageConcept(value: unknown): value is WorkerImageConcept {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    typeof value.label === "string" &&
    "score" in value &&
    typeof value.score === "number"
  );
}

self.addEventListener("message", async (event: MessageEvent<AnalyzeImageMessage>) => {
  const message = event.data;

  if (message?.type !== "analyze-image") {
    return;
  }

  try {
    const [captioner, classifier] = await Promise.all([getCaptioner(), getClassifier()]);
    const [captionOutput, classifierOutput] = await Promise.all([
      captioner(message.fileUrl),
      classifier(message.fileUrl, imageClassifierCandidateLabels),
    ]);
    const caption = getCaptionFromOutput(captionOutput);
    const concepts = normalizeClassifierOutput(classifierOutput);
    postWorkerMessage({
      caption,
      concepts,
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
