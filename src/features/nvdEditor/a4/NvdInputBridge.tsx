import {
  type FormEventHandler,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEventHandler,
  type CompositionEventHandler,
  type KeyboardEventHandler,
} from "react";

export type NvdInputBridgeHandle = {
  blur: () => void;
  focus: () => void;
  getElement: () => HTMLTextAreaElement | null;
};

export const NvdInputBridge = forwardRef<NvdInputBridgeHandle, {
  onBeforeInput?: FormEventHandler<HTMLTextAreaElement>;
  onCompositionEnd?: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionStart?: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionUpdate?: CompositionEventHandler<HTMLTextAreaElement>;
  onCopy?: ClipboardEventHandler<HTMLTextAreaElement>;
  onCut?: ClipboardEventHandler<HTMLTextAreaElement>;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  selectionText?: string;
}>(
  (
    {
      onBeforeInput,
      onCompositionEnd,
      onCompositionStart,
      onCompositionUpdate,
      onCopy,
      onCut,
      onKeyDown,
      onPaste,
      selectionText = "",
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      blur: () => textareaRef.current?.blur(),
      focus: () => textareaRef.current?.focus(),
      getElement: () => textareaRef.current,
    }), []);

    useEffect(() => {
      const element = textareaRef.current;

      if (!element) {
        return;
      }

      element.value = selectionText;
      if (selectionText.length > 0 && document.activeElement === element) {
        element.setSelectionRange(0, selectionText.length);
      }
    }, [selectionText]);

    return (
      <textarea
        aria-hidden="true"
        className="nvd-input-bridge"
        onBeforeInput={onBeforeInput}
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCopy={onCopy}
        onCut={onCut}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        ref={textareaRef}
        spellCheck={false}
        tabIndex={-1}
      />
    );
  },
);

NvdInputBridge.displayName = "NvdInputBridge";
