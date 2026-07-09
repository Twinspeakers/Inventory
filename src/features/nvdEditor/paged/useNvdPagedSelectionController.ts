import { useState } from "react";
import {
  createNvdTextDocumentSelection,
  getNvdTextSelectionFromDocumentSelection,
  isNvdTextDocumentSelection,
  type NvdDocumentSelection,
} from "../document/nvdDocumentSelection";
import type { NvdTextSelection } from "../document/nvdRichText";

export function useNvdPagedSelectionController({
  onSelectionChange,
}: {
  onSelectionChange: (selection: NvdDocumentSelection | null) => void;
}) {
  const [activeDocumentSelection, setActiveDocumentSelection] = useState<NvdDocumentSelection | null>(null);
  const [activeTextSelection, setActiveTextSelection] = useState<NvdTextSelection | null>(null);
  const [bridgeFocusRequestKey, setBridgeFocusRequestKey] = useState(0);

  function handleTextSelectionRequest(selection: NvdTextSelection) {
    const nextSelection = createNvdTextDocumentSelection(selection.start, selection.end);
    setActiveDocumentSelection(nextSelection);
    setActiveTextSelection(selection);
    setBridgeFocusRequestKey((value) => value + 1);
    onSelectionChange(nextSelection);
  }

  function handleDocumentSelectionRequest(selection: NvdDocumentSelection) {
    setActiveDocumentSelection(selection);
    setActiveTextSelection(getNvdTextSelectionFromDocumentSelection(selection));
    setBridgeFocusRequestKey((value) => value + 1);
    onSelectionChange(selection);
  }

  return {
    activeDocumentSelection,
    activeTextSelection,
    bridgeFocusRequestKey,
    handleDocumentSelectionRequest,
    handleTextSelectionRequest,
  };
}
