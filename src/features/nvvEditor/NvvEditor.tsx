import { MousePointer2, PenTool } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NvvAnchorPoint, NvvDocument, NvvDocumentChangeOptions, NvvPath, NvvPoint } from "../inventoryProject";
import { getNvvPathData } from "./nvvSvg";

type NvvTool = "select" | "direct-select" | "pen";
type NvvTransformHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

type NvvDragState =
  | {
      anchorIndex: number;
      beforeDocument: NvvDocument;
      label: string;
      kind: "pen";
      pathId: string;
      pointerId: number;
      start: NvvPoint;
    }
  | {
      anchorIndex: number;
      beforeDocument: NvvDocument;
      kind: "anchor";
      originalAnchor: NvvAnchorPoint;
      pathId: string;
      pointerId: number;
      start: NvvPoint;
    }
  | {
      anchorIndex: number;
      beforeDocument: NvvDocument;
      handle: "handleIn" | "handleOut";
      kind: "handle";
      pathId: string;
      pointerId: number;
    }
  | {
      beforeDocument: NvvDocument;
      bounds: NvvBounds;
      handle: NvvTransformHandle;
      kind: "transform";
      path: NvvPath;
      pointerId: number;
    };

type NvvBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function NvvEditor({
  document,
  onChange,
  zoomPercent,
}: {
  document: NvvDocument;
  onChange: (document: NvvDocument, options?: NvvDocumentChangeOptions) => void;
  zoomPercent: number;
}) {
  const [activeTool, setActiveTool] = useState<NvvTool>("select");
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<NvvDragState | null>(null);
  const latestDocumentRef = useRef(document);
  const selectHoldTimerRef = useRef<number | null>(null);
  const selectHoldActivatedRef = useRef(false);
  const zoomScale = zoomPercent / 100;
  const paths = document.paths ?? [];

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  useEffect(
    () => () => {
      clearSelectHoldTimer();
    },
    [],
  );

  function startPenAnchor(event: ReactPointerEvent<SVGSVGElement>) {
    if (activeTool !== "pen" || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event, zoomScale);
    const existingPath = paths[paths.length - 1];
    const closeTarget =
      existingPath && !existingPath.closed && existingPath.anchors.length > 2
        ? findCloseTargetAnchor(point, existingPath.anchors, 10 / zoomScale)
        : null;

    if (existingPath && closeTarget) {
      const nextPath = { ...existingPath, closed: true, closedToAnchorIndex: closeTarget.index };
      const nextPaths = [...paths.slice(0, -1), nextPath];
      const nextDocument = { ...document, paths: nextPaths };

      latestDocumentRef.current = nextDocument;
      setActivePathId(nextPath.id);
      onChange(nextDocument);
      setDragState({
        anchorIndex: closeTarget.index,
        beforeDocument: document,
        kind: "pen",
        label: "Close Path",
        pathId: nextPath.id,
        pointerId: event.pointerId,
        start: closeTarget.anchor,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const nextAnchor: NvvAnchorPoint = { x: point.x, y: point.y };
    const nextPath: NvvPath =
      existingPath && !existingPath.closed
        ? { ...existingPath, anchors: [...existingPath.anchors, nextAnchor] }
        : {
            anchors: [nextAnchor],
            closed: false,
            id: createNvvPathId(),
            stroke: "#e8e8e8",
            strokeWidth: 2,
          };
    const nextPaths = existingPath && !existingPath.closed ? [...paths.slice(0, -1), nextPath] : [...paths, nextPath];
    const nextDocument = { ...document, paths: nextPaths };

    latestDocumentRef.current = nextDocument;
    setActivePathId(nextPath.id);
    onChange(nextDocument);
    setDragState({
      anchorIndex: nextPath.anchors.length - 1,
      beforeDocument: document,
      kind: "pen",
      label: existingPath && !existingPath.closed ? "Add Anchor" : "Draw Path",
      pathId: nextPath.id,
      pointerId: event.pointerId,
      start: point,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updatePenAnchorHandles(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const point = getCanvasPoint(event, zoomScale);
    if (dragState.kind === "anchor") {
      updateDirectAnchor(point);
      return;
    }

    if (dragState.kind === "handle") {
      updateDirectHandle(point);
      return;
    }

    if (dragState.kind === "transform") {
      updateTransformPath(point);
      return;
    }

    const latestDocument = latestDocumentRef.current;
    const latestPaths = latestDocument.paths ?? [];
    const handleOut = {
      x: point.x,
      y: point.y,
    };
    const handleIn = {
      x: dragState.start.x - (point.x - dragState.start.x),
      y: dragState.start.y - (point.y - dragState.start.y),
    };
    const nextDocument = {
      ...latestDocument,
      paths: latestPaths.map((path) =>
        path.id === dragState.pathId
          ? {
              ...path,
              anchors: path.anchors.map((anchor, index) =>
                index === dragState.anchorIndex ? { ...anchor, handleIn, handleOut } : anchor,
              ),
            }
          : path,
      ),
    };

    latestDocumentRef.current = nextDocument;
    onChange(nextDocument);
  }

  function finishPenAnchor(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const latestDocument = latestDocumentRef.current;
    setDragState(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const label =
      dragState.kind === "pen"
        ? dragState.label
        : dragState.kind === "anchor"
          ? "Move Anchor"
          : dragState.kind === "handle"
            ? "Move Handle"
            : "Transform Path";
    onChange(latestDocument, {
      history: {
        before: dragState.beforeDocument,
        label,
      },
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (activeTool === "select" && isPrimaryPointer(event)) {
      setActivePathId(null);
    }

    startPenAnchor(event);
  }

  function activateTool(tool: NvvTool) {
    setActiveTool(tool);

    if (tool === "select") {
      setActivePathId(null);
    }
  }

  function startSelectToolHold() {
    clearSelectHoldTimer();
    selectHoldActivatedRef.current = false;
    selectHoldTimerRef.current = window.setTimeout(() => {
      selectHoldActivatedRef.current = true;
      activateTool("direct-select");
    }, 450);
  }

  function finishSelectToolHold() {
    clearSelectHoldTimer();

    if (selectHoldActivatedRef.current) {
      selectHoldActivatedRef.current = false;
      return;
    }

    activateTool("select");
  }

  function clearSelectHoldTimer() {
    if (selectHoldTimerRef.current !== null) {
      window.clearTimeout(selectHoldTimerRef.current);
      selectHoldTimerRef.current = null;
    }
  }

  function selectPath(pathId: string) {
    if (activeTool === "select" || activeTool === "direct-select") {
      setActivePathId(pathId);
    }
  }

  function startDirectAnchorDrag(event: ReactPointerEvent<SVGCircleElement>, pathId: string, anchorIndex: number, anchor: NvvAnchorPoint) {
    if (activeTool !== "direct-select" || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActivePathId(pathId);

    if (event.ctrlKey) {
      toggleAnchorHandleMode(pathId, anchorIndex);
      return;
    }

    setDragState({
      anchorIndex,
      beforeDocument: document,
      kind: "anchor",
      originalAnchor: anchor,
      pathId,
      pointerId: event.pointerId,
      start: getCanvasPointFromElement(event, zoomScale),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function toggleAnchorHandleMode(pathId: string, anchorIndex: number) {
    const beforeDocument = latestDocumentRef.current;
    const latestPaths = beforeDocument.paths ?? [];
    const nextDocument = {
      ...beforeDocument,
      paths: latestPaths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              anchors: path.anchors.map((anchor, index) => (index === anchorIndex ? toggleSmoothCornerAnchor(anchor) : anchor)),
            }
          : path,
      ),
    };

    latestDocumentRef.current = nextDocument;
    onChange(nextDocument, {
      history: {
        before: beforeDocument,
        label: "Toggle Anchor",
      },
    });
  }

  function startDirectHandleDrag(
    event: ReactPointerEvent<SVGRectElement>,
    pathId: string,
    anchorIndex: number,
    handle: "handleIn" | "handleOut",
  ) {
    if (activeTool !== "direct-select" || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActivePathId(pathId);
    setDragState({
      anchorIndex,
      beforeDocument: document,
      handle,
      kind: "handle",
      pathId,
      pointerId: event.pointerId,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDirectAnchor(point: NvvPoint) {
    if (!dragState || dragState.kind !== "anchor") {
      return;
    }

    const latestDocument = latestDocumentRef.current;
    const latestPaths = latestDocument.paths ?? [];
    const deltaX = point.x - dragState.start.x;
    const deltaY = point.y - dragState.start.y;
    const nextAnchor = moveAnchorWithHandles(dragState.originalAnchor, deltaX, deltaY);
    const nextDocument = {
      ...latestDocument,
      paths: latestPaths.map((path) =>
        path.id === dragState.pathId
          ? {
              ...path,
              anchors: path.anchors.map((anchor, index) => (index === dragState.anchorIndex ? nextAnchor : anchor)),
            }
          : path,
      ),
    };

    latestDocumentRef.current = nextDocument;
    onChange(nextDocument);
  }

  function updateDirectHandle(point: NvvPoint) {
    if (!dragState || dragState.kind !== "handle") {
      return;
    }

    const latestDocument = latestDocumentRef.current;
    const latestPaths = latestDocument.paths ?? [];
    const nextDocument = {
      ...latestDocument,
      paths: latestPaths.map((path) =>
        path.id === dragState.pathId
          ? {
              ...path,
              anchors: path.anchors.map((anchor, index) =>
                index === dragState.anchorIndex ? moveHandle(anchor, dragState.handle, point) : anchor,
              ),
            }
          : path,
      ),
    };

    latestDocumentRef.current = nextDocument;
    onChange(nextDocument);
  }

  function startTransformDrag(event: ReactPointerEvent<SVGRectElement>, path: NvvPath, bounds: NvvBounds, handle: NvvTransformHandle) {
    if (activeTool !== "select" || !isPrimaryPointer(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActivePathId(path.id);
    setDragState({
      beforeDocument: document,
      bounds,
      handle,
      kind: "transform",
      path,
      pointerId: event.pointerId,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateTransformPath(point: NvvPoint) {
    if (!dragState || dragState.kind !== "transform") {
      return;
    }

    const latestDocument = latestDocumentRef.current;
    const latestPaths = latestDocument.paths ?? [];
    const nextBounds = getTransformedBounds(dragState.bounds, dragState.handle, point);
    const nextPath = transformPathToBounds(dragState.path, dragState.bounds, nextBounds);
    const nextDocument = {
      ...latestDocument,
      paths: latestPaths.map((path) => (path.id === dragState.path.id ? nextPath : path)),
    };

    latestDocumentRef.current = nextDocument;
    onChange(nextDocument);
  }

  return (
    <div className="nvv-editor">
      <div className="nvv-tool-rail" aria-label="Draw tools" role="toolbar">
        <button
          aria-label={activeTool === "direct-select" ? "Direct Select tool" : "Select tool"}
          aria-pressed={activeTool === "select" || activeTool === "direct-select"}
          className={`nvv-tool-button ${activeTool === "select" || activeTool === "direct-select" ? "nvv-tool-button-active" : ""}`}
          title={activeTool === "direct-select" ? "Direct Select" : "Select"}
          type="button"
          onPointerCancel={clearSelectHoldTimer}
          onPointerDown={startSelectToolHold}
          onPointerLeave={clearSelectHoldTimer}
          onPointerUp={finishSelectToolHold}
        >
          <MousePointer2 className={activeTool === "direct-select" ? "nvv-direct-select-icon" : ""} size={15} aria-hidden="true" />
        </button>
        <button
          aria-label="Pen tool"
          aria-pressed={activeTool === "pen"}
          className={`nvv-tool-button ${activeTool === "pen" ? "nvv-tool-button-active" : ""}`}
          title="Pen"
          type="button"
          onClick={() => activateTool("pen")}
        >
          <PenTool size={15} aria-hidden="true" />
        </button>
      </div>
      <div
        aria-label={`${document.title} vector canvas`}
        className="nvv-canvas"
        role="img"
        style={{
          height: document.canvasHeight * zoomScale,
          width: document.canvasWidth * zoomScale,
        }}
      >
        <svg
          className={`nvv-canvas-svg ${activeTool === "pen" ? "nvv-canvas-svg-pen" : ""}`}
          viewBox={`0 0 ${document.canvasWidth} ${document.canvasHeight}`}
          onPointerCancel={finishPenAnchor}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={updatePenAnchorHandles}
          onPointerUp={finishPenAnchor}
        >
          {paths.map((path) => {
            const isActivePath = activePathId === path.id;
            const showPathControls = (activeTool === "pen" || activeTool === "direct-select") && isActivePath;
            const selectionBounds = activeTool === "select" && isActivePath ? getNvvPathBounds(path) : null;

            return (
            <g key={path.id}>
              {selectionBounds ? (
                <g className="nvv-transform-box">
                  <rect
                    className="nvv-transform-box-frame"
                    height={selectionBounds.height}
                    width={selectionBounds.width}
                    x={selectionBounds.x}
                    y={selectionBounds.y}
                  />
                  {getTransformHandles(selectionBounds).map((handle) => (
                    <rect
                      key={handle.id}
                      className={`nvv-transform-handle nvv-transform-handle-${handle.id}`}
                      height="5"
                      width="5"
                      x={handle.x - 2.5}
                      y={handle.y - 2.5}
                      onPointerDown={(event) => startTransformDrag(event, path, selectionBounds, handle.id)}
                    />
                  ))}
                </g>
              ) : null}
              <path
                className="nvv-path-hit-target"
                d={getNvvPathData(path)}
                fill="none"
                strokeWidth={getPathHitTargetWidth(path.strokeWidth)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectPath(path.id);
                }}
              />
              <path
                className="nvv-path-stroke"
                d={getNvvPathData(path)}
                fill="none"
                stroke={path.stroke}
                strokeWidth={path.strokeWidth}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectPath(path.id);
                }}
              />
              {showPathControls ? path.anchors.map((anchor, index) => (
                <g key={`${path.id}-anchor-${index}`}>
                  {anchor.handleIn ? (
                    <>
                      <line className="nvv-handle-line" x1={anchor.x} x2={anchor.handleIn.x} y1={anchor.y} y2={anchor.handleIn.y} />
                      <rect
                        className="nvv-control-hit-target"
                        height="12"
                        width="12"
                        x={anchor.handleIn.x - 6}
                        y={anchor.handleIn.y - 6}
                        onPointerDown={(event) => startDirectHandleDrag(event, path.id, index, "handleIn")}
                      />
                      <rect
                        className="nvv-handle-point"
                        height="2"
                        width="2"
                        x={anchor.handleIn.x - 1}
                        y={anchor.handleIn.y - 1}
                        onPointerDown={(event) => startDirectHandleDrag(event, path.id, index, "handleIn")}
                      />
                    </>
                  ) : null}
                  {anchor.handleOut ? (
                    <>
                      <line className="nvv-handle-line" x1={anchor.x} x2={anchor.handleOut.x} y1={anchor.y} y2={anchor.handleOut.y} />
                      <rect
                        className="nvv-control-hit-target"
                        height="12"
                        width="12"
                        x={anchor.handleOut.x - 6}
                        y={anchor.handleOut.y - 6}
                        onPointerDown={(event) => startDirectHandleDrag(event, path.id, index, "handleOut")}
                      />
                      <rect
                        className="nvv-handle-point"
                        height="2"
                        width="2"
                        x={anchor.handleOut.x - 1}
                        y={anchor.handleOut.y - 1}
                        onPointerDown={(event) => startDirectHandleDrag(event, path.id, index, "handleOut")}
                      />
                    </>
                  ) : null}
                  <circle
                    className="nvv-control-hit-target"
                    cx={anchor.x}
                    cy={anchor.y}
                    r="7"
                    onPointerDown={(event) => startDirectAnchorDrag(event, path.id, index, anchor)}
                  />
                  <circle
                    className="nvv-anchor-point"
                    cx={anchor.x}
                    cy={anchor.y}
                    r="3.2"
                    onPointerDown={(event) => startDirectAnchorDrag(event, path.id, index, anchor)}
                  />
                  {getAnchorHandleMode(anchor) === "corner" ? (
                    <line
                      className="nvv-anchor-corner-mark"
                      transform={`rotate(${getCornerMarkAngle(anchor)} ${anchor.x} ${anchor.y})`}
                      x1={anchor.x}
                      x2={anchor.x}
                      y1={anchor.y - 3}
                      y2={anchor.y + 3}
                    />
                  ) : null}
                </g>
              )) : null}
            </g>
          );
          })}
        </svg>
      </div>
    </div>
  );
}

function getPathHitTargetWidth(strokeWidth: number) {
  return Math.max(10, strokeWidth + 8);
}

function getNvvPathBounds(path: NvvPath) {
  const [firstAnchor, ...anchors] = path.anchors;
  if (!firstAnchor) {
    return null;
  }

  const points: NvvPoint[] = [firstAnchor];
  let previousAnchor = firstAnchor;

  for (const anchor of anchors) {
    points.push(...getCubicBoundsPoints(previousAnchor, previousAnchor.handleOut ?? previousAnchor, anchor.handleIn ?? anchor, anchor));
    previousAnchor = anchor;
  }

  if (path.closed) {
    const closeAnchor = path.anchors[getClosedAnchorIndex(path)] ?? firstAnchor;
    points.push(...getCubicBoundsPoints(previousAnchor, previousAnchor.handleOut ?? previousAnchor, closeAnchor.handleIn ?? closeAnchor, closeAnchor));
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const strokeOutset = path.strokeWidth / 2;

  return {
    height: maxY - minY + strokeOutset * 2,
    width: maxX - minX + strokeOutset * 2,
    x: minX - strokeOutset,
    y: minY - strokeOutset,
  };
}

function getCubicBoundsPoints(start: NvvPoint, controlA: NvvPoint, controlB: NvvPoint, end: NvvPoint) {
  const times = new Set([0, 1]);

  for (const time of getCubicExtremaTimes(start.x, controlA.x, controlB.x, end.x)) {
    times.add(time);
  }

  for (const time of getCubicExtremaTimes(start.y, controlA.y, controlB.y, end.y)) {
    times.add(time);
  }

  return [...times].map((time) => getCubicPoint(start, controlA, controlB, end, time));
}

function getCubicExtremaTimes(start: number, controlA: number, controlB: number, end: number) {
  const a = -start + 3 * controlA - 3 * controlB + end;
  const b = 2 * (start - 2 * controlA + controlB);
  const c = controlA - start;
  const epsilon = 0.000001;

  if (Math.abs(a) < epsilon) {
    if (Math.abs(b) < epsilon) {
      return [];
    }

    const time = -c / b;
    return time > 0 && time < 1 ? [time] : [];
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return [];
  }

  const root = Math.sqrt(discriminant);
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)].filter((time) => time > 0 && time < 1);
}

function getCubicPoint(start: NvvPoint, controlA: NvvPoint, controlB: NvvPoint, end: NvvPoint, time: number): NvvPoint {
  const inverseTime = 1 - time;
  const startWeight = inverseTime ** 3;
  const controlAWeight = 3 * inverseTime ** 2 * time;
  const controlBWeight = 3 * inverseTime * time ** 2;
  const endWeight = time ** 3;

  return {
    x: start.x * startWeight + controlA.x * controlAWeight + controlB.x * controlBWeight + end.x * endWeight,
    y: start.y * startWeight + controlA.y * controlAWeight + controlB.y * controlBWeight + end.y * endWeight,
  };
}

function getTransformHandles(bounds: NvvBounds): Array<{ id: NvvTransformHandle; x: number; y: number }> {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  return [
    { id: "top-left", x: bounds.x, y: bounds.y },
    { id: "top", x: centerX, y: bounds.y },
    { id: "top-right", x: right, y: bounds.y },
    { id: "right", x: right, y: centerY },
    { id: "bottom-right", x: right, y: bottom },
    { id: "bottom", x: centerX, y: bottom },
    { id: "bottom-left", x: bounds.x, y: bottom },
    { id: "left", x: bounds.x, y: centerY },
  ];
}

function getTransformedBounds(bounds: NvvBounds, handle: NvvTransformHandle, point: NvvPoint): NvvBounds {
  const minSize = 1;
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;

  if (handle.includes("left")) left = Math.min(point.x, right - minSize);
  if (handle.includes("right")) right = Math.max(point.x, left + minSize);
  if (handle.includes("top")) top = Math.min(point.y, bottom - minSize);
  if (handle.includes("bottom")) bottom = Math.max(point.y, top + minSize);

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  };
}

function transformPathToBounds(path: NvvPath, fromBounds: NvvBounds, toBounds: NvvBounds): NvvPath {
  const scaleX = fromBounds.width === 0 ? 1 : toBounds.width / fromBounds.width;
  const scaleY = fromBounds.height === 0 ? 1 : toBounds.height / fromBounds.height;

  return {
    ...path,
    anchors: path.anchors.map((anchor) => transformAnchor(anchor, fromBounds, toBounds, scaleX, scaleY)),
  };
}

function transformAnchor(anchor: NvvAnchorPoint, fromBounds: NvvBounds, toBounds: NvvBounds, scaleX: number, scaleY: number): NvvAnchorPoint {
  return {
    ...anchor,
    handleIn: anchor.handleIn ? transformPoint(anchor.handleIn, fromBounds, toBounds, scaleX, scaleY) : anchor.handleIn,
    handleOut: anchor.handleOut ? transformPoint(anchor.handleOut, fromBounds, toBounds, scaleX, scaleY) : anchor.handleOut,
    ...transformPoint(anchor, fromBounds, toBounds, scaleX, scaleY),
  };
}

function transformPoint(point: NvvPoint, fromBounds: NvvBounds, toBounds: NvvBounds, scaleX: number, scaleY: number): NvvPoint {
  return {
    x: toBounds.x + (point.x - fromBounds.x) * scaleX,
    y: toBounds.y + (point.y - fromBounds.y) * scaleY,
  };
}

function getCanvasPoint(event: ReactPointerEvent<SVGSVGElement>, zoomScale: number): NvvPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / zoomScale,
    y: (event.clientY - bounds.top) / zoomScale,
  };
}

function getCanvasPointFromElement(event: ReactPointerEvent<SVGElement>, zoomScale: number): NvvPoint {
  const svg = event.currentTarget.ownerSVGElement;
  const bounds = (svg ?? event.currentTarget).getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / zoomScale,
    y: (event.clientY - bounds.top) / zoomScale,
  };
}

function createNvvPathId() {
  return `path-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveAnchorWithHandles(anchor: NvvAnchorPoint, deltaX: number, deltaY: number): NvvAnchorPoint {
  return {
    ...anchor,
    handleIn: anchor.handleIn ? { x: anchor.handleIn.x + deltaX, y: anchor.handleIn.y + deltaY } : anchor.handleIn,
    handleOut: anchor.handleOut ? { x: anchor.handleOut.x + deltaX, y: anchor.handleOut.y + deltaY } : anchor.handleOut,
    x: anchor.x + deltaX,
    y: anchor.y + deltaY,
  };
}

function moveHandle(anchor: NvvAnchorPoint, handle: "handleIn" | "handleOut", point: NvvPoint): NvvAnchorPoint {
  return getAnchorHandleMode(anchor) === "corner" ? { ...anchor, [handle]: point } : moveSmoothHandle(anchor, handle, point);
}

function moveSmoothHandle(anchor: NvvAnchorPoint, handle: "handleIn" | "handleOut", point: NvvPoint): NvvAnchorPoint {
  const oppositeHandle = handle === "handleIn" ? "handleOut" : "handleIn";
  const mirroredPoint = {
    x: anchor.x - (point.x - anchor.x),
    y: anchor.y - (point.y - anchor.y),
  };

  return {
    ...anchor,
    [handle]: point,
    [oppositeHandle]: mirroredPoint,
  };
}

function toggleSmoothCornerAnchor(anchor: NvvAnchorPoint): NvvAnchorPoint {
  return getAnchorHandleMode(anchor) === "corner" ? smoothAnchor(anchor) : { ...anchor, handleMode: "corner" };
}

function smoothAnchor(anchor: NvvAnchorPoint): NvvAnchorPoint {
  const handle = anchor.handleOut ?? anchor.handleIn;
  if (!handle) {
    return { ...anchor, handleMode: "smooth" };
  }

  return moveSmoothHandle({ ...anchor, handleMode: "smooth" }, anchor.handleOut ? "handleOut" : "handleIn", handle);
}

function getAnchorHandleMode(anchor: NvvAnchorPoint) {
  return anchor.handleMode === "corner" ? "corner" : "smooth";
}

function getCornerMarkAngle(anchor: NvvAnchorPoint) {
  const vectors = [anchor.handleIn, anchor.handleOut]
    .filter((handle): handle is NvvPoint => Boolean(handle))
    .map((handle) => ({
      x: handle.x - anchor.x,
      y: handle.y - anchor.y,
    }))
    .filter((vector) => Math.hypot(vector.x, vector.y) > 0.000001);

  if (vectors.length === 0) {
    return 0;
  }

  const vector = vectors.length === 1 ? vectors[0] : { x: vectors[0].x - vectors[1].x, y: vectors[0].y - vectors[1].y };
  if (Math.hypot(vector.x, vector.y) <= 0.000001) {
    return 0;
  }

  return (Math.atan2(vector.y, vector.x) * 180) / Math.PI + 90;
}

function findCloseTargetAnchor(
  point: NvvPoint,
  anchors: NvvAnchorPoint[],
  threshold: number,
): { anchor: NvvAnchorPoint; distance: number; index: number } | null {
  let closest: { anchor: NvvAnchorPoint; distance: number; index: number } | null = null;

  anchors.forEach((anchor, index) => {
    if (index === anchors.length - 1) {
      return;
    }

    const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
    if (distance <= threshold && (!closest || distance < closest.distance)) {
      closest = { anchor, distance, index };
    }
  });

  return closest;
}

function getClosedAnchorIndex(path: NvvPath) {
  const closeAnchorIndex = path.closedToAnchorIndex ?? 0;
  return Number.isInteger(closeAnchorIndex) && closeAnchorIndex >= 0 && closeAnchorIndex < path.anchors.length ? closeAnchorIndex : 0;
}

function isPrimaryPointer(event: ReactPointerEvent) {
  return event.isPrimary && event.button === 0;
}
