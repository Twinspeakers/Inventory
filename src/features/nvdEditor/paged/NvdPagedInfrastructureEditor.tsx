import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import { NvdInputBridge, type NvdInputBridgeHandle } from "./NvdInputBridge";

export type NvdPagedInfrastructureEditorHandle = {
  focusBridge: () => void;
};

type NvdPagedInfrastructureEditorProps = {
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

export const NvdPagedInfrastructureEditor = forwardRef<NvdPagedInfrastructureEditorHandle, NvdPagedInfrastructureEditorProps>(({
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
    <div className="nvd-paged-infrastructure-editor">
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

NvdPagedInfrastructureEditor.displayName = "NvdPagedInfrastructureEditor";
