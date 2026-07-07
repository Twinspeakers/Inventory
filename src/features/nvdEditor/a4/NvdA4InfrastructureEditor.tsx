import { useEffect, useRef } from "react";
import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import { NvdInputBridge, type NvdInputBridgeHandle } from "./NvdInputBridge";

export function NvdA4InfrastructureEditor({
  focusBridgeRequestKey,
  onBeforeInput,
  onCompositionEnd,
  onCompositionStart,
  onCompositionUpdate,
  onCopy,
  onCut,
  onKeyDown,
  onPaste,
  selectedText,
}: {
  focusBridgeRequestKey: number;
  onBeforeInput: FormEventHandler<HTMLTextAreaElement>;
  onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionUpdate: CompositionEventHandler<HTMLTextAreaElement>;
  onCopy: ClipboardEventHandler<HTMLTextAreaElement>;
  onCut: ClipboardEventHandler<HTMLTextAreaElement>;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  selectedText: string;
}) {
  const inputBridgeRef = useRef<NvdInputBridgeHandle | null>(null);

  useEffect(() => {
    if (focusBridgeRequestKey <= 0) {
      return;
    }

    inputBridgeRef.current?.focus();
  }, [focusBridgeRequestKey]);

  return (
    <div className="nvd-a4-infrastructure-editor">
      <NvdInputBridge
        onBeforeInput={onBeforeInput}
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCopy={onCopy}
        onCut={onCut}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        ref={inputBridgeRef}
        selectionText={selectedText}
      />
    </div>
  );
}
