import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NvdPageLayout } from "../../inventoryProject";
import {
  NVD_PT_TO_PX,
  clampNvdPageLayout,
  getNvdPageLayoutPx,
} from "../layout/nvdPageLayout";

const NVD_MM_PER_INCH = 25.4;
const NVD_PT_PER_INCH = 72;
const NVD_PT_PER_MM = NVD_PT_PER_INCH / NVD_MM_PER_INCH;
const NVD_RULER_THICKNESS_PX = 24;
const NVD_RULER_HANDLE_SIZE_PX = 14;
const NVD_RULER_KEYBOARD_STEP_PT = 6;

type MarginEdge = "marginLeftPt" | "marginRightPt" | "marginTopPt" | "marginBottomPt";
type DragAxis = "x" | "y";
type HandleSide = "top" | "bottom" | "left" | "right";

type DragState = {
  axis: DragAxis;
  edge: MarginEdge;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: NvdPageLayout;
};

type RulerTick = {
  offsetPx: number;
  size: "major" | "minor" | "micro";
};

type RulerLabel = {
  offsetPx: number;
  value: number;
};

export function NvdPageRulers({
  pageCount,
  pageGapPx,
  pageLayout,
  onPageLayoutChange,
}: {
  pageCount: number;
  pageGapPx: number;
  pageLayout: NvdPageLayout;
  onPageLayoutChange: (pageLayout: NvdPageLayout) => void;
}) {
  const pageLayoutPx = getNvdPageLayoutPx(pageLayout);
  const horizontalTicks = useMemo(
    () => createRulerTicks(pageLayout.widthPt, pageLayoutPx.widthPx),
    [pageLayout.widthPt, pageLayoutPx.widthPx],
  );
  const horizontalLabels = useMemo(
    () => createRulerLabels(pageLayout.widthPt, pageLayoutPx.widthPx),
    [pageLayout.widthPt, pageLayoutPx.widthPx],
  );
  const verticalTicks = useMemo(
    () => createRulerTicks(pageLayout.heightPt, pageLayoutPx.heightPx),
    [pageLayout.heightPt, pageLayoutPx.heightPx],
  );
  const verticalLabels = useMemo(
    () => createRulerLabels(pageLayout.heightPt, pageLayoutPx.heightPx),
    [pageLayout.heightPt, pageLayoutPx.heightPx],
  );
  const dragStateRef = useRef<DragState | null>(null);
  const [activeEdge, setActiveEdge] = useState<MarginEdge | null>(null);
  const bodyCursorClassName = getRulerBodyCursorClassName(activeEdge);
  const contentRightPx = pageLayoutPx.widthPx - pageLayoutPx.marginRightPx;
  const contentBottomPx = pageLayoutPx.heightPx - pageLayoutPx.marginBottomPx;

  useEffect(
    () => () => {
      document.body.classList.remove("is-resizing-nvd-ruler-ew", "is-resizing-nvd-ruler-ns");
    },
    [],
  );

  function updateLayout(edge: MarginEdge, deltaPx: number) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const deltaPt = deltaPx / NVD_PT_TO_PX;
    const { startLayout } = dragState;
    const nextLayout = clampNvdPageLayout({
      ...startLayout,
      [edge]:
        edge === "marginLeftPt" || edge === "marginTopPt"
          ? startLayout[edge] + deltaPt
          : startLayout[edge] - deltaPt,
    });

    onPageLayoutChange(nextLayout);
  }

  function beginDrag(edge: MarginEdge, axis: DragAxis, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      axis,
      edge,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: pageLayout,
    };
    setActiveEdge(edge);
    document.body.classList.add(getRulerBodyCursorClassName(edge));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragHandle(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaPx =
      dragState.axis === "x"
        ? event.clientX - dragState.startClientX
        : event.clientY - dragState.startClientY;
    updateLayout(dragState.edge, deltaPx);
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setActiveEdge(null);
    document.body.classList.remove(bodyCursorClassName);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeMargin(edge: MarginEdge, direction: -1 | 1) {
    const deltaPt = direction * NVD_RULER_KEYBOARD_STEP_PT;
    onPageLayoutChange(
      clampNvdPageLayout({
        ...pageLayout,
        [edge]:
          edge === "marginLeftPt" || edge === "marginTopPt"
            ? pageLayout[edge] + deltaPt
            : pageLayout[edge] - deltaPt,
      }),
    );
  }

  return (
    <div className="nvd-page-ruler-overlays">
      {Array.from({ length: pageCount }, (_, pageIndex) => {
        const pageTopPx = pageIndex * (pageLayoutPx.heightPx + pageGapPx);

        return (
          <section
            className="nvd-page-ruler-overlay"
            key={pageIndex}
            style={{
              height: `${pageLayoutPx.heightPx}px`,
              top: `${pageTopPx}px`,
              width: `${pageLayoutPx.widthPx}px`,
            }}
          >
            <div
              aria-hidden="true"
              className="nvd-page-content-frame"
              style={{
                height: `${pageLayoutPx.contentHeightPx}px`,
                left: `${pageLayoutPx.marginLeftPx}px`,
                top: `${pageLayoutPx.marginTopPx}px`,
                width: `${pageLayoutPx.contentWidthPx}px`,
              }}
            />
            <RulerAxis
              axis="horizontal"
              edge="top"
              pageExtentPx={pageLayoutPx.widthPx}
              labels={horizontalLabels}
              ticks={horizontalTicks}
            />
            <RulerAxis
              axis="horizontal"
              edge="bottom"
              pageExtentPx={pageLayoutPx.widthPx}
              labels={horizontalLabels}
              ticks={horizontalTicks}
            />
            <RulerAxis
              axis="vertical"
              edge="left"
              pageExtentPx={pageLayoutPx.heightPx}
              labels={verticalLabels}
              ticks={verticalTicks}
            />
            <RulerAxis
              axis="vertical"
              edge="right"
              pageExtentPx={pageLayoutPx.heightPx}
              labels={verticalLabels}
              ticks={verticalTicks}
            />
            <RulerHandle
              active={activeEdge === "marginLeftPt"}
              ariaLabel={`Page ${pageIndex + 1} left margin`}
              axis="x"
              edge="marginLeftPt"
              horizontalPositionPx={pageLayoutPx.marginLeftPx}
              verticalPositionPx={NVD_RULER_THICKNESS_PX / 2}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="top"
              title={formatMarkerTitle("Left margin", pageLayout.marginLeftPt)}
            />
            <RulerHandle
              active={activeEdge === "marginLeftPt"}
              ariaLabel={`Page ${pageIndex + 1} left margin`}
              axis="x"
              edge="marginLeftPt"
              horizontalPositionPx={pageLayoutPx.marginLeftPx}
              verticalPositionPx={pageLayoutPx.heightPx - NVD_RULER_THICKNESS_PX / 2}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="bottom"
              title={formatMarkerTitle("Left margin", pageLayout.marginLeftPt)}
            />
            <RulerHandle
              active={activeEdge === "marginRightPt"}
              ariaLabel={`Page ${pageIndex + 1} right margin`}
              axis="x"
              edge="marginRightPt"
              horizontalPositionPx={contentRightPx}
              verticalPositionPx={NVD_RULER_THICKNESS_PX / 2}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="top"
              title={formatMarkerTitle("Right margin", pageLayout.marginRightPt)}
            />
            <RulerHandle
              active={activeEdge === "marginRightPt"}
              ariaLabel={`Page ${pageIndex + 1} right margin`}
              axis="x"
              edge="marginRightPt"
              horizontalPositionPx={contentRightPx}
              verticalPositionPx={pageLayoutPx.heightPx - NVD_RULER_THICKNESS_PX / 2}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="bottom"
              title={formatMarkerTitle("Right margin", pageLayout.marginRightPt)}
            />
            <RulerHandle
              active={activeEdge === "marginTopPt"}
              ariaLabel={`Page ${pageIndex + 1} top margin`}
              axis="y"
              edge="marginTopPt"
              horizontalPositionPx={NVD_RULER_THICKNESS_PX / 2}
              verticalPositionPx={pageLayoutPx.marginTopPx}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="left"
              title={formatMarkerTitle("Top margin", pageLayout.marginTopPt)}
            />
            <RulerHandle
              active={activeEdge === "marginTopPt"}
              ariaLabel={`Page ${pageIndex + 1} top margin`}
              axis="y"
              edge="marginTopPt"
              horizontalPositionPx={pageLayoutPx.widthPx - NVD_RULER_THICKNESS_PX / 2}
              verticalPositionPx={pageLayoutPx.marginTopPx}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="right"
              title={formatMarkerTitle("Top margin", pageLayout.marginTopPt)}
            />
            <RulerHandle
              active={activeEdge === "marginBottomPt"}
              ariaLabel={`Page ${pageIndex + 1} bottom margin`}
              axis="y"
              edge="marginBottomPt"
              horizontalPositionPx={NVD_RULER_THICKNESS_PX / 2}
              verticalPositionPx={contentBottomPx}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="left"
              title={formatMarkerTitle("Bottom margin", pageLayout.marginBottomPt)}
            />
            <RulerHandle
              active={activeEdge === "marginBottomPt"}
              ariaLabel={`Page ${pageIndex + 1} bottom margin`}
              axis="y"
              edge="marginBottomPt"
              horizontalPositionPx={pageLayoutPx.widthPx - NVD_RULER_THICKNESS_PX / 2}
              verticalPositionPx={contentBottomPx}
              onBeginDrag={beginDrag}
              onDrag={dragHandle}
              onFinishDrag={finishDrag}
              onNudge={nudgeMargin}
              side="right"
              title={formatMarkerTitle("Bottom margin", pageLayout.marginBottomPt)}
            />
          </section>
        );
      })}
    </div>
  );
}

function RulerAxis({
  axis,
  edge,
  pageExtentPx,
  labels,
  ticks,
}: {
  axis: "horizontal" | "vertical";
  edge: "top" | "bottom" | "left" | "right";
  pageExtentPx: number;
  labels: RulerLabel[];
  ticks: RulerTick[];
}) {
  return (
    <div
      aria-hidden="true"
      className={`nvd-page-ruler nvd-page-ruler-${edge} nvd-page-ruler-${axis}`}
      style={
        axis === "horizontal"
          ? { width: `${pageExtentPx}px` }
          : { height: `${pageExtentPx}px` }
      }
    >
      {ticks.map((tick) => (
        <span
          className={`nvd-page-ruler-tick nvd-page-ruler-tick-${tick.size}`}
          key={`${axis}-${edge}-${tick.offsetPx.toFixed(2)}`}
          style={
            axis === "horizontal"
              ? { left: `${tick.offsetPx}px` }
              : { top: `${tick.offsetPx}px` }
          }
        />
      ))}
      {labels.map((label) => (
        <span
          className="nvd-page-ruler-label"
          key={`${axis}-${edge}-label-${label.value}`}
          style={
            axis === "horizontal"
              ? { left: `${label.offsetPx}px` }
              : { top: `${label.offsetPx}px` }
          }
        >
          {label.value}
        </span>
      ))}
    </div>
  );
}

function RulerHandle({
  active,
  ariaLabel,
  axis,
  edge,
  horizontalPositionPx,
  verticalPositionPx,
  onBeginDrag,
  onDrag,
  onFinishDrag,
  onNudge,
  side,
  title,
}: {
  active: boolean;
  ariaLabel: string;
  axis: DragAxis;
  edge: MarginEdge;
  horizontalPositionPx: number;
  verticalPositionPx: number;
  onBeginDrag: (edge: MarginEdge, axis: DragAxis, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onFinishDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onNudge: (edge: MarginEdge, direction: -1 | 1) => void;
  side: HandleSide;
  title: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`nvd-ruler-handle nvd-ruler-handle-${axis} nvd-ruler-handle-${edge} nvd-ruler-handle-side-${side} ${active ? "nvd-ruler-handle-active" : ""}`}
      style={{
        left: `${horizontalPositionPx - NVD_RULER_HANDLE_SIZE_PX / 2}px`,
        top: `${verticalPositionPx - NVD_RULER_HANDLE_SIZE_PX / 2}px`,
      }}
      title={title}
      type="button"
      onKeyDown={(event) => {
        if (axis === "x" && event.key === "ArrowLeft") {
          event.preventDefault();
          onNudge(edge, -1);
        } else if (axis === "x" && event.key === "ArrowRight") {
          event.preventDefault();
          onNudge(edge, 1);
        } else if (axis === "y" && event.key === "ArrowUp") {
          event.preventDefault();
          onNudge(edge, -1);
        } else if (axis === "y" && event.key === "ArrowDown") {
          event.preventDefault();
          onNudge(edge, 1);
        }
      }}
      onLostPointerCapture={onFinishDrag}
      onPointerCancel={onFinishDrag}
      onPointerDown={(event) => onBeginDrag(edge, axis, event)}
      onPointerMove={onDrag}
      onPointerUp={onFinishDrag}
    >
      <span className="nvd-ruler-handle-glyph" />
    </button>
  );
}

function createRulerTicks(pageExtentPt: number, pageExtentPx: number) {
  const pageExtentMm = pageExtentPt / NVD_PT_PER_MM;
  const ticks: RulerTick[] = [];

  for (let millimeter = 0; millimeter <= pageExtentMm + 0.001; millimeter += 1) {
    const offsetPx = (millimeter / pageExtentMm) * pageExtentPx;
    const roundedMillimeter = Math.round(millimeter);
    ticks.push({
      offsetPx,
      size:
        roundedMillimeter % 10 === 0
          ? "major"
          : roundedMillimeter % 5 === 0
            ? "minor"
            : "micro",
    });
  }

  return ticks;
}

function createRulerLabels(pageExtentPt: number, pageExtentPx: number) {
  const pageExtentMm = pageExtentPt / NVD_PT_PER_MM;
  const labels: RulerLabel[] = [];

  for (let millimeter = 10; millimeter <= pageExtentMm + 0.001; millimeter += 10) {
    labels.push({
      offsetPx: (millimeter / pageExtentMm) * pageExtentPx,
      value: Math.round(millimeter / 10),
    });
  }

  return labels;
}

function formatMarkerTitle(label: string, lengthPt: number) {
  return `${label}: ${(lengthPt / NVD_PT_PER_MM / 10).toFixed(2)} cm`;
}

function getRulerBodyCursorClassName(edge: MarginEdge | null) {
  if (edge === "marginLeftPt" || edge === "marginRightPt") {
    return "is-resizing-nvd-ruler-ew";
  }

  if (edge === "marginTopPt" || edge === "marginBottomPt") {
    return "is-resizing-nvd-ruler-ns";
  }

  return "";
}
