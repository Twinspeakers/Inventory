import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PaintBucket, X } from "lucide-react";
import {
  DEFAULT_NVD_FRAME_BACKGROUND_COLOR,
  clampFrameColorValue,
  getNvdFrameColorOpacityPercent,
  hsvaToRgba,
  normalizeNvdFrameBackgroundColor,
  nvdFrameColorToCssRgba,
  parseNvdFrameBackgroundColor,
  rgbaToHsva,
  roundFrameColorValue,
  toNvdFrameBackgroundColor,
  type NvdFrameColorHsva,
} from "./frameColorUtils";
import {
  NVD_FRAME_PROPERTIES_WINDOW_SET_DISPLAY_MODE_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_READY_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_STATE_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_UPDATE_DIMENSIONS_EVENT,
  NVD_FRAME_PROPERTIES_WINDOW_UPDATE_IMAGE_FIT_EVENT,
  type NvdFramePropertiesWindowDisplayMode,
  type NvdFramePropertiesWindowFrameSnapshot,
  type NvdFramePropertiesWindowSetDisplayModePayload,
  type NvdFramePropertiesWindowStatePayload,
  type NvdFramePropertiesWindowUpdateDimensionsPayload,
  type NvdFramePropertiesWindowUpdateImageFitPayload,
} from "./nvdFramePropertiesWindowBridge";

export function NvdFramePropertiesWindowApp() {
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [frame, setFrame] = useState<NvdFramePropertiesWindowFrameSnapshot | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [activeTab, setActiveTab] = useState<"dimensions" | "display" | "style">("display");
  const [pickerColor, setPickerColor] = useState(DEFAULT_NVD_FRAME_BACKGROUND_COLOR);
  const activeFrameIdRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlistenState: (() => void) | null = null;

    void getCurrentWindow()
      .listen<NvdFramePropertiesWindowStatePayload>(NVD_FRAME_PROPERTIES_WINDOW_STATE_EVENT, ({ payload }) => {
        if (!disposed) {
          setDocumentTitle(payload.documentTitle);
          setFrame(payload.frame);
          setPageCount(Math.max(1, payload.pageCount));
        }
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenState = unlisten;
      });

    void emitTo("main", NVD_FRAME_PROPERTIES_WINDOW_READY_EVENT);

    return () => {
      disposed = true;
      unlistenState?.();
    };
  }, []);

  useEffect(() => {
    if (!frame) {
      activeFrameIdRef.current = null;
      return;
    }

    const nextPickerColor = frame.backgroundColor ?? DEFAULT_NVD_FRAME_BACKGROUND_COLOR;

    if (activeFrameIdRef.current !== frame.id) {
      activeFrameIdRef.current = frame.id;
      setPickerColor(nextPickerColor);
      return;
    }

    if (frame.backgroundColor) {
      setPickerColor(frame.backgroundColor);
    }
  }, [frame]);

  const pickerHsva = useMemo(
    () => rgbaToHsva(parseNvdFrameBackgroundColor(pickerColor)),
    [pickerColor],
  );
  const pickerRgba = useMemo(
    () => parseNvdFrameBackgroundColor(pickerColor),
    [pickerColor],
  );
  const backgroundEnabled = frame?.backgroundColor !== null && frame?.backgroundColor !== undefined;

  function handleClose() {
    void getCurrentWindow().close().catch(() => getCurrentWindow().destroy());
  }

  function emitDisplayModeChange(mode: NvdFramePropertiesWindowDisplayMode) {
    if (!frame) {
      return;
    }

    const payload: NvdFramePropertiesWindowSetDisplayModePayload = {
      objectId: frame.id,
      mode,
    };
    void emitTo("main", NVD_FRAME_PROPERTIES_WINDOW_SET_DISPLAY_MODE_EVENT, payload);
  }

  function handleDisplayModeChange(mode: FrameDisplayMode) {
    emitDisplayModeChange(mode);
  }

  function emitImageFitUpdate(updates: NvdFramePropertiesWindowUpdateImageFitPayload["updates"]) {
    if (!frame) {
      return;
    }

    const payload: NvdFramePropertiesWindowUpdateImageFitPayload = {
      objectId: frame.id,
      updates,
    };
    void emitTo("main", NVD_FRAME_PROPERTIES_WINDOW_UPDATE_IMAGE_FIT_EVENT, payload);
  }

  function emitDimensionsUpdate(updates: NvdFramePropertiesWindowUpdateDimensionsPayload["updates"]) {
    if (!frame) {
      return;
    }

    const payload: NvdFramePropertiesWindowUpdateDimensionsPayload = {
      objectId: frame.id,
      updates,
    };
    void emitTo("main", NVD_FRAME_PROPERTIES_WINDOW_UPDATE_DIMENSIONS_EVENT, payload);
  }

  function handleWindowDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;

    if (targetElement?.closest("button, input, textarea, select, a")) {
      return;
    }

    event.preventDefault();
    void getCurrentWindow().startDragging();
  }

  function applyBackgroundColor(color: string) {
    const normalized = normalizeNvdFrameBackgroundColor(color) ?? DEFAULT_NVD_FRAME_BACKGROUND_COLOR;
    setPickerColor(normalized);
    emitDimensionsUpdate({ backgroundColor: normalized });
  }

  function handleBackgroundStateChange(nextState: "fill" | "none") {
    if (nextState === "none") {
      emitDimensionsUpdate({ backgroundColor: null });
      return;
    }

    applyBackgroundColor(pickerColor);
  }

  function handleStylePickerChange(nextColor: string) {
    applyBackgroundColor(nextColor);
  }

  function handleStylePickerCommit(nextColor: string) {
    applyBackgroundColor(nextColor);
  }

  function handleHsvaChange(nextHsva: NvdFrameColorHsva) {
    handleStylePickerChange(toNvdFrameBackgroundColor(hsvaToRgba(nextHsva)));
  }

  function handleHsvaCommit(nextHsva: NvdFrameColorHsva) {
    handleStylePickerCommit(toNvdFrameBackgroundColor(hsvaToRgba(nextHsva)));
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-app text-ink">
      <section className="flex h-full flex-col border border-line bg-surface">
        <header
          className="flex h-8 shrink-0 select-none items-center border-b px-2"
          style={{ borderBottomColor: "rgb(var(--color-preview))" }}
          onPointerDown={handleWindowDrag}
        >
          <div className="flex min-w-0 flex-1 cursor-grab items-center px-2 active:cursor-grabbing">
            <p className="truncate text-xs font-semibold uppercase text-muted">
              Frame Properties
            </p>
          </div>
          <button
            aria-label="Close frame properties"
            className="frame-properties-close-button shrink-0"
            title="Close frame properties"
            type="button"
            onClick={handleClose}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </header>

        <div className="frame-properties-tab-strip" role="tablist" aria-label="Frame properties sections">
          <div className="frame-properties-tab-row">
            <TabButton
              active={activeTab === "display"}
              label="Display"
              onClick={() => setActiveTab("display")}
            />
            <TabButton
              active={activeTab === "style"}
              label="Style"
              onClick={() => setActiveTab("style")}
            />
            <TabButton
              active={activeTab === "dimensions"}
              label="Dimensions"
              onClick={() => setActiveTab("dimensions")}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {frame ? (
            activeTab === "display" ? (
              <section className="space-y-5">
                <section className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Display</div>
                  <div className="frame-properties-display-grid">
                    <DisplayModeCard
                      active={getFrameDisplayMode(frame) === "text-wrap"}
                      label="Text Wrap"
                      mode="text-wrap"
                      onClick={() => handleDisplayModeChange("text-wrap")}
                    />
                    <DisplayModeCard
                      active={getFrameDisplayMode(frame) === "behind-text"}
                      label="Behind Text"
                      mode="behind-text"
                      onClick={() => handleDisplayModeChange("behind-text")}
                    />
                    <DisplayModeCard
                      active={getFrameDisplayMode(frame) === "in-front-of-text"}
                      label="In Front of Text"
                      mode="in-front-of-text"
                      onClick={() => handleDisplayModeChange("in-front-of-text")}
                    />
                  </div>
                </section>
                <section className="space-y-3 pt-1">
                  <div className="frame-properties-fit-layout">
                    <div className="frame-properties-fit-column">
                      <SelectField
                        label="Fit Image"
                        value={frame.assetFitMode}
                        onChange={(value) =>
                          emitImageFitUpdate({
                            assetFitMode: value as NvdFramePropertiesWindowFrameSnapshot["assetFitMode"],
                          })
                        }
                        options={[
                          { label: "Contain", value: "contain" },
                          { label: "Cover", value: "cover" },
                          { label: "Stretch", value: "stretch" },
                          { label: "Tile", value: "tile" },
                        ]}
                      />
                      <SelectField
                        label="Anchor"
                        value={frame.assetAlignment}
                        onChange={(value) =>
                          emitImageFitUpdate({
                            assetAlignment: value as NvdFramePropertiesWindowFrameSnapshot["assetAlignment"],
                          })
                        }
                        options={[
                          { label: "Center", value: "center" },
                          { label: "Top Left", value: "top-left" },
                        ]}
                      />
                    </div>
                    <div className="frame-properties-fit-column frame-properties-fit-column-controls">
                      <div className="frame-properties-fit-slider-row">
                        <div className="frame-properties-fit-slider-header">
                          <span className="frame-properties-fit-slider-label">Scale</span>
                          <span className="frame-properties-fit-slider-value">
                            {Math.round(frame.assetScale * 100)}%
                          </span>
                        </div>
                        <input
                          className="frame-properties-fit-range"
                          max={4}
                          min={0.25}
                          step={0.05}
                          type="range"
                          value={frame.assetScale}
                          onChange={(event) =>
                            emitImageFitUpdate({ assetScale: Number(event.currentTarget.value) })
                          }
                        />
                      </div>
                      <div className="frame-properties-fit-offset-grid">
                        <NumericField
                          label="Offset X"
                          value={frame.assetOffsetXPx}
                          onCommit={(value) => emitImageFitUpdate({ assetOffsetXPx: value })}
                        />
                        <NumericField
                          label="Offset Y"
                          value={frame.assetOffsetYPx}
                          onCommit={(value) => emitImageFitUpdate({ assetOffsetYPx: value })}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </section>
            ) : activeTab === "style" ? (
              <section className="space-y-[10px]">
                <section className="space-y-2">
                  <div className="frame-properties-style-header-row">
                    <div className="text-[11px] font-semibold uppercase tracking-normal text-muted">Background</div>
                    <div className="frame-properties-style-toggle-row">
                      <StyleModeButton
                        active={!backgroundEnabled}
                        ariaLabel="No background fill"
                        title="None"
                        onClick={() => handleBackgroundStateChange("none")}
                      >
                        <X size={12} aria-hidden="true" />
                      </StyleModeButton>
                      <StyleModeButton
                        active={backgroundEnabled}
                        ariaLabel="Background fill"
                        title="Fill"
                        onClick={() => handleBackgroundStateChange("fill")}
                      >
                        <PaintBucket size={12} aria-hidden="true" />
                      </StyleModeButton>
                    </div>
                  </div>
                </section>

                <section className="frame-properties-color-panel">
                  <div className="frame-properties-color-compact-layout">
                    <SaturationValueField
                      hsva={pickerHsva}
                      onChange={handleHsvaChange}
                      onCommit={handleHsvaCommit}
                    />
                    <div className="frame-properties-color-sidebar">
                      <ColorPreviewChip
                        color={backgroundEnabled ? frame.backgroundColor ?? pickerColor : null}
                      />
                      <div className="frame-properties-color-channel-list">
                        <InlineColorNumberField
                          label="R"
                          max={255}
                          min={0}
                          value={pickerRgba.red}
                          onCommit={(value) =>
                            handleStylePickerCommit(toNvdFrameBackgroundColor({ ...pickerRgba, red: value }))
                          }
                        />
                        <InlineColorNumberField
                          label="G"
                          max={255}
                          min={0}
                          value={pickerRgba.green}
                          onCommit={(value) =>
                            handleStylePickerCommit(toNvdFrameBackgroundColor({ ...pickerRgba, green: value }))
                          }
                        />
                        <InlineColorNumberField
                          label="B"
                          max={255}
                          min={0}
                          value={pickerRgba.blue}
                          onCommit={(value) =>
                            handleStylePickerCommit(toNvdFrameBackgroundColor({ ...pickerRgba, blue: value }))
                          }
                        />
                      </div>
                      <InlineHexField
                        value={pickerColor}
                        onCommit={(value) => handleStylePickerCommit(value)}
                      />
                    </div>
                  </div>

                  <RangeField
                    className="frame-properties-color-hue-range"
                    label="Hue"
                    max={360}
                    min={0}
                    step={1}
                    value={roundFrameColorValue(pickerHsva.hue)}
                    onChange={(value) => handleHsvaChange({ ...pickerHsva, hue: value })}
                    onCommit={(value) => handleHsvaCommit({ ...pickerHsva, hue: value })}
                  />

                  <RangeField
                    className="frame-properties-color-alpha-range"
                    label="Opacity"
                    max={100}
                    min={0}
                    step={1}
                    style={{
                      ["--frame-alpha-end" as never]: nvdFrameColorToCssRgba(
                        toNvdFrameBackgroundColor({ ...pickerRgba, alpha: 1 }),
                      ) as never,
                    }}
                    value={getNvdFrameColorOpacityPercent(pickerColor)}
                    valueSuffix="%"
                    onChange={(value) =>
                      handleHsvaChange({ ...pickerHsva, alpha: clampFrameColorValue(value / 100, 0, 1) })
                    }
                    onCommit={(value) =>
                      handleHsvaCommit({ ...pickerHsva, alpha: clampFrameColorValue(value / 100, 0, 1) })
                    }
                  />
                </section>
              </section>
            ) : (
              <section className="space-y-3">
                <div className="frame-properties-dimensions-grid">
                  <NumericField
                    label="Page"
                    max={pageCount}
                    min={1}
                    step={1}
                    value={frame.pageIndex + 1}
                    onCommit={(value) =>
                      emitDimensionsUpdate({
                        pageIndex: clampNumber(Math.round(value), 1, pageCount) - 1,
                      })
                    }
                  />
                  <NumericField
                    label="Rotation"
                    step={0.5}
                    value={frame.rotationDeg}
                    onCommit={(value) => emitDimensionsUpdate({ rotationDeg: value })}
                  />
                  <NumericField
                    label="Width"
                    min={1}
                    step={1}
                    value={frame.widthPx}
                    onCommit={(value) => emitDimensionsUpdate({ widthPx: Math.max(1, Math.round(value)) })}
                  />
                  <NumericField
                    label="Height"
                    min={1}
                    step={1}
                    value={frame.heightPx}
                    onCommit={(value) => emitDimensionsUpdate({ heightPx: Math.max(1, Math.round(value)) })}
                  />
                  <NumericField
                    label="Padding"
                    min={0}
                    step={1}
                    value={frame.framePaddingPx}
                    onCommit={(value) =>
                      emitDimensionsUpdate({ framePaddingPx: Math.max(0, Math.round(value)) })
                    }
                  />
                  <NumericField
                    disabled={getFrameDisplayMode(frame) !== "text-wrap"}
                    label="Wrap Margin"
                    min={0}
                    step={1}
                    value={frame.wrapPaddingPx}
                    onCommit={(value) =>
                      emitDimensionsUpdate({ wrapPaddingPx: Math.max(0, Math.round(value)) })
                    }
                  />
                </div>
              </section>
            )
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
              Select a frame in {documentTitle ?? "Write"} to edit its properties.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type FrameDisplayMode = "behind-text" | "in-front-of-text" | "text-wrap";

function getFrameDisplayMode(frame: Pick<NvdFramePropertiesWindowFrameSnapshot, "wrapMode" | "zMode">): FrameDisplayMode {
  if (frame.wrapMode === "rectangle" && frame.zMode !== "behind-text") {
    return "text-wrap";
  }

  return frame.zMode === "behind-text" ? "behind-text" : "in-front-of-text";
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`frame-properties-tab ${active ? "is-active" : ""}`}
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
    >
      <svg className="frame-properties-tab-shape" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="frame-properties-tab-path"
          d="M2 27L10 11C12.1 6.7 15.5 4.2 20.2 4.2H79.8C84.5 4.2 87.9 6.7 90 11L98 27"
        />
      </svg>
      <span className="frame-properties-tab-label">{label}</span>
    </button>
  );
}

function DisplayModeCard({
  active,
  label,
  mode,
  onClick,
}: {
  active: boolean;
  label: string;
  mode: FrameDisplayMode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`frame-properties-display-card frame-properties-display-card-${mode} ${active ? "is-active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <span className="frame-properties-display-preview" aria-hidden="true">
        <span className="frame-properties-display-page">
          <span className="frame-properties-display-sheet">
            {mode === "text-wrap" ? <TextWrapPreview /> : <LayerPreview objectInFront={mode === "in-front-of-text"} />}
          </span>
        </span>
      </span>
      <span className="frame-properties-display-label">{label}</span>
    </button>
  );
}

function LayerPreview({
  objectInFront,
}: {
  objectInFront: boolean;
}) {
  return (
    <span className="frame-properties-display-stage">
      {!objectInFront ? <span className="frame-properties-display-object frame-properties-display-object-behind" /> : null}
      <span className="frame-properties-display-line frame-properties-display-line-top" />
      <span className="frame-properties-display-line frame-properties-display-line-mid-a" />
      <span className="frame-properties-display-line frame-properties-display-line-mid-b" />
      <span className="frame-properties-display-line frame-properties-display-line-bottom" />
      {objectInFront ? <span className="frame-properties-display-object" /> : null}
    </span>
  );
}

function TextWrapPreview() {
  return (
    <span className="frame-properties-display-stage">
      <span className="frame-properties-display-line frame-properties-display-line-top" />
      <span className="frame-properties-display-line frame-properties-display-line-mid-a" />
      <span className="frame-properties-display-wrap-row frame-properties-display-wrap-row-wide">
        <span className="frame-properties-display-wrap-segment frame-properties-display-wrap-segment-left" />
        <span className="frame-properties-display-object" />
        <span className="frame-properties-display-wrap-segment frame-properties-display-wrap-segment-right" />
      </span>
      <span className="frame-properties-display-wrap-row">
        <span className="frame-properties-display-wrap-segment frame-properties-display-wrap-segment-left-short" />
        <span className="frame-properties-display-wrap-segment frame-properties-display-wrap-segment-right-long" />
      </span>
      <span className="frame-properties-display-line frame-properties-display-line-bottom" />
    </span>
  );
}

function StyleModeButton({
  active,
  ariaLabel,
  children,
  onClick,
  title,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`frame-properties-style-mode-button ${active ? "is-active" : ""}`}
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SaturationValueField({
  hsva,
  onChange,
  onCommit,
}: {
  hsva: NvdFrameColorHsva;
  onChange: (value: NvdFrameColorHsva) => void;
  onCommit: (value: NvdFrameColorHsva) => void;
}) {
  function updateFromPointer(target: HTMLDivElement, clientX: number, clientY: number, commit = false) {
    const rect = target.getBoundingClientRect();
    const nextValue = {
      ...hsva,
      saturation: clampFrameColorValue((clientX - rect.left) / Math.max(rect.width, 1), 0, 1),
      value: clampFrameColorValue(1 - (clientY - rect.top) / Math.max(rect.height, 1), 0, 1),
    };

    if (commit) {
      onCommit(nextValue);
      return;
    }

    onChange(nextValue);
  }

  return (
    <div
      aria-label="Saturation and brightness"
      className="frame-properties-sv-field"
      role="presentation"
      style={{
        backgroundColor: `hsl(${Math.round(hsva.hue)} 100% 50%)`,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        const target = event.currentTarget;
        updateFromPointer(target, event.clientX, event.clientY);

        const handlePointerMove = (moveEvent: PointerEvent) => {
          updateFromPointer(target, moveEvent.clientX, moveEvent.clientY);
        };
        const handlePointerEnd = (endEvent: PointerEvent) => {
          updateFromPointer(target, endEvent.clientX, endEvent.clientY, true);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerEnd);
          window.removeEventListener("pointercancel", handlePointerCancel);
        };
        const handlePointerCancel = () => {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerEnd);
          window.removeEventListener("pointercancel", handlePointerCancel);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerEnd);
        window.addEventListener("pointercancel", handlePointerCancel);
      }}
    >
      <div className="frame-properties-sv-field-white" />
      <div className="frame-properties-sv-field-black" />
      <span
        className="frame-properties-sv-handle"
        style={{
          left: `${hsva.saturation * 100}%`,
          top: `${(1 - hsva.value) * 100}%`,
        }}
      />
    </div>
  );
}

function RangeField({
  className,
  label,
  max,
  min,
  onChange,
  onCommit,
  step,
  style,
  value,
  valueSuffix = "",
}: {
  className?: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  step: number;
  style?: CSSProperties;
  value: number;
  valueSuffix?: string;
}) {
  return (
    <label className="frame-properties-color-range-row">
      <span className="frame-properties-color-range-header">
        <span className="frame-properties-fit-number-label">{label}</span>
        <span className="frame-properties-fit-slider-value">
          {Math.round(value)}
          {valueSuffix}
        </span>
      </span>
      <span className={`frame-properties-color-range-track ${className ?? ""}`} style={style}>
        <input
          className="frame-properties-color-range-input"
          max={max}
          min={min}
          step={step}
          type="range"
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          onPointerUp={(event) => onCommit(Number(event.currentTarget.value))}
        />
      </span>
    </label>
  );
}

function ColorPreviewChip({
  color,
}: {
  color: string | null;
}) {
  return (
    <div className="frame-properties-color-preview-chip">
      <span className="frame-properties-color-preview-swatch transparent-checkerboard">
        <span
          className="frame-properties-color-preview-fill"
          style={color ? { background: color } : undefined}
        />
      </span>
      <span className="frame-properties-color-preview-copy">
        <span className="frame-properties-fit-number-label">Current</span>
        <span className="frame-properties-color-preview-value">
          {color ? "Fill" : "None"}
        </span>
      </span>
    </div>
  );
}

function InlineColorNumberField({
  label,
  max,
  min,
  onCommit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(() => String(Math.round(value)));

  useEffect(() => {
    setDraftValue(String(Math.round(value)));
  }, [value]);

  function commit(nextValue: string) {
    const parsedValue = Number(nextValue);

    if (!Number.isFinite(parsedValue)) {
      setDraftValue(String(Math.round(value)));
      return;
    }

    onCommit(Math.round(clampNumber(parsedValue, min, max)));
  }

  return (
    <label className="frame-properties-color-inline-field">
      <span className="frame-properties-fit-number-label">{label}</span>
      <input
        className="frame-properties-fit-number-input frame-properties-color-inline-input"
        inputMode="numeric"
        max={max}
        min={min}
        step={1}
        type="number"
        value={draftValue}
        onBlur={(event) => commit(event.currentTarget.value)}
        onChange={(event) => setDraftValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function NumericField({
  disabled = false,
  label,
  max,
  min,
  onCommit,
  step = 1,
  value,
}: {
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(() => formatNumber(value));

  useEffect(() => {
    setDraftValue(formatNumber(value));
  }, [value]);

  function commit(nextValue: string) {
    if (disabled) {
      return;
    }

    const parsedValue = Number(nextValue);
    if (!Number.isFinite(parsedValue)) {
      setDraftValue(formatNumber(value));
      return;
    }

    onCommit(clampNumber(parsedValue, min, max));
  }

  return (
    <label className={`frame-properties-fit-number-field ${disabled ? "is-disabled" : ""}`}>
      <span className="frame-properties-fit-number-label">{label}</span>
      <input
        className="frame-properties-fit-number-input"
        disabled={disabled}
        inputMode="decimal"
        max={max}
        min={min}
        step={step}
        type="number"
        value={draftValue}
        onBlur={(event) => commit(event.currentTarget.value)}
        onChange={(event) => setDraftValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function InlineHexField({
  onCommit,
  value,
}: {
  onCommit: (value: string) => void;
  value: string;
}) {
  const [draftValue, setDraftValue] = useState(() => value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function commit(nextValue: string) {
    const normalized = normalizeNvdFrameBackgroundColor(nextValue);

    if (!normalized) {
      setDraftValue(value);
      return;
    }

    onCommit(normalized);
  }

  return (
    <label className="frame-properties-color-inline-field">
      <span className="frame-properties-fit-number-label">Hex</span>
      <input
        className="frame-properties-fit-number-input frame-properties-color-inline-input frame-properties-color-hex-input"
        autoCapitalize="characters"
        spellCheck={false}
        type="text"
        value={draftValue}
        onBlur={(event) => commit(event.currentTarget.value)}
        onChange={(event) => setDraftValue(event.currentTarget.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="frame-properties-fit-number-field">
      <span className="frame-properties-fit-number-label">{label}</span>
      <select
        className="frame-properties-fit-select"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function clampNumber(value: number, min?: number, max?: number) {
  const clampedMin = min === undefined ? value : Math.max(min, value);
  return max === undefined ? clampedMin : Math.min(max, clampedMin);
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}
