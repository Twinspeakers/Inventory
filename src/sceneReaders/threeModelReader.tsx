import { useEffect, useRef, useState } from "react";
import { Box, Lightbulb } from "lucide-react";
import { getAssetResourcePath, readPreviewBytes, toArrayBuffer } from "./previewIo";

export type ModelAxis = "x" | "y" | "z";
export type ModelVector3 = Record<ModelAxis, number>;
export type ModelTransformField = "position" | "rotation" | "scale";

export type ModelTransform = {
  position: ModelVector3;
  rotation: ModelVector3;
  scale: ModelVector3;
};

export type ModelInfo = {
  boundsCenter: ModelVector3;
  dimensions: ModelVector3;
  materialCount: number;
  meshCount: number;
  nodeCount: number;
  rootTransform: ModelTransform;
  triangleCount: number;
  vertexCount: number;
};

export type ModelInspectorResult =
  | { status: "loading" }
  | { status: "ready"; info: ModelInfo }
  | { status: "error"; message: string };

export type ThreeSceneAsset = {
  extension: string;
  id: number;
  name: string;
  path: string;
};

type InspectionLightTools = {
  canvas: HTMLCanvasElement;
  group: import("three").Group;
  handle: import("three").Object3D;
  light: import("three").PointLight;
};

type CachedThreeObject = {
  lastUsed: number;
  object?: import("three").Object3D;
  promise?: Promise<import("three").Object3D>;
};

const viewportCompassAxes: Array<{ key: ModelAxis; label: string }> = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "z", label: "Z" },
];
const THREE_THUMBNAIL_WIDTH = 320;
const THREE_THUMBNAIL_HEIGHT = 240;
const MAX_THREE_THUMBNAIL_RENDERS = 2;
const MAX_CACHED_THREE_OBJECTS = 6;
const layoutResizeEndEvent = "inventory:layout-resize-end";
export const MODEL_NUMBER_EPSILON = 0.000001;
export const modelAxes = ["x", "y", "z"] as const satisfies readonly ModelAxis[];
export const defaultModelTransform: ModelTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

let activeThreeThumbnailRenders = 0;
let threeObjectCacheClock = 0;
const queuedThreeThumbnailRenders: Array<() => void> = [];
const threeObjectCache = new Map<string, CachedThreeObject>();

export function ThreePreview<TAsset extends ThreeSceneAsset>({
  asset,
  onInspectorResult,
  previewBackground,
  transformOverride,
}: {
  asset: TAsset;
  onInspectorResult: (asset: TAsset, result: ModelInspectorResult) => void;
  previewBackground: string;
  transformOverride?: ModelTransform;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const compassRef = useRef<HTMLDivElement | null>(null);
  const objectRef = useRef<import("three").Object3D | null>(null);
  const inspectionLightToolsRef = useRef<InspectionLightTools | null>(null);
  const inspectionLightEnabledRef = useRef(false);
  const importedTransformRef = useRef<ModelTransform | null>(null);
  const transformOverrideRef = useRef<ModelTransform | undefined>(transformOverride);
  const [inspectionLightEnabled, setInspectionLightEnabled] = useState(false);
  const [message, setMessage] = useState("Loading 3D preview...");

  useEffect(() => {
    inspectionLightEnabledRef.current = inspectionLightEnabled;
    setInspectionLightVisibility(inspectionLightToolsRef.current, inspectionLightEnabled);
  }, [inspectionLightEnabled]);

  useEffect(() => {
    transformOverrideRef.current = transformOverride;

    if (objectRef.current) {
      applyModelTransform(objectRef.current, transformOverride ?? importedTransformRef.current ?? defaultModelTransform);
    }
  }, [transformOverride]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setupPreview() {
      const mount = mountRef.current;

      if (!mount) {
        return;
      }

      const extension = asset.extension.toLowerCase();

      if (!["glb", "gltf", "obj", "stl"].includes(extension)) {
        setMessage(`3D preview for .${extension} is not available yet.`);
        onInspectorResult(asset, { status: "error", message: `3D preview for .${extension} is not available yet.` });
        return;
      }

      setMessage("Loading 3D preview...");
      onInspectorResult(asset, { status: "loading" });
      objectRef.current = null;
      importedTransformRef.current = null;
      inspectionLightToolsRef.current = null;

      try {
        const [THREE, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);

        if (disposed || !mountRef.current) {
          return;
        }

        const previewColor = hexToNumber(previewBackground);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(previewColor);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10_000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(previewColor, 1);
        renderer.domElement.className = "three-preview-canvas";

        mount.replaceChildren(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;

        const compassParts = getViewportCompassParts(compassRef.current);
        const compassQuaternion = new THREE.Quaternion();
        const compassVector = new THREE.Vector3();
        const compassAxisVectors: Record<ModelAxis, import("three").Vector3> = {
          x: new THREE.Vector3(1, 0, 0),
          y: new THREE.Vector3(0, 1, 0),
          z: new THREE.Vector3(0, 0, 1),
        };

        const updateCompass = () => {
          if (!compassParts) {
            return;
          }

          compassQuaternion.copy(camera.quaternion).invert();

          for (const { key } of viewportCompassAxes) {
            const part = compassParts[key];

            if (!part) {
              continue;
            }

            compassVector.copy(compassAxisVectors[key]).applyQuaternion(compassQuaternion);

            const screenX = compassVector.x;
            const screenY = -compassVector.y;
            const planarLength = Math.hypot(screenX, screenY);
            const normalizedX = planarLength > 0.0001 ? screenX / planarLength : 0;
            const normalizedY = planarLength > 0.0001 ? screenY / planarLength : -1;
            const axisLength = 12 + Math.min(1, planarLength) * 30;
            const axisStartOffset = 6;
            const visibleAxisLength = Math.max(2, axisLength - axisStartOffset);
            const startX = normalizedX * axisStartOffset;
            const startY = normalizedY * axisStartOffset;
            const endX = normalizedX * axisLength;
            const endY = normalizedY * axisLength;
            const angle = Math.atan2(endY, endX) * (180 / Math.PI);
            const facingViewer = (1 - compassVector.z) / 2;
            const opacity = 0.42 + facingViewer * 0.52;
            const zIndex = Math.round(10 + facingViewer * 20);

            part.line.style.left = `calc(50% + ${startX}px)`;
            part.line.style.top = `calc(50% + ${startY}px)`;
            part.line.style.width = `${visibleAxisLength}px`;
            part.line.style.opacity = `${opacity}`;
            part.line.style.transform = `translateY(-50%) rotate(${angle}deg)`;
            part.line.style.zIndex = `${zIndex}`;

            part.label.style.left = `calc(50% + ${endX}px)`;
            part.label.style.top = `calc(50% + ${endY}px)`;
            part.label.style.opacity = "1";
            part.label.style.transform = `translate(-50%, -50%) scale(${0.88 + facingViewer * 0.18})`;
            part.label.style.zIndex = `${zIndex + 1}`;
          }
        };

        scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.2));

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
        keyLight.position.set(4, 7, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xd0d0d0, 0.8);
        fillLight.position.set(-5, 3, -4);
        scene.add(fillLight);

        const object = await loadThreeObject(THREE, asset);

        if (disposed) {
          disposeThreeObject(object);
          renderer.dispose();
          return;
        }

        scene.add(object);
        prepareMaterials(THREE, object);
        const importedTransform = getModelTransform(object);
        const modelInfo = inspectThreeModel(THREE, object, importedTransform);
        importedTransformRef.current = importedTransform;
        objectRef.current = object;
        applyModelTransform(object, transformOverrideRef.current ?? importedTransform);
        onInspectorResult(asset, { status: "ready", info: modelInfo });

        const grid = frameThreeObject(THREE, object, camera, controls);
        scene.add(grid);

        const inspectionLightTools = createInspectionLight(THREE, renderer.domElement);
        const objectBounds = new THREE.Box3().setFromObject(object);
        const objectSize = objectBounds.getSize(new THREE.Vector3());
        const objectCenter = objectBounds.getCenter(new THREE.Vector3());
        const objectMaxDim = Math.max(objectSize.x, objectSize.y, objectSize.z, 1);
        inspectionLightTools.group.scale.setScalar(Math.max(objectMaxDim * 0.065, 0.07));
        inspectionLightTools.group.position.set(
          objectCenter.x + objectMaxDim * 0.45,
          objectCenter.y + objectMaxDim * 0.55,
          objectCenter.z + objectMaxDim * 0.62,
        );
        inspectionLightTools.light.position.copy(inspectionLightTools.group.position);
        inspectionLightTools.light.distance = objectMaxDim * 5;
        scene.add(inspectionLightTools.light);
        scene.add(inspectionLightTools.group);
        inspectionLightToolsRef.current = inspectionLightTools;
        setInspectionLightVisibility(inspectionLightTools, inspectionLightEnabledRef.current);

        let resizeFrame = 0;
        let finishResizeFrame = 0;
        let lastWidth = 0;
        let lastHeight = 0;
        let draggingInspectionLightPointerId: number | null = null;
        const dragPlane = new THREE.Plane();
        const dragPlaneNormal = new THREE.Vector3();
        const dragPoint = new THREE.Vector3();
        const pointerNdc = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();

        const setInspectionLightPosition = (position: import("three").Vector3) => {
          inspectionLightTools.group.position.copy(position);
          inspectionLightTools.light.position.copy(position);
        };

        const updatePointerNdc = (event: PointerEvent) => {
          const bounds = renderer.domElement.getBoundingClientRect();
          pointerNdc.x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
          pointerNdc.y = -(((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1);
        };

        const inspectionLightHit = (event: PointerEvent) => {
          if (!inspectionLightEnabledRef.current) {
            return false;
          }

          updatePointerNdc(event);
          raycaster.setFromCamera(pointerNdc, camera);
          return raycaster.intersectObject(inspectionLightTools.handle, true).length > 0;
        };

        const clearInspectionLightPointerState = () => {
          renderer.domElement.classList.remove("three-preview-canvas-light-hover", "three-preview-canvas-light-dragging");
        };

        const handleInspectionLightPointerDown = (event: PointerEvent) => {
          if (!inspectionLightHit(event)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          draggingInspectionLightPointerId = event.pointerId;
          controls.enabled = false;
          renderer.domElement.setPointerCapture(event.pointerId);
          renderer.domElement.classList.add("three-preview-canvas-light-dragging");
          renderer.domElement.classList.remove("three-preview-canvas-light-hover");
          camera.getWorldDirection(dragPlaneNormal);
          dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, inspectionLightTools.group.position);
        };

        const handleInspectionLightPointerMove = (event: PointerEvent) => {
          if (draggingInspectionLightPointerId === event.pointerId) {
            event.preventDefault();
            updatePointerNdc(event);
            raycaster.setFromCamera(pointerNdc, camera);

            if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
              setInspectionLightPosition(dragPoint);
            }

            return;
          }

          if (inspectionLightHit(event)) {
            renderer.domElement.classList.add("three-preview-canvas-light-hover");
          } else {
            renderer.domElement.classList.remove("three-preview-canvas-light-hover");
          }
        };

        const stopInspectionLightDrag = (event: PointerEvent) => {
          if (draggingInspectionLightPointerId !== event.pointerId) {
            return;
          }

          draggingInspectionLightPointerId = null;
          controls.enabled = true;
          if (renderer.domElement.hasPointerCapture(event.pointerId)) {
            renderer.domElement.releasePointerCapture(event.pointerId);
          }
          renderer.domElement.classList.remove("three-preview-canvas-light-dragging");
        };

        renderer.domElement.addEventListener("pointerdown", handleInspectionLightPointerDown, true);
        renderer.domElement.addEventListener("pointermove", handleInspectionLightPointerMove);
        renderer.domElement.addEventListener("pointerup", stopInspectionLightDrag);
        renderer.domElement.addEventListener("pointercancel", stopInspectionLightDrag);
        renderer.domElement.addEventListener("pointerleave", clearInspectionLightPointerState);

        const resize = (forceBufferResize = false) => {
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);

          if (!forceBufferResize && isLayoutResizeInProgress() && lastWidth > 0 && lastHeight > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            return;
          }

          if (width === lastWidth && height === lastHeight) {
            return;
          }

          lastWidth = width;
          lastHeight = height;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          renderer.render(scene, camera);
        };

        const scheduleResize = () => {
          if (resizeFrame) {
            return;
          }

          resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            resize();
          });
        };

        const finishLayoutResize = () => {
          if (resizeFrame) {
            window.cancelAnimationFrame(resizeFrame);
            resizeFrame = 0;
          }

          if (finishResizeFrame) {
            window.cancelAnimationFrame(finishResizeFrame);
          }

          finishResizeFrame = window.requestAnimationFrame(() => {
            finishResizeFrame = 0;

            if (!disposed) {
              resize(true);
            }
          });
        };

        const resizeObserver = new ResizeObserver(scheduleResize);
        resizeObserver.observe(mount);
        resize(true);
        window.addEventListener(layoutResizeEndEvent, finishLayoutResize);

        let animationFrame = 0;
        const animate = () => {
          controls.update();
          updateCompass();
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        };
        animate();

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          if (resizeFrame) {
            window.cancelAnimationFrame(resizeFrame);
          }
          if (finishResizeFrame) {
            window.cancelAnimationFrame(finishResizeFrame);
          }
          resizeObserver.disconnect();
          window.removeEventListener(layoutResizeEndEvent, finishLayoutResize);
          controls.dispose();
          objectRef.current = null;
          importedTransformRef.current = null;
          inspectionLightToolsRef.current = null;
          renderer.domElement.removeEventListener("pointerdown", handleInspectionLightPointerDown, true);
          renderer.domElement.removeEventListener("pointermove", handleInspectionLightPointerMove);
          renderer.domElement.removeEventListener("pointerup", stopInspectionLightDrag);
          renderer.domElement.removeEventListener("pointercancel", stopInspectionLightDrag);
          renderer.domElement.removeEventListener("pointerleave", clearInspectionLightPointerState);
          clearInspectionLightPointerState();
          disposeThreeObject(object);
          disposeThreeObject(grid);
          disposeThreeObject(inspectionLightTools.group);
          renderer.dispose();
          renderer.domElement.remove();
        };

        setMessage("");
      } catch (error) {
        if (!disposed) {
          const errorMessage = `Could not render 3D preview: ${String(error)}`;
          setMessage(errorMessage);
          onInspectorResult(asset, { status: "error", message: errorMessage });
        }
      }
    }

    void setupPreview();

    return () => {
      disposed = true;
      objectRef.current = null;
      importedTransformRef.current = null;
      inspectionLightToolsRef.current = null;
      cleanup?.();
    };
  }, [asset.id, asset.extension, asset.path, onInspectorResult, previewBackground]);

  return (
    <div className="relative flex h-full min-h-full flex-col overflow-hidden bg-preview">
      <div className="min-h-0 flex-1" ref={mountRef} />
      <button
        type="button"
        className={`three-light-toggle ${inspectionLightEnabled ? "three-light-toggle-active" : ""} ${message ? "three-light-toggle-hidden" : ""}`}
        title={inspectionLightEnabled ? "Turn inspection light off" : "Turn inspection light on"}
        aria-label={inspectionLightEnabled ? "Turn inspection light off" : "Turn inspection light on"}
        aria-pressed={inspectionLightEnabled}
        onClick={() => setInspectionLightEnabled((enabled) => !enabled)}
      >
        <Lightbulb size={16} aria-hidden="true" />
      </button>
      <div className={`viewport-compass ${message ? "viewport-compass-hidden" : ""}`} ref={compassRef} aria-hidden="true">
        <span className="viewport-compass-origin" />
        {viewportCompassAxes.map((axis) => (
          <span key={axis.key} className="contents">
            <span className={`viewport-compass-axis-line viewport-compass-axis-${axis.key}`} data-compass-line={axis.key} />
            <span className={`viewport-compass-axis-label viewport-compass-axis-${axis.key}`} data-compass-label={axis.key}>
              {axis.label}
            </span>
          </span>
        ))}
      </div>
      {message ? (
        <div className="pointer-events-none absolute left-3 top-3 max-w-md rounded-sm border border-line bg-surface/90 px-3 py-2 text-sm text-ink shadow-soft">
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function ThreeThumbnail({ asset }: { asset: ThreeSceneAsset }) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function renderThumbnail() {
      try {
        setFailed(false);
        setThumbnailSrc(null);

        const thumbnail = await runQueuedThreeThumbnailRender(async () => {
          if (disposed) {
            return null;
          }

          const THREE = await import("three");

          if (disposed) {
            return null;
          }

          return renderThreeThumbnailDataUrl(THREE, asset);
        });

        if (!disposed && thumbnail) {
          setThumbnailSrc(thumbnail);
          setFailed(false);
        }
      } catch {
        if (!disposed) {
          setFailed(true);
        }
      }
    }

    void renderThumbnail();

    return () => {
      disposed = true;
    };
  }, [asset.extension, asset.path]);

  if (failed) {
    return <ThreeFallbackThumbnail />;
  }

  if (thumbnailSrc) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-sm border border-line bg-preview">
        <img
          alt=""
          className="h-full w-full object-cover"
          src={thumbnailSrc}
          onError={() => {
            setFailed(true);
          }}
        />
      </div>
    );
  }

  return <ThreeFallbackThumbnail />;
}

export function InspectorMiniThreePreview({ asset }: { asset: ThreeSceneAsset }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    setFailed(false);
    setIsLoading(true);

    async function setupPreview() {
      const mount = mountRef.current;

      if (!mount) {
        return;
      }

      try {
        const THREE = await import("three");

        if (disposed || !mountRef.current) {
          return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1c1c1c);
        const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10_000);
        const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
        const pivot = new THREE.Group();

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x1c1c1c, 1);
        renderer.domElement.className = "inspector-mini-three-canvas";

        mount.innerHTML = "";
        mount.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.1));

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
        keyLight.position.set(3, 5, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xd0d0d0, 0.7);
        fillLight.position.set(-4, 2, -3);
        scene.add(fillLight);

        const object = await loadThreeObject(THREE, asset);

        if (disposed) {
          disposeThreeObject(object);
          renderer.dispose();
          return;
        }

        prepareMaterials(THREE, object);
        centerObjectForTurntable(THREE, object);
        pivot.add(object);
        scene.add(pivot);
        frameThreeThumbnail(THREE, pivot, camera);

        let resizeFrame = 0;
        let animationFrame = 0;

        const resize = () => {
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };

        const scheduleResize = () => {
          if (resizeFrame) {
            return;
          }

          resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            resize();
          });
        };

        const resizeObserver = new ResizeObserver(scheduleResize);
        resizeObserver.observe(mount);
        resize();

        const animationStartTime = performance.now();
        const animate = () => {
          pivot.rotation.y = ((performance.now() - animationStartTime) / 1000) * 0.45;
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        };

        animate();
        setIsLoading(false);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);

          if (resizeFrame) {
            window.cancelAnimationFrame(resizeFrame);
          }

          resizeObserver.disconnect();
          disposeThreeObject(pivot);
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) {
          setFailed(true);
          setIsLoading(false);
        }
      }
    }

    void setupPreview();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [asset.extension, asset.path]);

  return (
    <div className="inspector-mini-preview">
      <div className="absolute inset-0" ref={mountRef} />
      {failed ? <Box size={28} strokeWidth={1.4} aria-hidden="true" /> : null}
      {isLoading && !failed ? <span className="h-6 w-6 rounded-sm bg-surface-raised/70" /> : null}
    </div>
  );
}

export function getLiveModelDimensions(info: ModelInfo, transform: ModelTransform): ModelVector3 {
  return modelAxes.reduce<ModelVector3>(
    (dimensions, axis) => ({
      ...dimensions,
      [axis]: sanitizeModelNumber(Math.abs(info.dimensions[axis] * getModelScaleRatio(axis, info, transform))),
    }),
    { x: 0, y: 0, z: 0 },
  );
}

export function getLiveModelCenter(info: ModelInfo, transform: ModelTransform): ModelVector3 {
  return modelAxes.reduce<ModelVector3>(
    (center, axis) => ({
      ...center,
      [axis]: sanitizeModelNumber(
        transform.position[axis] + (info.boundsCenter[axis] - info.rootTransform.position[axis]) * getModelScaleRatio(axis, info, transform),
      ),
    }),
    { x: 0, y: 0, z: 0 },
  );
}

export function getModelScaleSign(currentScale: number, importedScale: number) {
  if (Math.abs(currentScale) >= MODEL_NUMBER_EPSILON) {
    return Math.sign(currentScale);
  }

  if (Math.abs(importedScale) >= MODEL_NUMBER_EPSILON) {
    return Math.sign(importedScale);
  }

  return 1;
}

export function cloneModelTransform(transform: ModelTransform): ModelTransform {
  return {
    position: cloneModelVector(transform.position),
    rotation: cloneModelVector(transform.rotation),
    scale: cloneModelVector(transform.scale),
  };
}

export function sanitizeModelNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function ThreeFallbackThumbnail() {
  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-sm border border-line bg-preview text-muted">
      <Box size={34} strokeWidth={1.4} aria-hidden="true" />
    </div>
  );
}

function getViewportCompassParts(root: HTMLDivElement | null) {
  if (!root) {
    return null;
  }

  const parts = {} as Record<ModelAxis, { line: HTMLElement; label: HTMLElement }>;

  for (const { key } of viewportCompassAxes) {
    const line = root.querySelector<HTMLElement>(`[data-compass-line="${key}"]`);
    const label = root.querySelector<HTMLElement>(`[data-compass-label="${key}"]`);

    if (!line || !label) {
      return null;
    }

    parts[key] = { line, label };
  }

  return parts;
}

function createInspectionLight(THREE: typeof import("three"), canvas: HTMLCanvasElement): InspectionLightTools {
  const light = new THREE.PointLight(0xfff1c2, 5.2, 10, 1.4);
  const group = new THREE.Group();
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffc65a, depthTest: false });
  const handleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), markerMaterial);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(2.15, 18, 12), handleMaterial);

  marker.renderOrder = 20;
  handle.renderOrder = 21;
  group.add(marker, handle);

  return { canvas, group, handle, light };
}

function setInspectionLightVisibility(tools: InspectionLightTools | null, enabled: boolean) {
  if (!tools) {
    return;
  }

  tools.group.visible = enabled;
  tools.light.visible = enabled;

  if (!enabled) {
    tools.canvas.classList.remove("three-preview-canvas-light-hover", "three-preview-canvas-light-dragging");
  }
}

async function loadThreeObject(THREE: typeof import("three"), asset: ThreeSceneAsset) {
  const sourceObject = await loadCachedThreeObject(THREE, asset);
  return cloneThreeObjectForPreview(sourceObject);
}

async function loadCachedThreeObject(THREE: typeof import("three"), asset: ThreeSceneAsset) {
  const cacheKey = getThreeObjectCacheKey(asset);
  let entry = threeObjectCache.get(cacheKey);

  if (!entry) {
    const promise = loadThreeObjectSource(THREE, asset);
    entry = {
      lastUsed: ++threeObjectCacheClock,
      promise,
    };
    threeObjectCache.set(cacheKey, entry);
    promise
      .then((object) => {
        const settledEntry = threeObjectCache.get(cacheKey);

        if (settledEntry?.promise === promise) {
          settledEntry.object = object;
          settledEntry.promise = undefined;
        }

        trimThreeObjectCache();
        return object;
      })
      .catch(() => {
        threeObjectCache.delete(cacheKey);
      });
  }

  entry.lastUsed = ++threeObjectCacheClock;
  const object = entry.object ?? (entry.promise ? await entry.promise : undefined);

  if (!object) {
    throw new Error(`3D model cache entry for ${asset.name} is unavailable.`);
  }

  entry.lastUsed = ++threeObjectCacheClock;
  return object;
}

async function loadThreeObjectSource(THREE: typeof import("three"), asset: ThreeSceneAsset) {
  const extension = asset.extension.toLowerCase();

  if (extension === "glb" || extension === "gltf") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    const bytes = await readPreviewBytes(asset.path);
    const data = extension === "glb" ? toArrayBuffer(bytes) : new TextDecoder().decode(bytes);
    const gltf = await parseGltf(loader, data, getAssetResourcePath(asset.path));
    return gltf.scene;
  }

  if (extension === "obj") {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    const loader = new OBJLoader();
    const bytes = await readPreviewBytes(asset.path);
    return loader.parse(new TextDecoder().decode(bytes));
  }

  if (extension === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const loader = new STLLoader();
    const bytes = await readPreviewBytes(asset.path);
    const geometry = loader.parse(toArrayBuffer(bytes));
    geometry.computeVertexNormals();
    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xcbd5df,
        metalness: 0.05,
        roughness: 0.65,
      }),
    );
  }

  throw new Error(`No loader is configured for .${extension}.`);
}

function cloneThreeObjectForPreview(sourceObject: import("three").Object3D) {
  const clone = sourceObject.clone(true);
  const geometries = new Map<string, import("three").BufferGeometry>();
  const materials = new Map<string, import("three").Material>();

  clone.traverse((child) => {
    const mesh = child as import("three").Mesh;

    if (!mesh.isMesh) {
      return;
    }

    if (mesh.geometry) {
      const geometry = mesh.geometry as import("three").BufferGeometry;
      let clonedGeometry = geometries.get(geometry.uuid);

      if (!clonedGeometry) {
        clonedGeometry = geometry.clone();
        geometries.set(geometry.uuid, clonedGeometry);
      }

      mesh.geometry = clonedGeometry;
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => cloneThreeMaterial(material, materials));
    } else if (mesh.material) {
      mesh.material = cloneThreeMaterial(mesh.material, materials);
    }
  });

  return clone;
}

function cloneThreeMaterial(material: import("three").Material, materials: Map<string, import("three").Material>) {
  let clonedMaterial = materials.get(material.uuid);

  if (!clonedMaterial) {
    clonedMaterial = material.clone();
    materials.set(material.uuid, clonedMaterial);
  }

  return clonedMaterial;
}

function getThreeObjectCacheKey(asset: ThreeSceneAsset) {
  return `${asset.extension.toLowerCase()}:${asset.path}`;
}

function trimThreeObjectCache() {
  const readyEntries = [...threeObjectCache.entries()]
    .filter(([, entry]) => entry.object && !entry.promise)
    .sort(([, first], [, second]) => first.lastUsed - second.lastUsed);

  while (readyEntries.length > MAX_CACHED_THREE_OBJECTS) {
    const [cacheKey, entry] = readyEntries.shift()!;

    if (entry.object) {
      disposeThreeObject(entry.object);
    }

    threeObjectCache.delete(cacheKey);
  }
}

function parseGltf(
  loader: import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader,
  data: ArrayBuffer | string,
  resourcePath: string,
) {
  return new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((resolve, reject) => {
    loader.parse(data, resourcePath, resolve, reject);
  });
}

function prepareMaterials(THREE: typeof import("three"), object: import("three").Object3D) {
  object.traverse((child) => {
    const mesh = child as import("three").Mesh;

    if (!mesh.isMesh) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (!material) {
        continue;
      }

      const standardMaterial = material as import("three").MeshStandardMaterial;
      standardMaterial.side = THREE.DoubleSide;
      standardMaterial.needsUpdate = true;
    }

    if (!mesh.material) {
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0xcbd5df,
        metalness: 0.05,
        roughness: 0.65,
        side: THREE.DoubleSide,
      });
    }
  });
}

function getModelTransform(object: import("three").Object3D): ModelTransform {
  return {
    position: toModelVector(object.position),
    rotation: {
      x: radiansToDegrees(object.rotation.x),
      y: radiansToDegrees(object.rotation.y),
      z: radiansToDegrees(object.rotation.z),
    },
    scale: toModelVector(object.scale),
  };
}

function inspectThreeModel(
  THREE: typeof import("three"),
  object: import("three").Object3D,
  rootTransform: ModelTransform,
): ModelInfo {
  const box = new THREE.Box3().setFromObject(object);
  const boxIsEmpty = box.isEmpty();
  const dimensions = boxIsEmpty ? new THREE.Vector3() : box.getSize(new THREE.Vector3());
  const boundsCenter = boxIsEmpty ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  const materialIds = new Set<string>();
  let meshCount = 0;
  let nodeCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;

  object.traverse((child) => {
    nodeCount += 1;

    const mesh = child as import("three").Mesh;

    if (!mesh.isMesh) {
      return;
    }

    meshCount += 1;

    const geometry = mesh.geometry as import("three").BufferGeometry | undefined;
    const position = geometry?.getAttribute("position");

    if (position) {
      vertexCount += position.count;
      triangleCount += geometry?.index ? geometry.index.count / 3 : position.count / 3;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      if (material?.uuid) {
        materialIds.add(material.uuid);
      }
    }
  });

  return {
    boundsCenter: toModelVector(boundsCenter),
    dimensions: toModelVector(dimensions),
    materialCount: materialIds.size,
    meshCount,
    nodeCount,
    rootTransform: cloneModelTransform(rootTransform),
    triangleCount: Math.round(triangleCount),
    vertexCount,
  };
}

function applyModelTransform(object: import("three").Object3D, transform: ModelTransform) {
  object.position.set(transform.position.x, transform.position.y, transform.position.z);
  object.rotation.set(degreesToRadians(transform.rotation.x), degreesToRadians(transform.rotation.y), degreesToRadians(transform.rotation.z));
  object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  object.updateMatrixWorld(true);
}

function getModelScaleRatio(axis: ModelAxis, info: ModelInfo, transform: ModelTransform) {
  const importedScale = info.rootTransform.scale[axis];

  if (Math.abs(importedScale) < MODEL_NUMBER_EPSILON) {
    return 1;
  }

  return transform.scale[axis] / importedScale;
}

function toModelVector(vector: { x: number; y: number; z: number }): ModelVector3 {
  return {
    x: sanitizeModelNumber(vector.x),
    y: sanitizeModelNumber(vector.y),
    z: sanitizeModelNumber(vector.z),
  };
}

function cloneModelVector(vector: ModelVector3): ModelVector3 {
  return {
    x: sanitizeModelNumber(vector.x),
    y: sanitizeModelNumber(vector.y),
    z: sanitizeModelNumber(vector.z),
  };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function frameThreeObject(
  THREE: typeof import("three"),
  object: import("three").Object3D,
  camera: import("three").PerspectiveCamera,
  controls: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDim * 1.65;
  const horizontalRadius = Math.max(
    Math.abs(box.min.x),
    Math.abs(box.max.x),
    Math.abs(box.min.z),
    Math.abs(box.max.z),
    maxDim * 0.5,
  );
  const gridSize = Math.max(horizontalRadius * 2.2, maxDim * 2.2, 4);

  camera.position.set(center.x + distance * 0.65, center.y + distance * 0.45, center.z + distance);
  camera.near = Math.max(maxDim / 1000, 0.01);
  camera.far = Math.max(maxDim * 100, gridSize * 4, 1000);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();

  return new THREE.GridHelper(gridSize, 20, 0x5f6f7a, 0x303842);
}

function frameThreeThumbnail(
  THREE: typeof import("three"),
  object: import("three").Object3D,
  camera: import("three").PerspectiveCamera,
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDim * 1.9;

  camera.position.set(center.x + distance * 0.75, center.y + distance * 0.45, center.z + distance);
  camera.near = Math.max(maxDim / 1000, 0.01);
  camera.far = Math.max(maxDim * 100, 1000);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function centerObjectForTurntable(THREE: typeof import("three"), object: import("three").Object3D) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.updateMatrixWorld(true);
}

function runQueuedThreeThumbnailRender<T>(task: () => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeThreeThumbnailRenders += 1;

      task()
        .then(resolve, reject)
        .finally(() => {
          activeThreeThumbnailRenders = Math.max(0, activeThreeThumbnailRenders - 1);
          queuedThreeThumbnailRenders.shift()?.();
        });
    };

    if (activeThreeThumbnailRenders < MAX_THREE_THUMBNAIL_RENDERS) {
      run();
      return;
    }

    queuedThreeThumbnailRenders.push(run);
  });
}

async function renderThreeThumbnailDataUrl(THREE: typeof import("three"), asset: ThreeSceneAsset) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1c1c);

  const camera = new THREE.PerspectiveCamera(42, THREE_THUMBNAIL_WIDTH / THREE_THUMBNAIL_HEIGHT, 0.01, 10_000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  let object: import("three").Object3D | null = null;

  try {
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x1c1c1c, 1);
    renderer.setSize(THREE_THUMBNAIL_WIDTH, THREE_THUMBNAIL_HEIGHT, false);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    object = await loadThreeObject(THREE, asset);
    scene.add(object);
    prepareMaterials(THREE, object);
    frameThreeThumbnail(THREE, object, camera);
    renderer.render(scene, camera);

    return renderer.domElement.toDataURL("image/png");
  } finally {
    if (object) {
      disposeThreeObject(object);
    }

    renderer.dispose();
    renderer.forceContextLoss();
  }
}

function disposeThreeObject(object: import("three").Object3D) {
  object.traverse((child) => {
    const disposable = child as import("three").Object3D & {
      geometry?: { dispose: () => void };
      material?: import("three").Material | import("three").Material[];
    };

    disposable.geometry?.dispose();

    const materials = Array.isArray(disposable.material) ? disposable.material : [disposable.material];

    for (const material of materials) {
      material?.dispose();
    }
  });
}

function hexToNumber(hex: string) {
  return Number.parseInt((isHexColor(hex) ? hex : "#1c1c1c").slice(1), 16);
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function isLayoutResizeInProgress() {
  return document.body.classList.contains("is-resizing-pane") || document.body.classList.contains("is-resizing-row");
}
