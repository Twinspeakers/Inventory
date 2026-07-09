import { useState } from "react";
import {
  createNvdTextDocumentSelection,
  isNvdTextDocumentSelection,
  type NvdDocumentSelection,
} from "../document/nvdDocumentSelection";
import type { NvdTextSelection } from "../document/nvdRichText";

export function useNvdA4SelectionController({
  onSelectionChange,
}: {
  onSelectionChange: (selection: NvdTextSelection) => void;
}) {
  const [activeDocumentSelection, setActiveDocumentSelection] = useState<NvdDocumentSelection | null>(null);
  const [activeTextSelection, setActiveTextSelection] = useState<NvdTextSelection | null>(null);
  const [bridgeFocusRequestKey, setBridgeFocusRequestKey] = useState(0);

  function handleTextSelectionRequest(selection: NvdTextSelection) {
    setActiveDocumentSelection(createNvdTextDocumentSelection(selection.start, selection.end));
    setActiveTextSelection(selection);
    setBridgeFocusRequestKey((value) => value + 1);
    onSelectionChange(selection);
  }

  function handleDocumentSelectionRequest(selection: NvdDocumentSelection) {
    setActiveDocumentSelection(selection);
    setActiveTextSelection(isNvdTextDocumentSelection(selection) ? selection.text : null);
    setBridgeFocusRequestKey((value) => value + 1);

    if (isNvdTextDocumentSelection(selection)) {
      onSelectionChange(selection.text);
    }
  }

  return {
    activeDocumentSelection,
    activeTextSelection,
    bridgeFocusRequestKey,
    handleDocumentSelectionRequest,
    handleTextSelectionRequest,
  };
}
