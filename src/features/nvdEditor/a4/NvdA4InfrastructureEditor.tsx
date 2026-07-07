import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import { NvdInputBridge, type NvdInputBridgeHandle } from "./NvdInputBridge";

export type NvdA4InfrastructureEditorHandle = {
  focusBridge: () => void;
};

type NvdA4InfrastructureEditorProps = {
  focusBridgeRequestKey: number;
  onBeforeInput: FormEventHandler<HTMLTextAreaElement>;
  onInput: FormEventHandler<HTMLTextAreaElement>;
  onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionUpdate: CompositionEventHandler<HTMLTextAreaElement>;
  onCopy: ClipboardEventHandler<HTMLTextAreaElement>;
  onCut: ClipboardEventHandler<HTMLTextAreaElement>;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  selectedText: string;
};

export const NvdA4InfrastructureEditor = forwardRef<NvdA4InfrastructureEditorHandle, NvdA4InfrastructureEditorProps>(({
  focusBridgeRequestKey,
  onBeforeInput,
  onInput,
  onCompositionEnd,
  onCompositionStart,
  onCompositionUpdate,
  onCopy,
  onCut,
  onKeyDown,
  onPaste,
  selectedText,
}, ref) => {
  const inputBridgeRef = useRef<NvdInputBridgeHandle | null>(null);

  useImperativeHandle(ref, () => ({
    focusBridge: () => {
      inputBridgeRef.current?.focus();
    },
  }), []);

  useEffect(() => {
    inputBridgeRef.current?.focus();
  }, []);

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
        onInput={onInput}
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
});

NvdA4InfrastructureEditor.displayName = "NvdA4InfrastructureEditor";
